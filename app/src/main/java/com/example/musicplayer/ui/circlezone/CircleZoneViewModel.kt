package com.example.musicplayer.ui.circlezone

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.playback.analysis.HarmonyAnalyzer
import com.example.musicplayer.playback.analysis.HarmonyResult
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.playback.controller.PlayerController
import com.example.musicplayer.ui.zone.ScreenOnSetting
import com.example.musicplayer.ui.zone.Zone
import com.example.musicplayer.ui.zone.ZoneMode
import com.example.musicplayer.ui.zone.ZoneSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Stato dell'analisi armonica del brano corrente. */
sealed interface HarmonyState {
    /** Nessun brano in riproduzione. */
    data object NoSong : HarmonyState

    /** Analisi in corso (la prima volta per ogni brano): [progress] fra 0 e 1. */
    data class Listening(val progress: Float) : HarmonyState

    data class Ready(val result: HarmonyResult) : HarmonyState

    /** Il file non si può analizzare. */
    data object Unavailable : HarmonyState
}

/**
 * Dati della Circle Zone per il brano corrente. Il ViewModel vive solo mentre la schermata è
 * aperta (ma sopravvive alla rotazione): l'analisi parte solo lì, e se si cambia brano o si esce
 * viene annullata. Il risultato non resta in memoria dopo l'uscita: rileggerlo dalla cache costa poco.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class CircleZoneViewModel @Inject constructor(
    private val playerController: PlayerController,
    private val songRepository: SongRepository,
    private val harmonyAnalyzer: HarmonyAnalyzer,
    private val zoneMode: ZoneMode,
    zoneSettings: ZoneSettings
) : ViewModel() {

    val playback: StateFlow<PlaybackUiState> = playerController.uiState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), playerController.uiState.value)

    private val _harmony = MutableStateFlow<HarmonyState>(HarmonyState.NoSong)
    val harmony: StateFlow<HarmonyState> = _harmony.asStateFlow()

    val isLandscape: StateFlow<Boolean> = zoneMode.isLandscape(Zone.CIRCLE)

    /** Quanto resta acceso lo schermo (impostazione comune alle Zone). */
    val screenOn: StateFlow<ScreenOnSetting> = zoneSettings.screenOn

    init {
        playerController.connect()
        viewModelScope.launch {
            playerController.uiState
                .distinctUntilChangedBy { it.currentSongId }
                .collectLatest { state ->
                    val songId = state.currentSongId
                    if (songId == null) {
                        _harmony.value = HarmonyState.NoSong
                        return@collectLatest
                    }
                    _harmony.value = HarmonyState.Listening(0f)
                    val song = songRepository.getLocalSong(songId)
                    if (song == null) {
                        _harmony.value = HarmonyState.Unavailable
                        return@collectLatest
                    }
                    val result = harmonyAnalyzer.analyze(song.id, song.localAudioPath) { progress ->
                        _harmony.value = HarmonyState.Listening(progress)
                    }
                    _harmony.value = if (result != null) HarmonyState.Ready(result) else HarmonyState.Unavailable
                }
        }
    }

    /** Posizione corrente in millisecondi. */
    fun currentPosition(): Long = playerController.currentPosition()

    fun togglePlayPause() = playerController.togglePlayPause()

    fun skipToNext() = playerController.skipToNext()

    fun skipToPrevious() = playerController.skipToPrevious()

    /** Spegne la modalità Circle Zone (tasto "Esci da CZ"). */
    fun disableCircleZone() = zoneMode.disable()

    /** Passa dal verticale all'orizzontale e viceversa. */
    fun toggleOrientation() = zoneMode.toggleOrientation(Zone.CIRCLE)
}
