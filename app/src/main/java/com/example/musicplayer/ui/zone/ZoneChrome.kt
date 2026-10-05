package com.example.musicplayer.ui.zone

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.os.Build
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import kotlinx.coroutines.delay

private const val CONTROLS_HIDE_MS = 3500L

/**
 * Schermo intero e comandi di una schermata Zone. A schermo intero le barre di sistema e i comandi
 * spariscono; un tocco fuori dai tasti li fa riapparire, e senza altri tocchi spariscono di nuovo
 * dopo qualche secondo. Indietro esce prima dallo schermo intero, poi dalla schermata.
 */
@Stable
class ZoneChromeState internal constructor(
    fullscreen: MutableState<Boolean>,
    controlsVisible: MutableState<Boolean>
) {
    var isFullscreen by fullscreen
        private set
    private var controlsShown by controlsVisible
    internal var touches by mutableIntStateOf(0)

    /** I comandi si vedono: sempre fuori dallo schermo intero, dopo un tocco dentro. */
    val showControls: Boolean get() = !isFullscreen || controlsShown

    internal val controlsShownForTimer: Boolean get() = controlsShown

    fun toggleFullscreen() {
        isFullscreen = !isFullscreen
        // Entrando i comandi spariscono subito, uscendo restano
        controlsShown = !isFullscreen
    }

    internal fun exitFullscreen() {
        isFullscreen = false
        controlsShown = true
    }

    internal fun toggleControls() {
        if (isFullscreen) controlsShown = !controlsShown
    }

    internal fun hideControls() {
        controlsShown = false
    }
}

/**
 * Stato dello schermo intero (salvato: ruotando l'activity viene ricreata), con i suoi effetti:
 * orientamento bloccato su quello scelto, barre di sistema nascoste, Indietro e scomparsa dei comandi,
 * schermo acceso secondo l'impostazione [screenOn].
 */
@Composable
fun rememberZoneChrome(isLandscape: Boolean, screenOn: ScreenOnSetting, isPlaying: Boolean): ZoneChromeState {
    val fullscreen = rememberSaveable { mutableStateOf(false) }
    val controls = rememberSaveable { mutableStateOf(true) }
    val state = remember { ZoneChromeState(fullscreen, controls) }

    LockOrientation(landscape = isLandscape)
    HideSystemBars(hidden = state.isFullscreen)
    KeepScreenOn(screenOn, isPlaying, state.touches)
    BackHandler(enabled = state.isFullscreen) { state.exitFullscreen() }
    LaunchedEffect(state.isFullscreen, state.controlsShownForTimer, state.touches) {
        if (state.isFullscreen && state.controlsShownForTimer) {
            delay(CONTROLS_HIDE_MS)
            state.hideControls()
        }
    }
    return state
}

/** Ogni tocco, anche sui tasti, rimanda la scomparsa dei comandi (senza consumarlo). */
fun Modifier.zoneTouches(state: ZoneChromeState): Modifier = pointerInput(state) {
    awaitEachGesture {
        awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        state.touches++
    }
}

/** A schermo intero un tocco fuori dai tasti mostra o nasconde i comandi. */
fun Modifier.zoneTapToToggle(state: ZoneChromeState): Modifier = pointerInput(state, state.isFullscreen) {
    if (state.isFullscreen) detectTapGestures { state.toggleControls() }
}

@Composable
fun ZoneCloseButton(onClose: () -> Unit, contentDescription: String, enabled: Boolean = true, tint: Color = Color.White) {
    IconButton(onClick = onClose, enabled = enabled) {
        Icon(
            imageVector = Icons.Default.KeyboardArrowDown,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(32.dp)
        )
    }
}

/** Tasto "Esci da MZ" / "Esci da CZ": spegne la modalità. */
@Composable
fun ZoneExitButton(label: String, onDisable: () -> Unit, enabled: Boolean = true, tint: Color = Color.White) {
    TextButton(onClick = onDisable, enabled = enabled) {
        Icon(
            imageVector = Icons.Default.Close,
            contentDescription = null,
            tint = tint.copy(alpha = 0.8f),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, color = tint.copy(alpha = 0.8f))
    }
}

/** Precedente, play/pausa, successiva: tre tasti, nella riga di chi li chiama. */
@Composable
fun ZonePlaybackButtons(
    isPlaying: Boolean,
    onPrevious: () -> Unit,
    onTogglePlay: () -> Unit,
    onNext: () -> Unit,
    enabled: Boolean = true,
    tint: Color = Color.White
) {
    IconButton(onClick = onPrevious, enabled = enabled) {
        Icon(
            imageVector = Icons.Default.SkipPrevious,
            contentDescription = "Precedente",
            tint = tint,
            modifier = Modifier.size(36.dp)
        )
    }
    IconButton(onClick = onTogglePlay, enabled = enabled, modifier = Modifier.size(80.dp)) {
        Icon(
            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
            contentDescription = if (isPlaying) "Pausa" else "Play",
            tint = tint,
            modifier = Modifier.size(64.dp)
        )
    }
    IconButton(onClick = onNext, enabled = enabled) {
        Icon(
            imageVector = Icons.Default.SkipNext,
            contentDescription = "Successiva",
            tint = tint,
            modifier = Modifier.size(36.dp)
        )
    }
}

@Composable
fun ZoneRotateButton(isLandscape: Boolean, onRotate: () -> Unit, enabled: Boolean = true, tint: Color = Color.White) {
    IconButton(onClick = onRotate, enabled = enabled) {
        Icon(
            imageVector = Icons.Default.ScreenRotation,
            contentDescription = if (isLandscape) "Ruota in verticale" else "Ruota in orizzontale",
            tint = tint.copy(alpha = 0.8f),
            modifier = Modifier.size(26.dp)
        )
    }
}

@Composable
fun ZoneFullscreenButton(isFullscreen: Boolean, onToggle: () -> Unit, enabled: Boolean = true, tint: Color = Color.White) {
    IconButton(onClick = onToggle, enabled = enabled) {
        Icon(
            imageVector = if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
            contentDescription = if (isFullscreen) "Esci dallo schermo intero" else "Schermo intero",
            tint = tint.copy(alpha = 0.8f),
            modifier = Modifier.size(30.dp)
        )
    }
}

/**
 * Schermo acceso secondo l'impostazione delle Zone: come il telefono, sempre mentre la musica
 * suona, oppure per alcuni minuti dall'ultimo tocco ([touches] cambia a ogni tocco e fa ripartire
 * il conto). Uscendo dalla schermata torna sempre come il telefono.
 */
@Composable
private fun KeepScreenOn(setting: ScreenOnSetting, isPlaying: Boolean, touches: Int) {
    val view = LocalView.current
    var timeUp by remember { mutableStateOf(false) }
    if (setting.mode == ScreenOnMode.MINUTES) {
        LaunchedEffect(setting.minutes, touches) {
            timeUp = false
            delay(setting.minutes * 60_000L)
            timeUp = true
        }
    }
    val keepOn = when (setting.mode) {
        ScreenOnMode.SYSTEM -> false
        ScreenOnMode.WHILE_PLAYING -> isPlaying
        ScreenOnMode.MINUTES -> !timeUp
    }
    DisposableEffect(view, keepOn) {
        view.keepScreenOn = keepOn
        onDispose { view.keepScreenOn = false }
    }
}

/**
 * Blocca la schermata nell'orientamento scelto (orizzontale: nei due versi, secondo il sensore)
 * finché è visibile. All'uscita torna all'orientamento libero (l'app non ne impone altri): non si
 * salva "quello di prima" perché, cambiando orientamento all'ingresso, l'activity viene ricreata
 * e la nuova istanza leggerebbe già quello della schermata.
 */
@Composable
private fun LockOrientation(landscape: Boolean) {
    val activity = LocalContext.current.findActivity() ?: return
    SideEffect {
        activity.requestedOrientation = if (landscape) {
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        } else {
            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }
    DisposableEffect(activity) {
        onDispose {
            // Durante la ricreazione dell'activity il blocco resta, la nuova istanza lo rimette
            if (!activity.isChangingConfigurations) {
                activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
        }
    }
}

/**
 * Schermo intero: nasconde barra di stato e barra di navigazione (uno swipe dal bordo le mostra
 * per un momento) e lascia arrivare lo sfondo fin sotto il foro della fotocamera. Tutto torna
 * com'era quando si esce dallo schermo intero o dalla schermata.
 *
 * In orizzontale il sistema tiene comunque la finestra fuori dal foro (banda scura su quel lato),
 * perché l'app non è edge-to-edge. Toglierla cambiando setDecorFitsSystemWindows non è sicuro:
 * rimettendolo, su alcune versioni di Android i margini delle barre si applicano due volte.
 */
@Composable
private fun HideSystemBars(hidden: Boolean) {
    val activity = LocalContext.current.findActivity() ?: return
    DisposableEffect(activity, hidden) {
        if (!hidden) return@DisposableEffect onDispose { }
        val window = activity.window
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
        val previousCutoutMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode.also {
                window.attributes = window.attributes.apply {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }
        } else {
            0
        }
        onDispose {
            controller.show(WindowInsetsCompat.Type.systemBars())
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                window.attributes = window.attributes.apply { layoutInDisplayCutoutMode = previousCutoutMode }
            }
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
