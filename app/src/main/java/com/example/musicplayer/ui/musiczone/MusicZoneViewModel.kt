package com.example.musicplayer.ui.musiczone

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.playback.analysis.AudioAnalyzer
import com.example.musicplayer.playback.analysis.SongAnalysis
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.playback.controller.PlayerController
import com.example.musicplayer.ui.zone.ScreenOnSetting
import com.example.musicplayer.ui.zone.Zone
import com.example.musicplayer.ui.zone.ZoneMode
import com.example.musicplayer.ui.zone.ZoneSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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

/**
 * Dati della Music Zone per il brano corrente: analisi dello spettro, colori della copertina
 * e nebulosa di sfondo. Il ViewModel vive solo mentre la schermata è aperta (ma sopravvive alla
 * rotazione): analisi e nebulosa partono solo lì, e se si cambia brano o si esce vengono annullate.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class MusicZoneViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val playerController: PlayerController,
    private val songRepository: SongRepository,
    private val audioAnalyzer: AudioAnalyzer,
    private val zoneMode: ZoneMode,
    zoneSettings: ZoneSettings
) : ViewModel() {

    val playback: StateFlow<PlaybackUiState> = playerController.uiState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), playerController.uiState.value)

    private val _analysis = MutableStateFlow<SongAnalysis?>(null)
    val analysis: StateFlow<SongAnalysis?> = _analysis.asStateFlow()

    private val _colors = MutableStateFlow<List<Color>>(emptyList())
    val colors: StateFlow<List<Color>> = _colors.asStateFlow()

    private val _nebula = MutableStateFlow<ImageBitmap?>(null)
    val nebula: StateFlow<ImageBitmap?> = _nebula.asStateFlow()

    val isLandscape: StateFlow<Boolean> = zoneMode.isLandscape(Zone.MUSIC)

    /** Quanto resta acceso lo schermo (impostazione comune alle Zone). */
    val screenOn: StateFlow<ScreenOnSetting> = zoneSettings.screenOn

    init {
        playerController.connect()
        viewModelScope.launch {
            playerController.uiState
                .distinctUntilChangedBy { it.currentSongId }
                .collectLatest { state ->
                    val songId = state.currentSongId
                    _analysis.value = null
                    if (songId == null) return@collectLatest
                    // Una lettura Room per brano: file audio e copertina. La copertina non si prende
                    // da PlaybackUiState perché al cambio brano l'id arriva prima dei metadati.
                    val song = songRepository.getLocalSong(songId)
                    launch {
                        val palette = CoverPalette.extract(context, songId, song?.localCoverPath, song?.coverUrl)
                        _colors.value = palette
                        // Fino a qui resta la nebulosa del brano precedente: la nuova la sostituisce sfumando
                        _nebula.value = NebulaRenderer.render(palette, songId.hashCode())
                    }
                    if (song == null) return@collectLatest
                    audioAnalyzer.analyze(song.id, song.localAudioPath) { _analysis.value = it }
                }
        }
    }

    /** Posizione corrente in millisecondi (il visualizzatore la ricampiona ogni mezzo secondo). */
    fun currentPosition(): Long = playerController.currentPosition()

    fun togglePlayPause() = playerController.togglePlayPause()

    fun skipToNext() = playerController.skipToNext()

    fun skipToPrevious() = playerController.skipToPrevious()

    /** Spegne la modalità Music Zone (tasto "Esci da MZ"). */
    fun disableMusicZone() = zoneMode.disable()

    /** Passa dal verticale all'orizzontale e viceversa. */
    fun toggleOrientation() = zoneMode.toggleOrientation(Zone.MUSIC)
}
