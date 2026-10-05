package com.example.musicplayer.ui.circlezone

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.FloatState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.example.musicplayer.playback.analysis.HarmonyResult
import com.example.musicplayer.playback.controller.PlaybackUiState
import com.example.musicplayer.ui.zone.ZoneChromeState
import com.example.musicplayer.ui.zone.ZoneCloseButton
import com.example.musicplayer.ui.zone.ZoneExitButton
import com.example.musicplayer.ui.zone.ZoneFullscreenButton
import com.example.musicplayer.ui.zone.ZonePlaybackButtons
import com.example.musicplayer.ui.zone.ZoneRotateButton
import com.example.musicplayer.ui.zone.rememberZoneChrome
import com.example.musicplayer.ui.zone.zoneTapToToggle
import com.example.musicplayer.ui.zone.zoneTouches
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

/** Tutto quello che serve ai due layout: dati, stato e azioni. */
private class CircleScreenModel(
    val playback: PlaybackUiState,
    val layout: WheelLayout?,
    val hud: CircleHud?,
    val position: FloatState,
    val subtitle: String,
    val fallbackCaption: String,
    val isLandscape: Boolean,
    val chrome: ZoneChromeState,
    val controlsAlpha: Float,
    val positionMsProvider: () -> Long,
    val onClose: () -> Unit,
    val onDisable: () -> Unit,
    val onPrevious: () -> Unit,
    val onTogglePlay: () -> Unit,
    val onNext: () -> Unit,
    val onRotate: () -> Unit
)

/**
 * Schermata Circle Zone: la ruota delle note al centro, con titolo e tonalità in alto a sinistra,
 * sezione, battuta e accordo in alto a destra, legenda delle voci e orologio delle rotazioni in basso,
 * una didascalia e la barra delle sezioni. In orizzontale come il video a cui si ispira; anche in
 * verticale. Ruota e Schermo intero come nella Music Zone: a schermo intero spariscono solo i comandi,
 * il resto è parte del disegno.
 *
 * @param onClose esce dalla schermata lasciando attiva la modalità (freccia giù o Indietro).
 * @param onDisable spegne la modalità e torna al player normale (tasto "Esci da CZ").
 */
@Composable
fun CircleZoneScreen(
    onClose: () -> Unit,
    onDisable: () -> Unit,
    viewModel: CircleZoneViewModel = hiltViewModel()
) {
    val playback by viewModel.playback.collectAsStateWithLifecycle()
    val harmony by viewModel.harmony.collectAsStateWithLifecycle()
    val isLandscape by viewModel.isLandscape.collectAsStateWithLifecycle()
    val screenOn by viewModel.screenOn.collectAsStateWithLifecycle()
    val chrome = rememberZoneChrome(isLandscape, screenOn, playback.isPlaying)
    val result = (harmony as? HarmonyState.Ready)?.result
    val layout = remember(result) { result?.let { WheelLayout(it, NoteSpeller(it.key)) } }
    val position = remember { mutableFloatStateOf(0f) }
    var hud by remember { mutableStateOf<CircleHud?>(null) }
    val lifecycleOwner = LocalLifecycleOwner.current

    // Interfaccia aggiornata 10 volte al secondo mentre suona, 2 in pausa (per seguire i salti):
    // i testi si ricompongono solo quando cambiano davvero
    LaunchedEffect(result, playback.isPlaying) {
        if (result == null) hud = null
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                val t = viewModel.currentPosition() / 1000f
                position.floatValue = t
                if (layout != null) {
                    val next = circleHud(layout, t)
                    if (next != hud) hud = next
                }
                delay(if (playback.isPlaying) 100L else 500L)
            }
        }
    }
    val controlsAlpha by animateFloatAsState(
        targetValue = if (chrome.showControls) 1f else 0f,
        animationSpec = tween(if (chrome.showControls) 250 else 400),
        label = "controls"
    )

    val details = listOfNotNull(
        layout?.let { "IN ${it.speller.keyName.uppercase()}" },
        result?.tempoBpm?.takeIf { it > 0f }?.let { "♩ = ${it.roundToInt()}" },
        playback.artist.ifEmpty { null }?.uppercase()
    )
    val fallback = when (val state = harmony) {
        is HarmonyState.Listening -> "ascolto il brano · ${(state.progress * 100).roundToInt()}%"
        HarmonyState.Unavailable -> "questo brano non si può analizzare"
        HarmonyState.NoSong -> "avvia un brano per entrare nella Circle Zone"
        is HarmonyState.Ready -> ""
    }
    val model = CircleScreenModel(
        playback = playback,
        layout = layout,
        hud = hud,
        position = position,
        subtitle = details.joinToString("  ·  "),
        fallbackCaption = fallback,
        isLandscape = isLandscape,
        chrome = chrome,
        controlsAlpha = controlsAlpha,
        positionMsProvider = viewModel::currentPosition,
        onClose = onClose,
        onDisable = {
            viewModel.disableCircleZone()
            onDisable()
        },
        onPrevious = viewModel::skipToPrevious,
        onTogglePlay = viewModel::togglePlayPause,
        onNext = viewModel::skipToNext,
        onRotate = viewModel::toggleOrientation
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CzColors.Background)
            .zoneTouches(chrome)
            .zoneTapToToggle(chrome)
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.displayCutout)
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            // La disposizione segue la forma reale dello schermo, non la scelta fatta con Ruota
            if (maxWidth > maxHeight) LandscapeLayout(model) else PortraitLayout(model)
        }
    }
}

@Composable
private fun LandscapeLayout(model: CircleScreenModel) {
    val controlsOn = model.chrome.showControls
    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            Wheel(model, Modifier.fillMaxSize())
            // In alto a sinistra: titolo e tonalità
            Row(modifier = Modifier.align(Alignment.TopStart).widthIn(max = 260.dp)) {
                Box(modifier = Modifier.alpha(model.controlsAlpha)) {
                    ZoneCloseButton(model.onClose, "Chiudi Circle Zone", enabled = controlsOn)
                }
                Column {
                    CzTitleBlock(model.playback.title, model.subtitle, 26.sp)
                    Box(modifier = Modifier.alpha(model.controlsAlpha)) {
                        ZoneExitButton("Esci da CZ", model.onDisable, enabled = controlsOn)
                    }
                }
            }
            // In alto a destra: sezione, battuta e accordo; sotto, i comandi della vista
            Column(modifier = Modifier.align(Alignment.TopEnd), horizontalAlignment = Alignment.End) {
                CzSectionBlock(model.hud)
                Row(modifier = Modifier.alpha(model.controlsAlpha)) {
                    ZoneRotateButton(model.isLandscape, model.onRotate, enabled = controlsOn)
                    ZoneFullscreenButton(model.chrome.isFullscreen, model.chrome::toggleFullscreen, enabled = controlsOn)
                }
            }
            // A destra, a metà altezza: i comandi del brano
            Row(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .alpha(model.controlsAlpha),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ZonePlaybackButtons(model.playback.isPlaying, model.onPrevious, model.onTogglePlay, model.onNext, enabled = controlsOn)
            }
            CzLegend(model.hud, Modifier.align(Alignment.BottomStart))
            CzRotationClock(model.hud, Modifier.align(Alignment.BottomEnd))
        }
        CzCaption(model.hud, model.fallbackCaption)
        Spacer(modifier = Modifier.height(4.dp))
        CzProgressBar(model.position, durationOf(model), model.layout?.result?.sections, Modifier.fillMaxWidth())
    }
}

@Composable
private fun PortraitLayout(model: CircleScreenModel) {
    val controlsOn = model.chrome.showControls
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .alpha(model.controlsAlpha),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ZoneCloseButton(model.onClose, "Chiudi Circle Zone", enabled = controlsOn)
            Spacer(modifier = Modifier.weight(1f))
            ZoneExitButton("Esci da CZ", model.onDisable, enabled = controlsOn)
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            CzTitleBlock(model.playback.title, model.subtitle, 24.sp, Modifier.weight(1f))
            Spacer(modifier = Modifier.width(12.dp))
            CzSectionBlock(model.hud)
        }
        Wheel(
            model,
            Modifier
                .weight(1f)
                .fillMaxWidth()
        )
        CzCaption(model.hud, model.fallbackCaption)
        Spacer(modifier = Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            CzLegend(model.hud, Modifier.weight(1f))
            CzRotationClock(model.hud)
        }
        Spacer(modifier = Modifier.height(8.dp))
        CzProgressBar(model.position, durationOf(model), model.layout?.result?.sections, Modifier.fillMaxWidth())
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .alpha(model.controlsAlpha),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ZoneRotateButton(model.isLandscape, model.onRotate, enabled = controlsOn)
            ZonePlaybackButtons(model.playback.isPlaying, model.onPrevious, model.onTogglePlay, model.onNext, enabled = controlsOn)
            ZoneFullscreenButton(model.chrome.isFullscreen, model.chrome::toggleFullscreen, enabled = controlsOn)
        }
    }
}

@Composable
private fun Wheel(model: CircleScreenModel, modifier: Modifier) {
    CircleWheel(
        layout = model.layout,
        isPlaying = model.playback.isPlaying,
        songKey = model.playback.currentSongId,
        positionMsProvider = model.positionMsProvider,
        modifier = modifier
    )
}

private fun durationOf(model: CircleScreenModel): Float =
    model.layout?.result?.durationSec ?: (model.playback.durationMs / 1000f)
