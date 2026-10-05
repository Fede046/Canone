package com.example.musicplayer.playback.controller

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.example.musicplayer.playback.PlaybackService
import com.google.common.util.concurrent.MoreExecutors
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

data class PlaybackUiState(
    val currentSongId: String? = null,
    val title: String = "",
    val artist: String = "",
    val coverPath: String? = null,
    val coverUrl: String? = null,
    val isPlaying: Boolean = false,
    val shuffleModeEnabled: Boolean = false,
    val repeatMode: Int = Player.REPEAT_MODE_OFF,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val sleepTimerRemainingMs: Long = 0L // 0 = nessun timer attivo
)

/**
 * Wrapper attorno a MediaController per comunicare in modo semplice
 * dalla UI (ViewModel) verso il PlaybackService (MediaSessionService).
 */
@Singleton
class PlayerController @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var controller: MediaController? = null

    private val _uiState = MutableStateFlow(PlaybackUiState())
    val uiState = _uiState.asStateFlow()

    /** Scope per operazioni asincrone (es. scaricare copertine da URL remoto). */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val listener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _uiState.value = _uiState.value.copy(isPlaying = isPlaying)
        }

        override fun onShuffleModeEnabledChanged(shuffleModeEnabled: Boolean) {
            _uiState.value = _uiState.value.copy(shuffleModeEnabled = shuffleModeEnabled)
        }

        override fun onRepeatModeChanged(repeatMode: Int) {
            _uiState.value = _uiState.value.copy(repeatMode = repeatMode)
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_READY) {
                _uiState.value = _uiState.value.copy(
                    durationMs = controller?.duration?.coerceAtLeast(0) ?: 0L
                )
            }
        }

        override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
            _uiState.value = _uiState.value.copy(
                title = mediaMetadata.title?.toString() ?: "",
                artist = mediaMetadata.artist?.toString() ?: "",
                coverPath = mediaMetadata.extras?.getString("local_cover_path"),
                coverUrl = mediaMetadata.extras?.getString("remote_cover_url")
            )
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            _uiState.value = _uiState.value.copy(
                currentSongId = mediaItem?.mediaId,
                durationMs = controller?.duration?.coerceAtLeast(0) ?: 0L
            )
        }

        override fun onPositionDiscontinuity(
            oldPosition: Player.PositionInfo,
            newPosition: Player.PositionInfo,
            reason: Int
        ) {
            _uiState.value = _uiState.value.copy(
                positionMs = newPosition.positionMs
            )
        }
    }

    fun connect(onConnected: () -> Unit = {}) {
        if (controller != null) {
            onConnected()
            return
        }
        val sessionToken = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, sessionToken).buildAsync()
        future.addListener({
            controller = future.get()
            controller?.addListener(listener)
            _uiState.value = _uiState.value.copy(
                shuffleModeEnabled = controller?.shuffleModeEnabled ?: false,
                repeatMode = controller?.repeatMode ?: Player.REPEAT_MODE_OFF
            )
            onConnected()
        }, MoreExecutors.directExecutor())
    }

    fun playSong(songId: String, title: String, artist: String, localAudioPath: String, coverPath: String?, coverUrl: String? = null) {
        val artworkData = resolveArtworkBytes(coverPath)
        val mediaItem = createMediaItem(songId, title, artist, localAudioPath, artworkData, coverPath, coverUrl)

        controller?.apply {
            setMediaItem(mediaItem)
            prepare()
            play()
        }
        _uiState.value = _uiState.value.copy(
            currentSongId = songId,
            title = title,
            artist = artist,
            coverPath = coverPath,
            coverUrl = coverUrl
        )

        // Se l'artwork locale non era disponibile ma c'è un URL remoto,
        // scarichiamo l'immagine in background e aggiorniamo il MediaItem
        if (artworkData == null && coverUrl != null && coverUrl.isNotBlank()) {
            scope.launch {
                val remoteBytes = withContext(Dispatchers.IO) {
                    downloadImageBytes(coverUrl)
                }
                if (remoteBytes != null) {
                    val updatedItem = createMediaItem(songId, title, artist, localAudioPath, remoteBytes, coverPath, coverUrl)
                    controller?.apply {
                        setMediaItem(updatedItem)
                        prepare()
                        play()
                    }
                }
            }
        }
    }

    /**
     * Risolve i byte dell'artwork: prima controlla il file locale,
     * poi scarica dall'URL remoto (bloccante, va chiamato su thread separato).
     */
    private fun resolveArtworkBytes(coverPath: String?): ByteArray? {
        // 1. Prova il file locale
        if (coverPath != null) {
            try {
                val file = File(coverPath)
                if (file.exists()) {
                    return FileInputStream(file).use { inputStream ->
                        inputStream.readBytes()
                    }
                }
            } catch (e: Exception) {
                // ignora, prova l'URL
            }
        }
        return null
    }

    /**
     * Scarica i byte di un'immagine da un URL remoto.
     * Da chiamare su un thread background (es. via coroutine su Dispatchers.IO).
     */
    private fun downloadImageBytes(imageUrl: String): ByteArray? {
        return try {
            val url = URL(imageUrl)
            val connection = url.openConnection()
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            val inputStream = connection.getInputStream()
            val outputStream = ByteArrayOutputStream()
            val buffer = ByteArray(4096)
            var bytesRead: Int
            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                outputStream.write(buffer, 0, bytesRead)
            }
            inputStream.close()
            outputStream.toByteArray()
        } catch (e: Exception) {
            null
        }
    }

    private fun createMediaItem(
        id: String,
        title: String,
        artist: String,
        path: String,
        artworkData: ByteArray? = null,
        coverPath: String?,
        coverUrl: String? = null
    ): MediaItem {
        val extras = android.os.Bundle().apply {
            putString("local_cover_path", coverPath)
            putString("remote_cover_url", coverUrl)
        }

        val artworkUri = when {
            coverPath != null && File(coverPath).exists() -> Uri.fromFile(File(coverPath))
            !coverUrl.isNullOrBlank() -> Uri.parse(coverUrl)
            else -> null
        }

        return MediaItem.Builder()
            .setMediaId(id)
            .setUri(path)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(title)
                    .setArtist(artist)
                    .apply {
                        if (artworkData != null) {
                            setArtworkData(artworkData, MediaMetadata.PICTURE_TYPE_FRONT_COVER)
                        }
                        if (artworkUri != null) {
                            setArtworkUri(artworkUri)
                        }
                    }
                    .setExtras(extras)
                    .build()
            )
            .build()
    }

    fun playQueue(songs: List<com.example.musicplayer.data.local.SongEntity>, startIndex: Int) {
        // Creiamo i MediaItem impostando metadati e URI dell'artwork in modo leggero, senza lettura sincrona dei file
        val mediaItems = songs.map { song ->
            createMediaItem(
                id = song.id,
                title = song.title,
                artist = song.artist,
                path = song.localAudioPath,
                coverPath = song.localCoverPath,
                coverUrl = song.coverUrl
            )
        }

        controller?.apply {
            setMediaItems(mediaItems, startIndex, 0L)
            prepare()
            play()
        }
    }

    /**
     * Aggiorna titolo e artista di un brano già presente nella coda, ad esempio dopo una
     * modifica nella Libreria. L'URI non cambia, quindi la riproduzione non si interrompe.
     */
    fun updateQueuedSongInfo(songId: String, title: String, artist: String) {
        val ctrl = controller ?: return
        for (index in 0 until ctrl.mediaItemCount) {
            val item = ctrl.getMediaItemAt(index)
            if (item.mediaId != songId) continue
            val updatedItem = item.buildUpon()
                .setMediaMetadata(
                    item.mediaMetadata.buildUpon()
                        .setTitle(title)
                        .setArtist(artist)
                        .build()
                )
                .build()
            ctrl.replaceMediaItem(index, updatedItem)
        }
    }

    fun togglePlayPause() {
        controller?.let {
            if (it.isPlaying) it.pause() else it.play()
        }
    }

    fun skipToNext() {
        controller?.let {
            // hasNextMediaItem segue l'ordine di riproduzione effettivo (anche casuale);
            // l'indice di currentMediaItemIndex invece è quello della lista originale.
            if (it.hasNextMediaItem()) {
                it.seekToNextMediaItem()
            } else if (it.mediaItemCount > 0) {
                // Fine della coda: si riparte dal primo brano dell'ordine attuale (casuale o no)
                val firstIndex = it.currentTimeline.getFirstWindowIndex(it.shuffleModeEnabled)
                it.seekToDefaultPosition(firstIndex)
                it.play()
            }
        }
    }

    fun skipToPrevious() {
        controller?.seekToPrevious()
    }

    fun toggleShuffle() {
        controller?.let {
            it.shuffleModeEnabled = !it.shuffleModeEnabled
        }
    }

    /** Cicla la modalità repeat: OFF -> ONE -> ALL -> OFF */
    fun toggleRepeatMode() {
        controller?.let {
            when (it.repeatMode) {
                Player.REPEAT_MODE_OFF -> it.repeatMode = Player.REPEAT_MODE_ONE
                Player.REPEAT_MODE_ONE -> it.repeatMode = Player.REPEAT_MODE_ALL
                Player.REPEAT_MODE_ALL -> it.repeatMode = Player.REPEAT_MODE_OFF
            }
        }
    }

    /** Imposta direttamente la modalità repeat */
    fun setRepeatMode(repeatMode: Int) {
        controller?.let {
            it.repeatMode = repeatMode
        }
    }

    fun currentPosition(): Long {
        return controller?.currentPosition ?: 0L
    }

    fun seekTo(positionMs: Long) {
        controller?.seekTo(positionMs)
    }

    fun setSleepTimer(durationMs: Long) {
        _uiState.value = _uiState.value.copy(sleepTimerRemainingMs = durationMs)
    }

    fun clearSleepTimer() {
        _uiState.value = _uiState.value.copy(sleepTimerRemainingMs = 0L)
    }

    fun pausePlayback() {
        controller?.pause()
    }

    fun release() {
        controller?.removeListener(listener)
        controller?.release()
        controller = null
    }
}