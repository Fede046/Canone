package com.example.musicplayer.ui.firewatch

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.example.musicplayer.playback.analysis.EnergyTimeline
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.ui.components.MarqueeText
import com.example.musicplayer.ui.musiczone.PlaybackClock
import com.example.musicplayer.ui.zone.ZoneCloseButton
import com.example.musicplayer.ui.zone.ZoneExitButton
import com.example.musicplayer.ui.zone.ZoneFullscreenButton
import com.example.musicplayer.ui.zone.ZonePlaybackButtons
import com.example.musicplayer.ui.zone.ZoneRotateButton
import com.example.musicplayer.ui.zone.rememberZoneChrome
import com.example.musicplayer.ui.zone.zoneTapToToggle
import com.example.musicplayer.ui.zone.zoneTouches
import kotlinx.coroutines.delay
import java.time.ZonedDateTime

/** La scena guarda avanti: gli stormi arrivano qualche secondo prima del ritornello. */
private const val LOOKAHEAD_SEC = 2f
private const val SYNC_INTERVAL_NANOS = 500_000_000L
private const val SKY_REFRESH_MS = 30_000L

/**
 * Schermata Firewatch Zone: la torretta antincendio dell'immagine di riferimento, viva. Il cielo
 * segue l'ora del telefono (alba, giorno, tramonto, notte, con sole o luna); gli stormi seguono
 * l'energia del brano: più è energico, più uccelli in cielo. Quando il brano finisce tornano
 * quelli della scena base. Comandi, Ruota e Schermo intero come nella Music Zone; parte in verticale.
 *
 * @param onClose esce dalla schermata lasciando attiva la modalità (freccia giù o Indietro).
 * @param onDisable spegne la modalità e torna al player normale (tasto "Esci da FZ").
 */
@Composable
fun FirewatchScreen(
    onClose: () -> Unit,
    onDisable: () -> Unit,
    viewModel: FirewatchViewModel = hiltViewModel()
) {
    val playback by viewModel.playback.collectAsStateWithLifecycle()
    val timeline by viewModel.timeline.collectAsStateWithLifecycle()
    val isLandscape by viewModel.isLandscape.collectAsStateWithLifecycle()
    val screenOn by viewModel.screenOn.collectAsStateWithLifecycle()
    val chrome = rememberZoneChrome(isLandscape, screenOn, playback.isPlaying)
    // Il momento della giornata, aggiornato ogni 30 secondi: il cielo cambia piano
    var now by remember { mutableStateOf(ZonedDateTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(SKY_REFRESH_MS)
            now = ZonedDateTime.now()
        }
    }
    val sky = remember(now.hour, now.minute) { FirewatchSky.at(now) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sky.skyTop)
            .zoneTouches(chrome)
            .zoneTapToToggle(chrome)
    ) {
        FirewatchBackdrop(sky, Modifier.fillMaxSize())
        FirewatchBirds(
            timeline = timeline,
            isPlaying = playback.isPlaying,
            songKey = playback.currentSongId,
            positionMsProvider = viewModel::currentPosition,
            birdColor = sky.birdColor,
            modifier = Modifier.fillMaxSize()
        )

        AnimatedVisibility(
            visible = chrome.showControls,
            enter = fadeIn(tween(250)),
            exit = fadeOut(tween(400))
        ) {
            FirewatchControls(
                playback = playback,
                topTint = if (sky.darkSky) Color.White else FwColors.Ink,
                isLandscape = isLandscape,
                isFullscreen = chrome.isFullscreen,
                onClose = onClose,
                onDisable = {
                    viewModel.disableFirewatch()
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
 * Comandi sopra la scena: in alto sul cielo ([topTint]: scuri di giorno, chiari di notte),
 * in basso sul bosco quasi nero, in bianco.
 */
@Composable
private fun FirewatchControls(
    playback: PlaybackUiState,
    topTint: Color,
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
    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.displayCutout)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            ZoneCloseButton(onClose, "Chiudi Firewatch Zone", tint = topTint)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
            ) {
                MarqueeText(
                    text = playback.title.ifEmpty { "Firewatch Zone" },
                    style = MaterialTheme.typography.titleMedium.copy(color = topTint),
                    speedMsPerChar = 80,
                    pauseMs = 1500
                )
                if (playback.artist.isNotEmpty()) {
                    MarqueeText(
                        text = playback.artist,
                        style = MaterialTheme.typography.bodySmall.copy(color = topTint.copy(alpha = 0.7f)),
                        speedMsPerChar = 80,
                        pauseMs = 1500
                    )
                }
            }
            ZoneExitButton("Esci da FZ", onDisable, tint = topTint)
        }
        Spacer(modifier = Modifier.weight(1f))
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

/**
 * Gli stormi. Avanzano nel ciclo dei fotogrammi (circa 30 al secondo mentre la musica suona, 20 a
 * musica ferma: la scena base resta viva), solo mentre la schermata è visibile; il disegno ha un
 * livello proprio, così lo sfondo non si ridisegna.
 */
@Composable
private fun FirewatchBirds(
    timeline: EnergyTimeline?,
    isPlaying: Boolean,
    songKey: String?,
    positionMsProvider: () -> Long,
    birdColor: Color,
    modifier: Modifier
) {
    val world = remember { FirewatchWorld() }
    val clock = remember { PlaybackClock() }
    val layoutHolder = remember { arrayOfNulls<ScenePlacement>(1) }
    var frameNanos by remember { mutableLongStateOf(0L) }
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentTimeline by rememberUpdatedState(timeline)
    val playing by rememberUpdatedState(isPlaying)

    LaunchedEffect(isPlaying, songKey) {
        clock.sync(positionMsProvider(), System.nanoTime(), isPlaying)
    }
    LaunchedEffect(Unit) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            var previous = 0L
            var lastSync = 0L
            while (true) {
                val nanos = withFrameNanos { it }
                if (playing && nanos - lastSync > SYNC_INTERVAL_NANOS) {
                    clock.sync(positionMsProvider(), nanos, true)
                    lastSync = nanos
                }
                val layout = layoutHolder[0]
                if (layout != null) {
                    val dt = if (previous == 0L) 0f else ((nanos - previous) / 1e9f).coerceAtMost(0.1f)
                    val curve = currentTimeline
                    val ahead = clock.positionAt(nanos) + LOOKAHEAD_SEC
                    val mood = if (!playing || curve == null) SceneMood.BASE else when (curve.stateAt(ahead)) {
                        EnergyTimeline.ENERGETIC -> SceneMood.ENERGETIC
                        EnergyTimeline.MIDDLE -> SceneMood.MIDDLE
                        else -> SceneMood.CALM
                    }
                    world.step(dt, mood, curve?.energyAt(ahead) ?: 0f, layout)
                }
                previous = nanos
                frameNanos = nanos
                delay(if (playing) 16L else 33L)
            }
        }
    }

    Canvas(
        modifier = modifier
            .onSizeChanged { layoutHolder[0] = ScenePlacement(it.width.toFloat(), it.height.toFloat()) }
            .graphicsLayer()
    ) {
        // frameNanos si legge solo qui: ogni fotogramma ridisegna senza ricomporre.
        // Prima del primo fotogramma il mondo non è ancora partito
        if (frameNanos == 0L) return@Canvas
        val layout = layoutHolder[0] ?: return@Canvas
        world.draw(this, layout, birdColor)
    }
}
