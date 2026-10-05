package com.example.musicplayer.data.repository

import android.util.Log
import android.content.Context
import com.example.musicplayer.data.local.CatalogSongDao
import com.example.musicplayer.data.local.CatalogSongEntity
import com.example.musicplayer.data.local.SongDao
import com.example.musicplayer.data.local.SongEntity
import com.example.musicplayer.data.remote.DownloadProgressState
import com.example.musicplayer.data.remote.RemoteResult
import com.example.musicplayer.data.remote.RemoteSong
import com.example.musicplayer.data.remote.RemoteSongRepository
import com.example.musicplayer.playback.analysis.AudioAnalyzer
import com.example.musicplayer.playback.analysis.HarmonyAnalyzer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

/** Stato di download per una singola canzone, usato dalla schermata Catalogo. */
sealed class DownloadState {
    object NotDownloaded : DownloadState()
    data class Downloading(val percent: Int) : DownloadState()
    object Downloaded : DownloadState()
    data class Error(val message: String) : DownloadState()
}

/** Rappresenta il risultato dell'osservazione del catalogo online. */
sealed class CatalogState {
    object Loading : CatalogState()
    data class Success(val songs: List<RemoteSong>) : CatalogState()
    data class Error(val message: String) : CatalogState()
}

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class SongRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val remoteRepository: RemoteSongRepository,
    private val songDao: SongDao,
    private val catalogSongDao: CatalogSongDao,
    private val userRepository: UserRepository
) {

    // Scope per la sincronizzazione del catalogo (background)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Job per la sync attuale (ci permette di cancellare e riavviare per utenti diversi)
    private var catalogSyncJob: Job? = null

    // Stato di download in-memory per ogni songId, osservato dalla UI del catalogo.
    private val _downloadStates = MutableStateFlow<Map<String, DownloadState>>(emptyMap())
    val downloadStates = _downloadStates.asStateFlow()

    // Utente attualmente selezionato per il catalogo (null = nessun utente, cache vuota)
    private val _catalogUser = MutableStateFlow<String?>(null)

    init {
        // Avvia la sincronizzazione automatica del catalogo in cache
        // Inizialmente senza utente: nessun dato viene caricato
        startCatalogSyncForCurrentUser()
    }

    // ========== Gestione utente catalogo ==========

    /**
     * Imposta l'utente per cui filtrare il catalogo.
     * Quando viene cambiato utente, la cache locale viene ricaricata da Firestore
     * con il nuovo filtro e [observeCachedCatalog] emettera' i nuovi dati.
     * Passare null per svuotare il catalogo (es. dopo logout).
     */
    fun setCatalogUser(userName: String?) {
        Log.d("MusicAppDebug", "SongRepository: setCatalogUser=$userName")
        _catalogUser.value = userName
    }

    // ========== Catalogo offline (cache locale Room) ==========

    /**
     * Osserva il catalogo dalla cache locale Room (0 letture Firestore).
     * Il flusso si adatta automaticamente all'utente corrente:
     * - Se _catalogUser e' null o blank → emette lista vuota (nessuna canzone visibile)
     * - Se _catalogUser ha un valore → filtra per quel userName
     */
    fun observeCachedCatalog(): Flow<List<RemoteSong>> =
        _catalogUser.flatMapLatest { userName ->
            if (userName.isNullOrBlank()) {
                // Nessun utente loggato → nessuna canzone visibile
                kotlinx.coroutines.flow.flowOf(emptyList())
            } else {
                catalogSongDao.observeByUser(userName).map { entities ->
                    entities.map { it.toRemoteSong() }
                }
            }
        }

    /**
     * Cerca nel catalogo locale per titolo/artista (0 letture Firestore).
     * Anche qui il filtro per utente e' automatico.
     */
    fun searchCachedCatalog(query: String): Flow<List<RemoteSong>> =
        _catalogUser.flatMapLatest { userName ->
            if (userName.isNullOrBlank()) {
                kotlinx.coroutines.flow.flowOf(emptyList())
            } else {
                catalogSongDao.searchByUser(query, userName).map { entities ->
                    entities.map { it.toRemoteSong() }
                }
            }
        }

    // ========== Sincronizzazione catalogo da Firestore (one-shot) ==========

    /**
     * Osserva i cambiamenti di _catalogUser e quando viene impostato un utente
     * esegue un fetch one-shot da Firestore per evitare connessioni persistenti
     * che consumano batteria.
     * Se _catalogUser e' null/blank svuota la cache locale.
     */
    private fun startCatalogSyncForCurrentUser() {
        scope.launch {
            _catalogUser.collect { userName ->
                catalogSyncJob?.cancel()

                if (userName.isNullOrBlank()) {
                    Log.d("MusicAppDebug", "SongRepository: no user, clearing catalog cache")
                    catalogSongDao.deleteAll()
                    return@collect
                }

                // Esegue un fetch one-shot invece di un listener persistente
                catalogSyncJob = scope.launch {
                    Log.d("MusicAppDebug", "SongRepository: one-shot fetch for user=$userName")
                    val result = remoteRepository.fetchSongsOnce(userName)
                    when (result) {
                        is RemoteResult.Success -> {
                            val songs = result.data
                            if (songs.isNotEmpty()) {
                                catalogSongDao.deleteByUser(userName)
                                val entities = songs.map { it.toCatalogSongEntity() }
                                catalogSongDao.insertAll(entities)
                                Log.d("MusicAppDebug", "Catalog cache synced for user=$userName: ${entities.size} songs")
                            } else {
                                // Nessuna canzone per questo utente: evita operazioni Room inutili
                                Log.d("MusicAppDebug", "No songs for user=$userName, skipping Room operations")
                                // Assicura che la cache sia pulita per questo utente (DELETE senza INSERT)
                                catalogSongDao.deleteByUser(userName)
                            }
                        }
                        is RemoteResult.Error -> {
                            Log.w("MusicAppDebug", "Catalog sync failed for user=$userName: ${result.throwable.message}")
                        }
                    }
                }
            }
        }
    }

    /** Sincronizzazione one-shot del catalogo (per refresh manuale) per l'utente corrente. */
    suspend fun refreshCatalogCache() {
        val userName = _catalogUser.value
        if (userName.isNullOrBlank()) return

        Log.d("MusicAppDebug", "SongRepository: refreshing catalog cache for user=$userName")
        val result = remoteRepository.fetchSongsOnce(userName)
        when (result) {
            is RemoteResult.Success -> {
                val songs = result.data
                if (songs.isNotEmpty()) {
                    catalogSongDao.deleteByUser(userName)
                    val entities = songs.map { it.toCatalogSongEntity() }
                    catalogSongDao.insertAll(entities)
                    Log.d("MusicAppDebug", "Catalog cache refreshed for user=$userName: ${entities.size} songs")
                } else {
                    Log.d("MusicAppDebug", "No songs for user=$userName on refresh, skipping Room operations")
                    catalogSongDao.deleteByUser(userName)
                }
            }
            is RemoteResult.Error -> {
                Log.w("MusicAppDebug", "Catalog cache refresh failed for user=$userName: ${result.throwable.message}")
            }
        }
    }

    // ========== Mapper ==========

    private fun RemoteSong.toCatalogSongEntity() = CatalogSongEntity(
        id = id,
        title = title,
        artist = artist,
        durationMs = duration,
        coverUrl = coverUrl,
        storagePath = storagePath,
        fileSizeBytes = fileSizeBytes,
        userName = userName
    )

    private fun CatalogSongEntity.toRemoteSong() = RemoteSong(
        id = id,
        title = title,
        artist = artist,
        duration = durationMs,
        coverUrl = coverUrl,
        storagePath = storagePath,
        fileSizeBytes = fileSizeBytes,
        userName = userName
    )

    // ========== Catalogo online (remote) - DEPRECATED: use cached catalog instead ==========

    /** @deprecated Use [observeCachedCatalog] or [searchCachedCatalog] instead. */
    fun observeCatalog(): Flow<CatalogState> = kotlinx.coroutines.flow.channelFlow {
        remoteRepository.observeSongs()
            .catch { e -> send(CatalogState.Error(e.message ?: "Errore sconosciuto")) }
            .collect { result ->
                when (result) {
                    is RemoteResult.Success -> send(CatalogState.Success(result.data))
                    is RemoteResult.Error -> send(CatalogState.Error(result.throwable.message ?: "Errore di rete"))
                }
            }
    }

    // ---------- Libreria locale (Room, 100% offline) ----------

    fun observeLocalLibrary(): Flow<List<SongEntity>> = songDao.observeAll()

    fun observeDownloadedIds(): Flow<List<String>> = songDao.observeDownloadedIds()

    suspend fun getLocalSong(id: String): SongEntity? = songDao.getById(id)

    /**
     * Cambia titolo e artista di un brano solo nella libreria del telefono.
     * Firestore e il catalogo in cache non vengono toccati: il brano resta riconosciuto
     * come scaricato perché il confronto avviene sull'id.
     */
    suspend fun updateLocalSongInfo(id: String, title: String, artist: String) {
        songDao.updateTitleAndArtist(id, title, artist)
    }

    // ---------- Download ----------

    private fun audioFile(songId: String): File =
        File(File(context.filesDir, "songs"), "$songId.mp3")

    private fun coverFile(songId: String): File =
        File(File(context.filesDir, "covers"), "$songId.jpg")

    companion object {
        /** Frequenza massima di aggiornamento del progresso download (in ms). */
        private const val PROGRESS_THROTTLE_MS = 500L
    }

    /**
     * Downloads a song (audio + optional cover), saves to Room.
     * @return true if download was successful, false otherwise.
     */
    suspend fun downloadSong(song: RemoteSong): Boolean {
        val songId = song.id
        Log.d("MusicAppDebug", "SongRepository: Starting download for ${song.title} (ID: $songId)")
        updateState(songId, DownloadState.Downloading(0))

        val audioDest = audioFile(songId)
        val coverDest = coverFile(songId)
        Log.d("MusicAppDebug", "SongRepository: Audio dest: ${audioDest.absolutePath}")

        return try {
            // 1. Scarica il file audio, propagando il progresso alla UI (throttled)
            Log.d("MusicAppDebug", "SongRepository: Downloading audio from ${song.storagePath}")
            var lastProgressUpdateTime = 0L
            var downloadCompleted = false
            remoteRepository.downloadFile(song.storagePath, audioDest).collect { state ->
                when (state) {
                    is DownloadProgressState.InProgress -> {
                        val now = System.currentTimeMillis()
                        if (now - lastProgressUpdateTime >= PROGRESS_THROTTLE_MS) {
                            Log.d("MusicAppDebug", "SongRepository: Audio progress for $songId: ${state.percent}%")
                            updateState(songId, DownloadState.Downloading(state.percent))
                            lastProgressUpdateTime = now
                        }
                    }
                    is DownloadProgressState.Success -> {
                        Log.d("MusicAppDebug", "SongRepository: Audio download success for $songId")
                        updateState(songId, DownloadState.Downloading(100))
                        downloadCompleted = true
                    }
                    is DownloadProgressState.Failure -> {
                        Log.e("MusicAppDebug", "SongRepository: Audio download failure for $songId", state.throwable)
                        throw state.throwable
                    }
                }
            }

            if (!downloadCompleted) {
                Log.e("MusicAppDebug", "SongRepository: Download did not complete for $songId")
                throw Exception("Download did not complete")
            }

            // 2. Scarica la copertina dall'URL HTTP (se presente)
            var coverPathResult: String? = null
            if (song.coverUrl.isNotBlank()) {
                Log.d("MusicAppDebug", "SongRepository: Downloading cover from URL ${song.coverUrl}")
                try {
                    coverDest.parentFile?.mkdirs()
                    val url = URL(song.coverUrl)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.connectTimeout = 10_000
                    connection.readTimeout = 10_000
                    connection.doInput = true
                    connection.connect()
                    if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                        connection.inputStream.use { input ->
                            FileOutputStream(coverDest).use { output ->
                                input.copyTo(output, bufferSize = 8192)
                            }
                        }
                        coverPathResult = coverDest.absolutePath
                        Log.d("MusicAppDebug", "SongRepository: Cover download success for $songId")
                    } else {
                        Log.w("MusicAppDebug", "SongRepository: Cover HTTP ${connection.responseCode} for $songId")
                    }
                    connection.disconnect()
                } catch (t: Throwable) {
                    Log.w("MusicAppDebug", "SongRepository: Cover download failed for $songId (non-fatal)", t)
                    if (coverDest.exists()) coverDest.delete()
                    coverPathResult = null
                }
            }

            // 3. Salva riga in Room
            Log.d("MusicAppDebug", "SongRepository: Saving to Room for $songId")
            songDao.insert(
                SongEntity(
                    id = songId,
                    title = song.title,
                    artist = song.artist,
                    durationMs = song.duration,
                    localAudioPath = audioDest.absolutePath,
                    localCoverPath = coverPathResult,
                    fileSizeBytes = song.fileSizeBytes,
                    downloadedAt = System.currentTimeMillis(),
                    coverUrl = song.coverUrl
                )
            )
            Log.d("MusicAppDebug", "SongRepository: Saved to Room successfully for $songId")

            updateState(songId, DownloadState.Downloaded)

            // Incrementa il contatore download su Firestore
            userRepository.incrementDownloadCount()

            true
        } catch (t: Throwable) {
            Log.e("MusicAppDebug", "SongRepository: Error downloading song $songId", t)
            if (audioDest.exists()) audioDest.delete()
            if (coverDest.exists()) coverDest.delete()
            updateState(songId, DownloadState.Error(t.message ?: "Download fallito"))
            false
        }
    }

    suspend fun deleteDownloadedSong(entity: SongEntity) {
        File(entity.localAudioPath).let { if (it.exists()) it.delete() }
        entity.localCoverPath?.let { path -> File(path).let { if (it.exists()) it.delete() } }
        AudioAnalyzer.cacheFile(context, entity.id).let { if (it.exists()) it.delete() }
        HarmonyAnalyzer.cacheFile(context, entity.id).let { if (it.exists()) it.delete() }
        songDao.delete(entity)
        updateState(entity.id, DownloadState.NotDownloaded)
    }

    /** Da chiamare all'avvio per inizializzare gli stati di download del catalogo dai dati Room esistenti. */
    suspend fun syncDownloadStatesFromLocal() {
        // one-shot: leggiamo lo stato corrente tramite getById nel chiamante se serve;
        // qui aggiorniamo la mappa in base agli id già presenti in Room.
    }

    private fun updateState(songId: String, state: DownloadState) {
        _downloadStates.value = _downloadStates.value.toMutableMap().apply { put(songId, state) }
    }

    fun markKnownDownloaded(ids: List<String>) {
        val current = _downloadStates.value.toMutableMap()
        ids.forEach { id ->
            if (current[id] !is DownloadState.Downloading) {
                current[id] = DownloadState.Downloaded
            }
        }
        _downloadStates.value = current
    }
}