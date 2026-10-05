package com.example.musicplayer.ui.circlezone

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.CanvasDrawScope
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.example.musicplayer.playback.analysis.HarmonyResult
import com.example.musicplayer.playback.analysis.NoteTrack
import com.example.musicplayer.ui.musiczone.PlaybackClock
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

/*
 * La ruota della Circle Zone, ispirata a "Contrapunctus Acidus".
 *
 * Sette ettagoni concentrici, uno per ottava (dal più interno, Mi1-Si1, al bordo). Le sette note
 * della tonalità stanno nelle sette direzioni dei vertici (la tonica in alto, poi in senso orario);
 * le note alterate nella direzione della loro lettera, e si riconoscono dal nome in oro.
 * Ogni nota cade quindi su un angolo di un ettagono: la direzione è la nota, l'ettagono l'ottava.
 * Ogni voce disegna la sua melodia passando da angolo ad angolo; fra una nota e la successiva la
 * scia è un arco che si piega verso il centro. L'accordo in corso è un triangolo di terze
 * sull'ettagono esterno, gli ultimi accordi restano come triangoli sempre più tenui.
 *
 * Gli echi sono la melodia ripresa qualche battuta dopo e ruotata di k/7 di giro: trasposta di
 * k gradi della scala, come le voci di un canone. Nel brano non ci sono: sono un modo di guardarlo.
 */

private const val TWO_PI = (2 * PI).toFloat()
private const val WHEEL_RADIUS = 0.40f
private const val LABEL_RADIUS = 1.13f
private const val TRAIL_SEC = 2.6f
private const val MAX_SEGMENTS = 10
private const val GLIDE_SEC = 0.14f
/** Una pausa più lunga di così interrompe la scia; le più brevi no (il basso ritmato resta un disegno). */
private const val MAX_REST_BRIDGE_SEC = 1.5f
/** Quanto si piegano verso il centro gli archi (0 = fino al centro, 1 = corda dritta). */
private const val BOW = 0.55f
private const val GLOW_IMAGE_SIZE = 96
// ~30 fotogrammi al secondo, come la Music Zone
private const val FRAME_PAUSE_MS = 16L
private const val SYNC_INTERVAL_NANOS = 500_000_000L
/** Trasparenza dell'accordo in corso e dei tre precedenti. */
private val CHORD_ALPHAS = floatArrayOf(0.85f, 0.30f, 0.14f, 0.06f, 0f)

/** Centro e raggio della ruota in un'area: li usano sia la griglia sia il disegno animato. */
private fun wheelRadius(size: Size): Float = min(size.width, size.height) * WHEEL_RADIUS

/** Angolo (radianti) di una posizione sulla ruota: 0 = in alto, poi in senso orario. */
private fun angleOf(position: Float): Float = -PI.toFloat() / 2f + position * TWO_PI / 7f

/** Distanza dal centro dell'ettagono [ring], in frazioni del raggio: da 0,16 (il più interno) a 1 (il bordo). */
private fun ringFraction(ring: Int): Float = 0.16f + ring * (0.84f / (WheelLayout.RING_COUNT - 1))

/**
 * Ruota completa: griglia statica sotto, disegno animato sopra (con un livello proprio, così a
 * ogni fotogramma si registra di nuovo solo lui). Anima solo mentre [isPlaying] è vero e la
 * schermata è visibile; in pausa resta fermo sull'ultimo istante.
 */
@Composable
internal fun CircleWheel(
    layout: WheelLayout?,
    isPlaying: Boolean,
    songKey: String?,
    positionMsProvider: () -> Long,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier) {
        WheelGrid(Modifier.fillMaxSize())
        if (layout != null) {
            WheelDrawing(layout, isPlaying, songKey, positionMsProvider, Modifier.fillMaxSize())
        }
    }
}

/**
 * Cerchio, un ettagono per ottava con un puntino su ogni angolo (i punti dove possono cadere
 * le note), raggi verso i vertici e un alone al centro.
 */
@Composable
private fun WheelGrid(modifier: Modifier) {
    Spacer(
        modifier = modifier.drawWithCache {
            val center = Offset(size.width / 2f, size.height / 2f)
            val radius = wheelRadius(size)
            val glow = Brush.radialGradient(
                colors = listOf(CzColors.CenterGlow, Color.Transparent),
                center = center,
                radius = radius * 1.25f
            )
            fun corner(vertex: Int, ring: Int): Offset {
                val angle = angleOf(vertex.toFloat())
                val distance = radius * ringFraction(ring)
                return Offset(center.x + cos(angle) * distance, center.y + sin(angle) * distance)
            }
            val rings = List(WheelLayout.RING_COUNT) { ring ->
                Path().apply {
                    for (vertex in 0..7) {
                        val point = corner(vertex % 7, ring)
                        if (vertex == 0) moveTo(point.x, point.y) else lineTo(point.x, point.y)
                    }
                }
            }
            val thin = Stroke(width = 0.8.dp.toPx())
            val cornerRadius = 1.4.dp.toPx()
            onDrawBehind {
                drawCircle(brush = glow, radius = radius * 1.25f, center = center)
                drawCircle(CzColors.Grid, radius = radius, center = center, style = Stroke(width = 1.dp.toPx()))
                for (ring in rings.indices) {
                    drawPath(rings[ring], CzColors.Grid.copy(alpha = if (ring == rings.size - 1) 0.8f else 0.45f), style = thin)
                }
                for (vertex in 0 until 7) {
                    drawLine(
                        CzColors.Grid.copy(alpha = 0.5f),
                        start = corner(vertex, 0),
                        end = corner(vertex, WheelLayout.RING_COUNT - 1),
                        strokeWidth = 0.8.dp.toPx()
                    )
                    for (ring in 0 until WheelLayout.RING_COUNT) {
                        drawCircle(CzColors.Grid, radius = cornerRadius, center = corner(vertex, ring))
                    }
                    drawCircle(CzColors.Grid, radius = 2.dp.toPx(), center = corner(vertex, WheelLayout.RING_COUNT - 1))
                }
            }
        }
    )
}

/** Pennelli, percorsi e immagini riusati a ogni fotogramma: nel disegno non si alloca nulla. */
private class WheelBuffers(density: Density) {
    val path = Path()
    val voiceStroke = Stroke(width = with(density) { 2.6.dp.toPx() }, cap = StrokeCap.Butt)
    val echoStroke = Stroke(width = with(density) { 1.8.dp.toPx() }, cap = StrokeCap.Butt)
    val bloomStroke = Stroke(width = with(density) { 9.dp.toPx() }, cap = StrokeCap.Butt)
    val chordWidth = with(density) { 1.3.dp.toPx() }
    val dp = density.density
    private val glows = HashMap<Color, ImageBitmap>()

    /** Alone di una testa: una piccola immagine con la sfumatura, disegnata una volta per colore. */
    fun glow(color: Color): ImageBitmap = glows.getOrPut(color) {
        val image = ImageBitmap(GLOW_IMAGE_SIZE, GLOW_IMAGE_SIZE)
        val half = GLOW_IMAGE_SIZE / 2f
        CanvasDrawScope().draw(Density(1f), LayoutDirection.Ltr, Canvas(image), Size(GLOW_IMAGE_SIZE.toFloat(), GLOW_IMAGE_SIZE.toFloat())) {
            drawCircle(
                brush = Brush.radialGradient(
                    colorStops = arrayOf(0f to color, 0.3f to color.copy(alpha = 0.4f), 1f to Color.Transparent),
                    center = Offset(half, half),
                    radius = half
                ),
                radius = half,
                center = Offset(half, half)
            )
        }
        image
    }
}

/** Area di disegno corrente: centro e raggio, aggiornati a ogni fotogramma. */
private class WheelFrame {
    var center = Offset.Zero
    var radius = 0f

    /** Punto del vertice [vertex] (anche oltre 6: si gira), a [height] volte il raggio. */
    fun point(vertex: Int, height: Float = 1f): Offset {
        val angle = angleOf(vertex.toFloat())
        return Offset(center.x + cos(angle) * radius * height, center.y + sin(angle) * radius * height)
    }

    /** Angolo dell'ettagono [ring] nella direzione [vertex]. */
    fun corner(vertex: Int, ring: Int): Offset = point(vertex, ringFraction(ring))

    /** Punto di controllo dell'arco fra due punti: il punto medio, tirato verso il centro. */
    fun control(from: Offset, to: Offset): Offset {
        val mid = Offset((from.x + to.x) / 2f, (from.y + to.y) / 2f)
        return center + (mid - center) * BOW
    }
}

@Composable
private fun WheelDrawing(
    layout: WheelLayout,
    isPlaying: Boolean,
    songKey: String?,
    positionMsProvider: () -> Long,
    modifier: Modifier
) {
    val result = layout.result
    val clock = remember { PlaybackClock() }
    var frameNanos by remember { mutableLongStateOf(System.nanoTime()) }
    val lifecycleOwner = LocalLifecycleOwner.current
    val density = LocalDensity.current
    val buffers = remember(density) { WheelBuffers(density) }
    val frame = remember { WheelFrame() }
    val measurer = rememberTextMeasurer()
    // Tutti i nomi che possono comparire, misurati una volta per brano
    val labels = remember(layout, density) {
        val style = TextStyle(fontFamily = FontFamily.Serif, fontSize = 17.sp, color = Color.White)
        layout.allNames.associateWith { measurer.measure(it, style) }
    }

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

    Canvas(modifier = modifier.graphicsLayer()) {
        // frameNanos si legge solo qui: ogni fotogramma ridisegna senza ricomporre
        val t = clock.positionAt(frameNanos)
        frame.center = Offset(size.width / 2f, size.height / 2f)
        frame.radius = wheelRadius(size)
        val chordIndex = result.chords.indexAt(t)
        drawChords(layout, chordIndex, t, frame, buffers)

        // Voci del brano: basso, mezzo, melodia (la melodia sopra a tutto)
        val bass = HarmonyResult.BASS
        val middle = HarmonyResult.MIDDLE
        val melody = HarmonyResult.MELODY
        drawVoice(
            result.voices[bass], layout.voiceVertices[bass], layout.voiceRings[bass], t, 0,
            CzVoice.BASS.color, 1f, buffers.voiceStroke, frame, buffers
        )
        drawVoice(
            result.voices[middle], layout.voiceVertices[middle], layout.voiceRings[middle], t, 0,
            CzVoice.MIDDLE.color, 1f, buffers.voiceStroke, frame, buffers
        )
        // Echi: la melodia di qualche battuta fa, ruotata
        for (echo in CzVoice.echoes) {
            val source = t - echo.delayBars * result.barSec
            if (source <= 0f) continue
            val entry = (source / 1.5f).coerceAtMost(1f)
            drawVoice(
                result.voices[melody], layout.voiceVertices[melody], layout.voiceRings[melody], source, echo.rotation,
                echo.color, 0.8f * entry, buffers.echoStroke, frame, buffers
            )
        }
        drawVoice(
            result.voices[melody], layout.voiceVertices[melody], layout.voiceRings[melody], t, 0,
            CzVoice.MELODY.color, 1f, buffers.voiceStroke, frame, buffers
        )

        drawLabels(layout, chordIndex, t, frame, labels)
    }
}

/** L'accordo in corso (che compare in 0,35 s) e i tre precedenti, sempre più tenui. */
private fun DrawScope.drawChords(layout: WheelLayout, current: Int, t: Float, frame: WheelFrame, buffers: WheelBuffers) {
    if (current < 0) return
    val chords = layout.result.chords
    val fadeIn = ((t - chords.startSec[current]) / 0.35f).coerceIn(0f, 1f)
    for (back in 0..3) {
        val index = current - back
        if (index < 0) break
        val vertices = layout.chordVertices[index]
        if (vertices.isEmpty()) continue
        val alpha = if (back == 0) CHORD_ALPHAS[0] * fadeIn
        else CHORD_ALPHAS[back - 1] + (CHORD_ALPHAS[back] - CHORD_ALPHAS[back - 1]) * fadeIn
        if (alpha <= 0.005f) continue
        val color = CzColors.Chords.copy(alpha = alpha)
        for (i in vertices.indices) {
            drawLine(color, frame.point(vertices[i]), frame.point(vertices[(i + 1) % vertices.size]), strokeWidth = buffers.chordWidth)
        }
        if (back == 0) {
            for (vertex in vertices) drawCircle(Color.White.copy(alpha = fadeIn), radius = 3.5f * buffers.dp, center = frame.point(vertex))
        }
    }
}

/**
 * Una voce all'istante [t]: la scia delle ultime note (archi da angolo ad angolo degli ettagoni,
 * sempre più tenui con il tempo, anche attraverso le pause brevi) e la testa luminosa, che scivola verso la nota
 * nuova e si accende a ogni attacco, anche quando la nota si ripete.
 */
private fun DrawScope.drawVoice(
    track: NoteTrack,
    vertices: IntArray,
    rings: IntArray,
    t: Float,
    rotation: Int,
    color: Color,
    strength: Float,
    stroke: Stroke,
    frame: WheelFrame,
    buffers: WheelBuffers
) {
    val current = track.indexAt(t)
    if (current < 0 || strength <= 0f) return
    // Ultima nota suonata (la voce può essere in pausa)
    var last = current
    while (last >= 0 && vertices[last] < 0) last--
    if (last < 0) return

    // Scia: da ogni nota alla precedente suonata, finché la pausa in mezzo è breve
    var segments = 0
    var i = last
    while (i >= 1 && segments < MAX_SEGMENTS) {
        val age = t - track.startSec[i]
        if (age > TRAIL_SEC) break
        val previous = previousSounding(vertices, i)
        if (previous < 0) break
        // La pausa va dalla fine della nota precedente (inizio dell'evento dopo) a questa nota
        val rest = track.startSec[i] - track.startSec[previous + 1]
        if (rest > MAX_REST_BRIDGE_SEC) break
        if (vertices[previous] != vertices[i] || rings[previous] != rings[i]) {
            val fade = 1f - age / TRAIL_SEC
            val alpha = strength * fade * fade
            val progress = if (i == last) easeOut((age / GLIDE_SEC).coerceIn(0f, 1f)) else 1f
            buildArc(
                buffers.path,
                frame.corner(vertices[previous] + rotation, rings[previous]),
                frame.corner(vertices[i] + rotation, rings[i]),
                progress,
                frame
            )
            if (segments < 3) {
                // Bagliore solo sugli ultimi tre archi: costa poco e basta all'effetto
                drawPath(buffers.path, color.copy(alpha = alpha * 0.2f), style = buffers.bloomStroke, blendMode = BlendMode.Plus)
            }
            drawPath(buffers.path, color.copy(alpha = alpha), style = stroke, blendMode = BlendMode.Plus)
            segments++
        }
        i = previous
    }

    // Testa: sulla nota in corso, o che si spegne durante una pausa
    val age = t - track.startSec[last]
    val target = frame.corner(vertices[last] + rotation, rings[last])
    var head = target
    val previous = previousSounding(vertices, last)
    if (age < GLIDE_SEC && previous >= 0 && (vertices[previous] != vertices[last] || rings[previous] != rings[last])) {
        head = arcPoint(frame.corner(vertices[previous] + rotation, rings[previous]), target, easeOut(age / GLIDE_SEC), frame)
    }
    val headAlpha = if (last == current) strength
    else strength * (1f - (t - track.startSec[current]) / 0.6f).coerceAtLeast(0f)
    if (headAlpha <= 0f) return
    // Più grande appena la nota attacca
    val attack = exp(-age / 0.25f)
    val glowRadius = ((11f + 10f * attack) * buffers.dp).toInt()
    drawImage(
        image = buffers.glow(color),
        srcOffset = IntOffset.Zero,
        srcSize = IntSize(GLOW_IMAGE_SIZE, GLOW_IMAGE_SIZE),
        dstOffset = IntOffset(head.x.toInt() - glowRadius, head.y.toInt() - glowRadius),
        dstSize = IntSize(glowRadius * 2, glowRadius * 2),
        alpha = headAlpha * (0.5f + 0.5f * attack),
        blendMode = BlendMode.Plus
    )
    drawCircle(Color.White.copy(alpha = headAlpha), radius = 2.4f * buffers.dp, center = head)
}

/** Indice della nota suonata prima di [index] (saltando le pause), -1 se non c'è. */
private fun previousSounding(vertices: IntArray, index: Int): Int {
    var previous = index - 1
    while (previous >= 0 && vertices[previous] < 0) previous--
    return previous
}

/** Arco (Bézier quadratica tirata verso il centro) da [from] a [to], disegnato fino alla frazione [progress]. */
private fun buildArc(path: Path, from: Offset, to: Offset, progress: Float, frame: WheelFrame) {
    val control = frame.control(from, to)
    // De Casteljau: il primo tratto della curva fino a [progress] è ancora una quadratica
    val q0 = lerp(from, control, progress)
    val end = lerp(q0, lerp(control, to, progress), progress)
    path.reset()
    path.moveTo(from.x, from.y)
    path.quadraticBezierTo(q0.x, q0.y, end.x, end.y)
}

private fun arcPoint(from: Offset, to: Offset, progress: Float, frame: WheelFrame): Offset {
    val control = frame.control(from, to)
    return lerp(lerp(from, control, progress), lerp(control, to, progress), progress)
}

private fun lerp(a: Offset, b: Offset, f: Float) = Offset(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)

private fun easeOut(x: Float): Float = 1f - (1f - x) * (1f - x)

/**
 * Nomi intorno alla ruota, uno per vertice: la nota della scala, accesa se è nell'accordo o in una
 * voce. Se l'accordo o una voce usano la nota alterata di quel vertice, compare quella, in oro.
 */
private fun DrawScope.drawLabels(
    layout: WheelLayout,
    chordIndex: Int,
    t: Float,
    frame: WheelFrame,
    labels: Map<String, TextLayoutResult>
) {
    val speller = layout.speller
    val result = layout.result
    for (vertex in 0 until 7) {
        val scaleName = speller.scaleName(vertex)
        var name = scaleName
        var color = CzColors.TextSecondary.copy(alpha = 0.75f)
        // Prima le voci, poi l'accordo, che vince
        for (v in result.voices.indices) {
            val index = result.voices[v].indexAt(t)
            if (index >= 0 && layout.voiceVertices[v][index] == vertex) {
                name = layout.voiceNames[v][index]
                color = CzColors.TextPrimary.copy(alpha = 0.7f)
            }
        }
        if (chordIndex >= 0) {
            val vertices = layout.chordVertices[chordIndex]
            for (k in vertices.indices) {
                if (vertices[k] == vertex) {
                    name = layout.chordToneNames[chordIndex][k]
                    color = CzColors.TextPrimary
                }
            }
        }
        if (name != scaleName) color = CzColors.Accidental
        val text = labels[name] ?: continue
        val anchor = frame.point(vertex, LABEL_RADIUS)
        drawText(
            textLayoutResult = text,
            color = color,
            topLeft = Offset(anchor.x - text.size.width / 2f, anchor.y - text.size.height / 2f)
        )
    }
}
