package com.example.musicplayer.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.local.PlaylistDao
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.data.local.PlaylistSongCrossRef
import com.example.musicplayer.data.local.SongEntity
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.playback.controller.PlayerController
import com.example.musicplayer.ui.components.ArtistFilterOption
import com.example.musicplayer.ui.components.buildArtistOptions
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryUiState(
    val isLoading: Boolean = true,
    val songs: List<SongEntity> = emptyList(),
    val searchQuery: String = "",
    val playingSongId: String? = null,
    /** Artisti presenti nella libreria, così come sono scritti sul telefono. */
    val artists: List<ArtistFilterOption> = emptyList(),
    /** Artista scelto nel filtro; null = tutti i brani. */
    val selectedArtist: String? = null,
    /** Numero totale di brani scaricati, senza filtri. */
    val totalSongCount: Int = 0
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repository: SongRepository,
    private val playerController: PlayerController,
    private val playlistDao: PlaylistDao
) : ViewModel() {

    /** Playlist per il menu "Aggiungi a playlist"; null finché Room non ha emesso il primo elenco. */
    val playlists: StateFlow<List<PlaylistEntity>?> = playlistDao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _searchQuery = MutableStateFlow("")
    private val _selectedArtist = MutableStateFlow<String?>(null)

    // Della riproduzione serve solo l'id del brano corrente: così posizione, play/pausa e
    // sleep timer (che aggiorna lo stato ogni secondo) non ricalcolano l'elenco.
    private val playingSongId = playerController.uiState
        .map { it.currentSongId }
        .distinctUntilChanged()

    val uiState: StateFlow<LibraryUiState> = combine(
        repository.observeLocalLibrary(),
        _searchQuery,
        _selectedArtist,
        playingSongId
    ) { songs, query, selectedArtist, currentSongId ->
        val artists = buildArtistOptions(songs.map { it.artist })
        // Se l'artista scelto non ha più brani (modificato o eliminato) il filtro decade
        val activeArtist = selectedArtist?.takeIf { name -> artists.any { it.name == name } }
        val byArtist = if (activeArtist == null) songs
        else songs.filter { it.artist == activeArtist }
        // La ricerca si applica sopra al filtro per artista
        val filtered = if (query.isBlank()) byArtist
        else byArtist.filter {
            it.title.contains(query, ignoreCase = true) ||
                    it.artist.contains(query, ignoreCase = true)
        }
        LibraryUiState(
            isLoading = false,
            songs = filtered,
            searchQuery = query,
            playingSongId = currentSongId,
            artists = artists,
            selectedArtist = activeArtist,
            totalSongCount = songs.size
        )
    }.stateIn(
        viewModelScope,
        // 5 s di margine: tornando sulla Libreria entro questo tempo la query Room non riparte
        // e l'elenco non passa dallo stato di caricamento.
        SharingStarted.WhileSubscribed(5000),
        LibraryUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    /** Mostra solo i brani dell'artista indicato; null torna a tutti i brani. */
    fun setSelectedArtist(artist: String?) {
        _selectedArtist.value = artist
    }

    /** Avvia il brano usando come coda l'elenco visibile (filtrato da artista e ricerca). */
    fun playSong(song: SongEntity) {
        val songs = uiState.value.songs
        val index = songs.indexOf(song).coerceAtLeast(0)
        playerController.connect {
            playerController.playQueue(songs, index)
        }
    }

    /**
     * Salva titolo e artista modificati di un singolo brano, solo sul telefono.
     * Valori vuoti dopo il trim vengono ignorati (il dialogo non li permette).
     */
    fun updateSongInfo(song: SongEntity, title: String, artist: String) {
        val newTitle = title.trim()
        val newArtist = artist.trim()
        if (newTitle.isEmpty() || newArtist.isEmpty()) return
        if (newTitle == song.title && newArtist == song.artist) return
        viewModelScope.launch {
            repository.updateLocalSongInfo(song.id, newTitle, newArtist)
            // Se il brano è in coda, mini player e player espanso mostrano subito i nuovi valori
            playerController.updateQueuedSongInfo(song.id, newTitle, newArtist)
        }
    }

    /** Id delle playlist che contengono già il brano. */
    fun observePlaylistIdsForSong(songId: String): Flow<List<Long>> =
        playlistDao.observePlaylistIdsForSong(songId)

    fun addSongToPlaylist(playlistId: Long, songId: String) {
        viewModelScope.launch {
            playlistDao.addSongToPlaylist(PlaylistSongCrossRef(playlistId, songId))
        }
    }

    /** Crea una playlist e ci aggiunge subito il brano. */
    fun createPlaylistWithSong(name: String, color: Long, songId: String) {
        viewModelScope.launch {
            val playlistId = playlistDao.insert(PlaylistEntity(name = name, color = color))
            playlistDao.addSongToPlaylist(PlaylistSongCrossRef(playlistId, songId))
        }
    }

    fun deleteSong(song: SongEntity) {
        viewModelScope.launch {
            repository.deleteDownloadedSong(song)
        }
    }
}