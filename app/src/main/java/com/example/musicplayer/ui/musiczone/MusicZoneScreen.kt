package com.example.musicplayer.ui.musiczone

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.ui.components.MarqueeText
import com.example.musicplayer.ui.zone.ZoneCloseButton
import com.example.musicplayer.ui.zone.ZoneExitButton
import com.example.musicplayer.ui.zone.ZoneFullscreenButton
import com.example.musicplayer.ui.zone.ZonePlaybackButtons
import com.example.musicplayer.ui.zone.ZoneRotateButton
import com.example.musicplayer.ui.zone.rememberZoneChrome
import com.example.musicplayer.ui.zone.zoneTapToToggle
import com.example.musicplayer.ui.zone.zoneTouches

private val SIDE_PANEL_WIDTH = 200.dp

/**
 * Schermata Music Zone: nebulosa di sfondo e visualizzatore "Canone" a tutto schermo, con i comandi
 * sopra. In verticale titolo in alto e comandi in basso; in orizzontale titolo a sinistra e comandi
 * a destra. In entrambi i casi la figura, al centro, resta libera.
 *
 * Due tasti cambiano la vista. Ruota passa dal verticale all'orizzontale (la scelta resta finché
 * l'app è aperta). Schermo intero: vedi ZoneChromeState.
 *
 * @param onClose esce dalla schermata lasciando attiva la modalità (freccia giù o Indietro).
 * @param onDisable spegne la modalità e torna al player normale (tasto "Esci da MZ").
 */
@Composable
fun MusicZoneScreen(
    onClose: () -> Unit,
    onDisable: () -> Unit,
    viewModel: MusicZoneViewModel = hiltViewModel()
) {
    val playback by viewModel.playback.collectAsStateWithLifecycle()
    val analysis by viewModel.analysis.collectAsStateWithLifecycle()
    val colors by viewModel.colors.collectAsStateWithLifecycle()
    val nebula by viewModel.nebula.collectAsStateWithLifecycle()
    val isLandscape by viewModel.isLandscape.collectAsStateWithLifecycle()
    val screenOn by viewModel.screenOn.collectAsStateWithLifecycle()
    val chrome = rememberZoneChrome(isLandscape, screenOn, playback.isPlaying)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .zoneTouches(chrome)
    ) {
        NebulaBackground(nebula = nebula, modifier = Modifier.fillMaxSize())

        Box(
            modifier = Modifier
                .fillMaxSize()
                .zoneTapToToggle(chrome),
            contentAlignment = Alignment.Center
        ) {
            if (playback.currentSongId == null) {
                Text(
                    text = "Avvia un brano per entrare nella Music Zone.",
                    color = Color.White.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 32.dp)
                )
            } else {
                CanonVisualizer(
                    analysis = analysis,
                    colors = colors,
                    isPlaying = playback.isPlaying,
                    songKey = playback.currentSongId,
                    positionMsProvider = viewModel::currentPosition,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }

        AnimatedVisibility(
            visible = chrome.showControls,
            enter = fadeIn(tween(250)),
            exit = fadeOut(tween(400))
        ) {
            ZoneControls(
                playback = playback,
                isLandscape = isLandscape,
                isFullscreen = chrome.isFullscreen,
                onClose = onClose,
                onDisable = {
                    viewModel.disableMusicZone()
                    onDisable()
                },
                onPrevious = viewModel::skipToPrevious,
                onTogglePlay = viewModel::togglePlayPause,
                onNext = viewModel::skipToNext,
                onRotate = viewModel::toggleOrientation,
                onToggleFullscreen = chrome::toggleFullscreen
            )
        }
    }
}

/**
 * Comandi sopra il visualizzatore. La disposizione segue la forma reale dello schermo
 * (più largo che alto = orizzontale), non la scelta fatta con Ruota: durante la rotazione
 * le due cose per un attimo non coincidono.
 */
@Composable
private fun ZoneControls(
    playback: PlaybackUiState,
    isLandscape: Boolean,
    isFullscreen: Boolean,
    onClose: () -> Unit,
    onDisable: () -> Unit,
    onPrevious: () -> Unit,
    onTogglePlay: () -> Unit,
    onNext: () -> Unit,
    onRotate: () -> Unit,
    onToggleFullscreen: () -> Unit
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            // A schermo intero lo sfondo arriva fino al foro della fotocamera: i tasti no
            .windowInsetsPadding(WindowInsets.displayCutout)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        if (maxWidth > maxHeight) {
            Row(modifier = Modifier.fillMaxSize()) {
                // Sinistra: chiudi e titolo in alto, esci dalla modalità in basso
                Column(
                    modifier = Modifier
                        .width(SIDE_PANEL_WIDTH)
                        .fillMaxHeight()
                ) {
                    ZoneCloseButton(onClose, contentDescription = "Chiudi Music Zone")
                    SongTitle(playback, Modifier.padding(horizontal = 12.dp))
                    Spacer(modifier = Modifier.weight(1f))
                    ZoneExitButton("Esci da MZ", onDisable)
                }
                Spacer(modifier = Modifier.weight(1f))
                // Destra: comandi del brano a metà altezza, comandi della vista in basso
                Column(
                    modifier = Modifier
                        .width(SIDE_PANEL_WIDTH)
                        .fillMaxHeight(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ZonePlaybackButtons(playback.isPlaying, onPrevious, onTogglePlay, onNext)
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        ZoneRotateButton(isLandscape, onRotate)
                        ZoneFullscreenButton(isFullscreen, onToggleFullscreen)
                    }
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                // In alto: esci dalla schermata | titolo e artista | esci dalla modalità
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZoneCloseButton(onClose, contentDescription = "Chiudi Music Zone")
                    SongTitle(
                        playback,
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 8.dp)
                    )
                    ZoneExitButton("Esci da MZ", onDisable)
                }
                Spacer(modifier = Modifier.weight(1f))
                // In basso: ruota | precedente | play/pausa | successiva | schermo intero
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZoneRotateButton(isLandscape, onRotate)
                    ZonePlaybackButtons(playback.isPlaying, onPrevious, onTogglePlay, onNext)
                    ZoneFullscreenButton(isFullscreen, onToggleFullscreen)
                }
            }
        }
    }
}

@Composable
private fun SongTitle(playback: PlaybackUiState, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        MarqueeText(
            text = playback.title.ifEmpty { "Nessuna canzone" },
            style = MaterialTheme.typography.titleMedium.copy(color = Color.White),
            speedMsPerChar = 80,
            pauseMs = 1500
        )
        if (playback.artist.isNotEmpty()) {
            MarqueeText(
                text = playback.artist,
                style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(alpha = 0.6f)),
                speedMsPerChar = 80,
                pauseMs = 1500
            )
        }
    }
}
