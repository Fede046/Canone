package com.example.musicplayer.ui.musiczone

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.CanvasDrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.example.musicplayer.playback.analysis.SongAnalysis
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/*
 * "Canone" — il visualizzatore della Music Zone.
 *
 * La figura è una curva chiusa con simmetria rotazionale esatta di ordine k:
 *     z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s)
 * (le frequenze 1, 1+k e 1-2k danno tutte lo stesso giro di 360°/k, quindi la curva
 * coincide con se stessa ruotata di 360°/k). Ha k lobi; la musica decide quanto sono
 * profondi (a: medi, b: alti) e quanto respira la figura (bassi), ma non ne rompe la simmetria.
 *
 * Le figure si susseguono in ordine, avanti e indietro come in un canone cancrizzante:
 * 3, 4, 5, 6, 7, 8, 7, 6, 5, 4 lobi. Il cambio cade sul primo colpo forte dopo almeno 8 secondi
 * (vedi SongAnalysis) e la figura si trasforma nella successiva in modo continuo.
 *
 * Le [VOICES] voci scorrono sulla stessa curva, equidistanti e nello stesso verso, con una
 * velocità che cresce con l'energia del brano. Come in un canone ognuna "risponde" in ritardo:
 * la sua testa si accende con una banda diversa, ascoltata [VOICE_DELAY_SEC] secondi dopo la
 * voce precedente, così la luce gira intorno alla figura. Sui colpi forti partono anelli
 * dal centro; k raggi tenui mostrano gli assi di simmetria.
 *
 * Costo per fotogramma: circa 380 punti calcolati con rotazioni complesse (nessun seno o coseno
 * per punto), circa 150 letture dell'analisi e una cinquantina di comandi di disegno, senza
 * allocazioni. Il disegno dipende solo dall'istante t: nessuno stato fra un fotogramma e l'altro.
 */

private const val VOICES = 6
private const val VOICE_DELAY_SEC = 0.6f
private const val ENTRY_FADE_SEC = 0.8f
private val FIGURE_SEQUENCE = intArrayOf(3, 4, 5, 6, 7, 8, 7, 6, 5, 4)
private const val MORPH_SEC = 1.4f
private const val GUIDE_POINTS = 180
private const val TRAIL_POINTS = 32
private const val TRAIL_CHUNKS = 3
private const val BASE_SPEED = 0.35f
private const val ENERGY_SPEED = 0.9f
private const val GLOBAL_SPIN = 0.04f
private const val RIPPLE_LIFE_SEC = 1.4f
private const val RIPPLE_STROKES = 4
private const val TWO_PI = (2 * PI).toFloat()
private const val GLOW_IMAGE_SIZE = 128

// Filtro triangolare (±4 fotogrammi) sull'energia che guida la forma: la figura respira senza tremare
private const val SMOOTH_TAPS = 4
private val SMOOTH_WEIGHTS = FloatArray(2 * SMOOTH_TAPS + 1) { (SMOOTH_TAPS + 1 - abs(it - SMOOTH_TAPS)).toFloat() }
    .let { w -> val total = w.sum(); FloatArray(w.size) { w[it] / total } }

// ~30 fotogrammi al secondo: fluido, ma metà del lavoro di 60
private const val FRAME_PAUSE_MS = 16L
private const val SYNC_INTERVAL_NANOS = 500_000_000L

private val DEFAULT_COLORS = listOf(
    Color(0xFFA855F7), Color(0xFFE879F9), Color(0xFF60A5FA),
    Color(0xFF34D399), Color(0xFFFBBF24), Color(0xFFF87171)
)

/**
 * Posizione del brano per il disegno: agganciata al player ogni mezzo secondo e fatta avanzare
 * con il tempo dei fotogrammi in mezzo. Le piccole differenze si ignorano (niente scatti),
 * i salti veri (brano nuovo, seek dalla notifica) si seguono.
 */
internal class PlaybackClock {
    private var anchorPosSec = 0f
    private var anchorNanos = 0L
    private var running = false

    fun positionAt(nanos: Long): Float =
        if (running) anchorPosSec + (nanos - anchorNanos) / 1e9f else anchorPosSec

    fun sync(positionMs: Long, nanos: Long, isPlaying: Boolean) {
        val actual = positionMs / 1000f
        if (!running || !isPlaying || abs(positionAt(nanos) - actual) > 0.12f) {
            anchorPosSec = actual
            anchorNanos = nanos
        }
        running = isPlaying
    }
}

/** Forma corrente: figura (o passaggio fra due figure) e parametri decisi dalla musica. */
private class ShapeState {
    var fromK = FIGURE_SEQUENCE[0]
    var toK = FIGURE_SEQUENCE[0]
    var morph = 1f // 0 = tutta fromK, 1 = tutta toK
    var a = 0f
    var b = 0f
}

/** Buffer e pennelli riusati a ogni fotogramma: nel disegno non si alloca nulla. */
private class CanonBuffers(density: Density) {
    val shape = ShapeState()
    val guideX = FloatArray(GUIDE_POINTS + 1)
    val guideY = FloatArray(GUIDE_POINTS + 1)
    val trailX = FloatArray(TRAIL_POINTS + 1)
    val trailY = FloatArray(TRAIL_POINTS + 1)
    val morphX = FloatArray(GUIDE_POINTS + 1)
    val morphY = FloatArray(GUIDE_POINTS + 1)
    val path = Path()
    // Giunzioni smussate e non tonde: ogni giunzione tonda diventa molti triangoli da preparare
    // sul RenderThread a ogni fotogramma. Tratti di soli 1-4 dp: la differenza non si vede.
    val trailStrokes = Array(TRAIL_CHUNKS) { chunk ->
        Stroke(
            width = with(density) { (1.4f + 2.6f * (chunk + 1) / TRAIL_CHUNKS).dp.toPx() },
            cap = StrokeCap.Butt,
            join = StrokeJoin.Bevel
        )
    }
    val guideStroke = Stroke(width = with(density) { 1.2.dp.toPx() }, join = StrokeJoin.Bevel)
    val rippleStrokes = Array(RIPPLE_STROKES) { i ->
        Stroke(width = with(density) { (1f + 2.5f * (RIPPLE_STROKES - i) / RIPPLE_STROKES).dp.toPx() })
    }
    val axisWidth = with(density) { 1.dp.toPx() }
    val dp = density.density

    // Alone del nucleo: una piccola immagine con la sfumatura, disegnata una volta per colore
    // e poi solo copiata e ingrandita a ogni fotogramma (più economico di una sfumatura calcolata)
    private var glowColor = Color.Unspecified
    private var cachedGlow: ImageBitmap? = null

    fun glowImage(color: Color): ImageBitmap {
        val cached = cachedGlow
        if (cached != null && color == glowColor) return cached
        glowColor = color
        val image = ImageBitmap(GLOW_IMAGE_SIZE, GLOW_IMAGE_SIZE)
        val half = GLOW_IMAGE_SIZE / 2f
        CanvasDrawScope().draw(
            density = Density(1f),
            layoutDirection = LayoutDirection.Ltr,
            canvas = Canvas(image),
            size = Size(GLOW_IMAGE_SIZE.toFloat(), GLOW_IMAGE_SIZE.toFloat())
        ) {
            drawCircle(
                brush = Brush.radialGradient(
                    colorStops = arrayOf(
                        0f to color,
                        0.35f to color.copy(alpha = 0.45f),
                        1f to Color.Transparent
                    ),
                    center = Offset(half, half),
                    radius = half
                ),
                radius = half,
                center = Offset(half, half)
            )
        }
        cachedGlow = image
        return image
    }
}

/**
 * Visualizzatore "Canone". Anima solo mentre [isPlaying] è vero e la schermata è visibile
 * (a schermo spento o app in background il ciclo dei fotogrammi si ferma); in pausa resta
 * fermo sull'ultimo istante.
 *
 * @param songKey id del brano: al cambio, l'orologio si riaggancia alla nuova posizione.
 */
@Composable
fun CanonVisualizer(
    analysis: SongAnalysis?,
    colors: List<Color>,
    isPlaying: Boolean,
    songKey: String?,
    positionMsProvider: () -> Long,
    modifier: Modifier = Modifier
) {
    val clock = remember { PlaybackClock() }
    var frameNanos by remember { mutableLongStateOf(System.nanoTime()) }
    // Salvato: ruotando lo schermo l'activity viene ricreata, ma le voci non devono rientrare
    val openedAtNanos = rememberSaveable { System.nanoTime() }
    val lifecycleOwner = LocalLifecycleOwner.current
    val density = LocalDensity.current
    val buffers = remember(density) { CanonBuffers(density) }
    val palette = colors.ifEmpty { DEFAULT_COLORS }

    LaunchedEffect(isPlaying, songKey) {
        val now = System.nanoTime()
        clock.sync(positionMsProvider(), now, isPlaying)
        frameNanos = now
        if (!isPlaying) return@LaunchedEffect
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            var lastSync = 0L
            while (true) {
                val nanos = withFrameNanos { it }
                if (nanos - lastSync > SYNC_INTERVAL_NANOS) {
                    clock.sync(positionMsProvider(), nanos, true)
                    lastSync = nanos
                }
                frameNanos = nanos
                delay(FRAME_PAUSE_MS)
            }
        }
    }

    // Livello proprio: a ogni fotogramma si registra di nuovo solo il visualizzatore, non lo sfondo
    // né i comandi. Senza trasparenza il livello non passa da un buffer a parte, quindi la fusione
    // additiva continua a sommarsi alla nebulosa sotto.
    Canvas(modifier = modifier.graphicsLayer()) {
        // frameNanos si legge solo qui: ogni fotogramma ridisegna senza ricomporre
        val nanos = frameNanos
        val t = clock.positionAt(nanos)
        // Ingresso nella schermata: le voci entrano una dopo l'altra anche a brano già iniziato
        val introSec = if (isPlaying) (nanos - openedAtNanos) / 1e9f else Float.MAX_VALUE
        drawCanon(t, introSec, analysis, palette, buffers)
    }
}

private fun DrawScope.drawCanon(
    t: Float,
    introSec: Float,
    analysis: SongAnalysis?,
    colors: List<Color>,
    buffers: CanonBuffers
) {
    val center = Offset(size.width / 2f, size.height / 2f)
    val bass = smoothedEnergy(analysis, 0, 0, t)
    val mid = smoothedEnergy(analysis, 1, 3, t)
    val high = smoothedEnergy(analysis, 4, 5, t)
    val total = smoothedEnergy(analysis, 0, 5, t)

    val shape = buffers.shape
    updateShape(shape, analysis, t, mid, high)
    val radius = min(size.width, size.height) * 0.44f * (0.86f + 0.14f * bass)
    val spin = t * GLOBAL_SPIN
    val cosSpin = cos(spin)
    val sinSpin = sin(spin)

    drawAxes(center, radius, spin, shape, buffers)
    drawNucleus(center, radius, bass, colors.first(), buffers)
    if (analysis != null) drawRipples(center, radius, t, analysis, colors, buffers)

    // Figura completa, appena visibile: la "partitura" su cui scorrono le voci
    sampleShape(shape, 0f, TWO_PI / GUIDE_POINTS, GUIDE_POINTS + 1, buffers.guideX, buffers.guideY, buffers)
    buildPath(buffers.path, buffers.guideX, buffers.guideY, 0, GUIDE_POINTS, center, radius, cosSpin, sinSpin)
    drawPath(
        path = buffers.path,
        color = Color.White.copy(alpha = 0.07f + 0.08f * bass),
        style = buffers.guideStroke
    )

    // Voci: equidistanti sulla curva, stesso verso, velocità guidata dall'energia accumulata
    val phase = BASE_SPEED * t + ENERGY_SPEED * (analysis?.accumulatedEnergyAt(t) ?: 0f)
    val trailLength = 0.7f + 0.9f * total
    for (voice in 0 until VOICES) {
        val songEntry = ((t - voice * 0.35f) / ENTRY_FADE_SEC).coerceIn(0f, 1f)
        val screenEntry = ((introSec - voice * 0.35f) / ENTRY_FADE_SEC).coerceIn(0f, 1f)
        val entry = min(songEntry, screenEntry)
        if (entry <= 0f) continue
        val head = phase + TWO_PI * voice / VOICES
        val band = voice % SongAnalysis.BAND_COUNT
        val echo = smoothedEnergy(analysis, band, band, t - voice * VOICE_DELAY_SEC)
        drawVoice(
            head, trailLength, entry, echo, center, radius, cosSpin, sinSpin,
            colors[voice % colors.size], buffers
        )
    }
}

/** Figura in corso, passaggio verso la successiva e profondità dei lobi all'istante [t]. */
private fun updateShape(shape: ShapeState, analysis: SongAnalysis?, t: Float, mid: Float, high: Float) {
    shape.a = 0.16f + 0.30f * mid
    shape.b = 0.03f + 0.12f * high
    if (analysis == null) {
        shape.fromK = FIGURE_SEQUENCE[0]
        shape.toK = FIGURE_SEQUENCE[0]
        shape.morph = 1f
        return
    }
    val frame = (t * SongAnalysis.FRAME_RATE).toInt().coerceAtLeast(0)
    val index = analysis.figureIndexAt(frame)
    shape.toK = FIGURE_SEQUENCE[index % FIGURE_SEQUENCE.size]
    shape.fromK = FIGURE_SEQUENCE[(index - 1 + FIGURE_SEQUENCE.size) % FIGURE_SEQUENCE.size]
    if (index == 0) {
        shape.morph = 1f
    } else {
        val sinceChange = t - analysis.figureStartFrame(index).toFloat() / SongAnalysis.FRAME_RATE
        val x = (sinceChange / MORPH_SEC).coerceIn(0f, 1f)
        // Accelera e rallenta (ease in-out cubica)
        shape.morph = if (x < 0.5f) 4f * x * x * x else 1f - (-2f * x + 2f).let { it * it * it } / 2f
    }
}

/**
 * Riempie [outX]/[outY] con [count] punti della forma, da s0 con passo ds.
 * Durante un cambio di figura mescola le due figure punto per punto (stesso parametro s):
 * la curva resta chiusa e si trasforma con continuità.
 */
private fun sampleShape(
    shape: ShapeState,
    s0: Float,
    ds: Float,
    count: Int,
    outX: FloatArray,
    outY: FloatArray,
    buffers: CanonBuffers
) {
    sampleFigure(shape.toK, shape.a, shape.b, s0, ds, count, outX, outY)
    if (shape.morph >= 1f || shape.fromK == shape.toK) return
    sampleFigure(shape.fromK, shape.a, shape.b, s0, ds, count, buffers.morphX, buffers.morphY)
    val m = shape.morph
    for (i in 0 until count) {
        outX[i] = buffers.morphX[i] + (outX[i] - buffers.morphX[i]) * m
        outY[i] = buffers.morphY[i] + (outY[i] - buffers.morphY[i]) * m
    }
}

/**
 * Punti della figura a k lobi z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s), normalizzata a raggio 1.
 * Ogni termine avanza moltiplicando per la rotazione del passo: tre coppie seno/coseno per chiamata
 * invece che per punto.
 */
private fun sampleFigure(
    k: Int,
    a: Float,
    b: Float,
    s0: Float,
    ds: Float,
    count: Int,
    outX: FloatArray,
    outY: FloatArray
) {
    val f2 = (1 + k).toDouble()
    val f3 = (1 - 2 * k).toDouble()
    var c1 = cos(s0.toDouble()); var s1 = sin(s0.toDouble())
    var c2 = cos(f2 * s0); var s2 = sin(f2 * s0)
    var c3 = cos(f3 * s0); var s3 = sin(f3 * s0)
    val dc1 = cos(ds.toDouble()); val ds1 = sin(ds.toDouble())
    val dc2 = cos(f2 * ds); val ds2 = sin(f2 * ds)
    val dc3 = cos(f3 * ds); val ds3 = sin(f3 * ds)
    val norm = 1.0 / (1.0 + a + b)
    for (i in 0 until count) {
        outX[i] = ((c1 + a * c2 + b * c3) * norm).toFloat()
        outY[i] = ((s1 + a * s2 + b * s3) * norm).toFloat()
        val n1 = c1 * dc1 - s1 * ds1; s1 = c1 * ds1 + s1 * dc1; c1 = n1
        val n2 = c2 * dc2 - s2 * ds2; s2 = c2 * ds2 + s2 * dc2; c2 = n2
        val n3 = c3 * dc3 - s3 * ds3; s3 = c3 * ds3 + s3 * dc3; c3 = n3
    }
}

/** Costruisce il tratto [from, to] dei punti unitari, ruotati della rotazione globale e scalati. */
private fun buildPath(
    path: Path,
    xs: FloatArray,
    ys: FloatArray,
    from: Int,
    to: Int,
    center: Offset,
    radius: Float,
    cosSpin: Float,
    sinSpin: Float
) {
    path.reset()
    for (i in from..to) {
        val x = center.x + radius * (xs[i] * cosSpin - ys[i] * sinSpin)
        val y = center.y + radius * (xs[i] * sinSpin + ys[i] * cosSpin)
        if (i == from) path.moveTo(x, y) else path.lineTo(x, y)
    }
}

/** k raggi tenui sugli assi di simmetria della figura (durante il cambio si dissolvono). */
private fun DrawScope.drawAxes(center: Offset, radius: Float, spin: Float, shape: ShapeState, buffers: CanonBuffers) {
    drawAxisSet(center, radius, spin, shape.toK, 0.05f * shape.morph, buffers)
    if (shape.morph < 1f) drawAxisSet(center, radius, spin, shape.fromK, 0.05f * (1f - shape.morph), buffers)
}

private fun DrawScope.drawAxisSet(center: Offset, radius: Float, spin: Float, k: Int, alpha: Float, buffers: CanonBuffers) {
    if (alpha <= 0.001f) return
    val color = Color.White.copy(alpha = alpha)
    for (i in 0 until k) {
        val angle = spin + TWO_PI * i / k
        val dx = cos(angle)
        val dy = sin(angle)
        drawLine(
            color = color,
            start = Offset(center.x + dx * radius * 0.15f, center.y + dy * radius * 0.15f),
            end = Offset(center.x + dx * radius * 1.12f, center.y + dy * radius * 1.12f),
            strokeWidth = buffers.axisWidth
        )
    }
}

/** Nucleo luminoso al centro: l'alone sfumato, più grande e intenso con i bassi. */
private fun DrawScope.drawNucleus(center: Offset, radius: Float, bass: Float, color: Color, buffers: CanonBuffers) {
    val glowRadius = (radius * (0.22f + 0.22f * bass)).toInt()
    drawImage(
        image = buffers.glowImage(color),
        srcOffset = IntOffset.Zero,
        srcSize = IntSize(GLOW_IMAGE_SIZE, GLOW_IMAGE_SIZE),
        dstOffset = IntOffset(center.x.toInt() - glowRadius, center.y.toInt() - glowRadius),
        dstSize = IntSize(glowRadius * 2, glowRadius * 2),
        alpha = 0.35f + 0.5f * bass,
        blendMode = BlendMode.Plus
    )
}

/** Anelli che partono dal centro sui colpi forti, più intensi per i colpi più netti. */
private fun DrawScope.drawRipples(
    center: Offset,
    radius: Float,
    t: Float,
    analysis: SongAnalysis,
    colors: List<Color>,
    buffers: CanonBuffers
) {
    val currentFrame = (t * SongAnalysis.FRAME_RATE).toInt()
    val firstFrame = currentFrame - (RIPPLE_LIFE_SEC * SongAnalysis.FRAME_RATE).toInt()
    var index = analysis.firstOnsetFrom(firstFrame)
    val count = analysis.onsetCount
    while (index < count) {
        val frame = analysis.onsetFrame(index)
        if (frame > currentFrame) break
        val age = t - frame.toFloat() / SongAnalysis.FRAME_RATE
        if (age >= 0f && age <= RIPPLE_LIFE_SEC) {
            val progress = age / RIPPLE_LIFE_SEC
            val fade = (1f - progress) * (1f - progress)
            val stroke = buffers.rippleStrokes[(progress * RIPPLE_STROKES).toInt().coerceIn(0, RIPPLE_STROKES - 1)]
            drawCircle(
                color = colors[index % colors.size].copy(alpha = 0.5f * fade * analysis.onsetStrength(index)),
                radius = radius * (0.15f + 1.0f * progress),
                center = center,
                style = stroke,
                blendMode = BlendMode.Plus
            )
        }
        index++
    }
}

/** Una voce: la scia sulla figura dietro la testa, in tratti sempre più accesi, e la testa luminosa. */
private fun DrawScope.drawVoice(
    head: Float,
    trailLength: Float,
    entry: Float,
    echo: Float,
    center: Offset,
    radius: Float,
    cosSpin: Float,
    sinSpin: Float,
    color: Color,
    buffers: CanonBuffers
) {
    val start = head - trailLength
    sampleShape(buffers.shape, start, trailLength / TRAIL_POINTS, TRAIL_POINTS + 1, buffers.trailX, buffers.trailY, buffers)
    for (chunk in 0 until TRAIL_CHUNKS) {
        val from = TRAIL_POINTS * chunk / TRAIL_CHUNKS
        val to = TRAIL_POINTS * (chunk + 1) / TRAIL_CHUNKS
        buildPath(buffers.path, buffers.trailX, buffers.trailY, from, to, center, radius, cosSpin, sinSpin)
        val strength = (chunk + 1).toFloat() / TRAIL_CHUNKS
        drawPath(
            path = buffers.path,
            color = color.copy(alpha = entry * (0.15f + 0.8f * strength * strength)),
            style = buffers.trailStrokes[chunk],
            blendMode = BlendMode.Plus
        )
    }
    val hx = buffers.trailX[TRAIL_POINTS]
    val hy = buffers.trailY[TRAIL_POINTS]
    val headPoint = Offset(
        center.x + radius * (hx * cosSpin - hy * sinSpin),
        center.y + radius * (hx * sinSpin + hy * cosSpin)
    )
    drawCircle(
        color = color.copy(alpha = entry * (0.12f + 0.3f * echo)),
        radius = (7f + 16f * echo) * buffers.dp,
        center = headPoint,
        blendMode = BlendMode.Plus
    )
    drawCircle(
        color = lerp(color, Color.White, 0.55f).copy(alpha = entry),
        radius = (2.5f + 3f * echo) * buffers.dp,
        center = headPoint,
        blendMode = BlendMode.Plus
    )
}

/** Energia media delle bande [fromBand]..[toBand] all'istante, filtrata con il filtro triangolare. */
private fun smoothedEnergy(analysis: SongAnalysis?, fromBand: Int, toBand: Int, timeSec: Float): Float {
    if (analysis == null) return 0f
    val step = 1f / SongAnalysis.FRAME_RATE
    var sum = 0f
    for (tap in -SMOOTH_TAPS..SMOOTH_TAPS) {
        val time = timeSec + tap * step
        var bands = 0f
        for (band in fromBand..toBand) bands += analysis.energyAt(band, time)
        sum += SMOOTH_WEIGHTS[tap + SMOOTH_TAPS] * bands
    }
    return sum / (toBand - fromBand + 1)
}
