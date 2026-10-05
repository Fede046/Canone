package com.example.musicplayer.ui.firewatch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.playback.analysis.AudioAnalyzer
import com.example.musicplayer.playback.analysis.EnergyTimeline
import com.example.musicplayer.playback.analysis.SongAnalysis
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.playback.controller.PlayerController
import com.example.musicplayer.ui.zone.ScreenOnSetting
import com.example.musicplayer.ui.zone.Zone
import com.example.musicplayer.ui.zone.ZoneMode
import com.example.musicplayer.ui.zone.ZoneSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Dati della Firewatch Zone per il brano corrente: la curva di energia, ricavata dall'analisi
 * della Music Zone (stessa cache: un brano già aperto in MZ è pronto subito). Il ViewModel vive
 * solo mentre la schermata è aperta (ma sopravvive alla rotazione).
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class FirewatchViewModel @Inject constructor(
    private val playerController: PlayerController,
    private val songRepository: SongRepository,
    private val audioAnalyzer: AudioAnalyzer,
    private val zoneMode: ZoneMode,
    zoneSettings: ZoneSettings
) : ViewModel() {

    val playback: StateFlow<PlaybackUiState> = playerController.uiState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), playerController.uiState.value)

    private val _timeline = MutableStateFlow<EnergyTimeline?>(null)
    /** Curva del brano corrente; null finché l'analisi non è completa (la scena resta quella base). */
    val timeline: StateFlow<EnergyTimeline?> = _timeline.asStateFlow()

    val isLandscape: StateFlow<Boolean> = zoneMode.isLandscape(Zone.FIRE)

    /** Quanto resta acceso lo schermo (impostazione comune alle Zone). */
    val screenOn: StateFlow<ScreenOnSetting> = zoneSettings.screenOn

    init {
        playerController.connect()
        viewModelScope.launch {
            playerController.uiState
                .distinctUntilChangedBy { it.currentSongId }
                .collectLatest { state ->
                    _timeline.value = null
                    val songId = state.currentSongId ?: return@collectLatest
                    val song = songRepository.getLocalSong(songId) ?: return@collectLatest
                    var analysis: SongAnalysis? = null
                    // Ritorna a decodifica finita (o subito, dalla cache)
                    audioAnalyzer.analyze(song.id, song.localAudioPath) { analysis = it }
                    val complete = analysis?.takeIf { it.isComplete } ?: return@collectLatest
                    _timeline.value = withContext(Dispatchers.Default) { EnergyTimeline.from(complete) }
                }
        }
    }

    /** Posizione corrente in millisecondi. */
    fun currentPosition(): Long = playerController.currentPosition()

    fun togglePlayPause() = playerController.togglePlayPause()

    fun skipToNext() = playerController.skipToNext()

    fun skipToPrevious() = playerController.skipToPrevious()

    /** Spegne la modalità Firewatch Zone (tasto "Esci da FZ"). */
    fun disableFirewatch() = zoneMode.disable()

    /** Passa dal verticale all'orizzontale e viceversa. */
    fun toggleOrientation() = zoneMode.toggleOrientation(Zone.FIRE)
}
