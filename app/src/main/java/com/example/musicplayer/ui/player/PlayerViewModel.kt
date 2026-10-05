package com.example.musicplayer.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.local.PlaylistDao
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.data.local.PlaylistSongCrossRef
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.playback.controller.PlayerController
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val playback: PlaybackUiState = PlaybackUiState(),
    val currentPositionMs: Long = 0L
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val playerController: PlayerController,
    private val playlistDao: PlaylistDao
) : ViewModel() {

    val uiState: StateFlow<PlaybackUiState> = playerController.uiState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), PlaybackUiState())

    /**
     * Playlist esistenti per la finestra di dialogo "aggiungi a playlist".
     * null finché Room non ha emesso il primo elenco.
     */
    val playlists: StateFlow<List<PlaylistEntity>?> = playlistDao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private var sleepTimerJob: Job? = null

    init {
        playerController.connect()
    }

    /** Restituisce la posizione corrente del player. */
    fun currentPosition(): Long = playerController.currentPosition()

    fun togglePlayPause() = playerController.togglePlayPause()

    fun skipToNext() = playerController.skipToNext()

    fun skipToPrevious() = playerController.skipToPrevious()

    fun toggleShuffle() = playerController.toggleShuffle()

    fun toggleRepeatMode() = playerController.toggleRepeatMode()

    fun seekTo(positionMs: Long) = playerController.seekTo(positionMs)

    /** Aggiunge la canzone corrente alla playlist specificata. */
    fun addCurrentSongToPlaylist(playlistId: Long) {
        val currentSongId = uiState.value.currentSongId ?: return
        viewModelScope.launch {
            playlistDao.addSongToPlaylist(PlaylistSongCrossRef(playlistId, currentSongId))
        }
    }

    /** Crea una nuova playlist con il nome specificato. */
    fun createPlaylist(name: String) {
        viewModelScope.launch {
            playlistDao.insert(PlaylistEntity(name = name))
        }
    }

    // ---------- Sleep Timer ----------

    /** Avvia lo sleep timer per la durata specificata. Quando scade, mette in pausa. */
    fun setSleepTimer(durationMs: Long) {
        // Annulla un eventuale timer precedente
        sleepTimerJob?.cancel()
        playerController.setSleepTimer(durationMs)

        sleepTimerJob = viewModelScope.launch {
            var remaining = durationMs
            while (remaining > 0) {
                delay(1000L)
                remaining -= 1000L
                playerController.setSleepTimer(remaining)
                if (remaining <= 0) {
                    playerController.pausePlayback()
                    playerController.clearSleepTimer()
                }
            }
        }
    }

    /** Annulla lo sleep timer. */
    fun cancelSleepTimer() {
        sleepTimerJob?.cancel()
        sleepTimerJob = null
        playerController.clearSleepTimer()
    }

    /** Reimposta lo sleep timer al valore predefinito (30 minuti). */
    fun resetSleepTimer() {
        cancelSleepTimer()
        setSleepTimer(30 * 60 * 1000L) // 30 minuti
    }

    override fun onCleared() {
        super.onCleared()
        sleepTimerJob?.cancel()
        // Non rilasciamo il controller qui: il player deve continuare in background.
    }
}