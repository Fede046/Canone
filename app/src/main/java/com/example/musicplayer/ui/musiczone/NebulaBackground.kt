package com.example.musicplayer.ui.musiczone

import android.graphics.Bitmap
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.PointMode
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sqrt
import kotlin.random.Random

/** Il "nero" della Music Zone: un blu notte quasi nero, lo stesso della base della nebulosa. */
private val SPACE_COLOR = Color(0xFF05040C)

private const val NEBULA_FADE_MS = 1200
private const val STAR_SEED = 7

/** Gruppi di stelle: quante, grandezza in dp, colore. Le più numerose sono le più tenui. */
private val STAR_GROUPS = listOf(
    Triple(110, 1.1f, Color(0xFFC8D4FF).copy(alpha = 0.35f)),
    Triple(36, 1.7f, Color.White.copy(alpha = 0.6f)),
    Triple(10, 2.5f, Color(0xFFFFF1DC).copy(alpha = 0.9f))
)

/**
 * Sfondo della Music Zone: la nebulosa del brano (o il solo blu notte finché non è pronta),
 * che sfuma nella successiva al cambio brano, con un campo di stelle fisso davanti.
 * È statico: Compose lo ridisegna solo quando arriva una nebulosa nuova o cambia la dimensione,
 * non a ogni fotogramma del visualizzatore (che ha un livello proprio).
 */
@Composable
fun NebulaBackground(nebula: ImageBitmap?, modifier: Modifier = Modifier) {
    Box(modifier = modifier.background(SPACE_COLOR)) {
        Crossfade(
            targetState = nebula,
            animationSpec = tween(NEBULA_FADE_MS),
            modifier = Modifier.fillMaxSize(),
            label = "nebula"
        ) { image ->
            if (image != null) {
                Canvas(modifier = Modifier.fillMaxSize()) { drawCovering(image) }
            }
        }
        Spacer(
            modifier = Modifier
                .fillMaxSize()
                .drawWithCache {
                    // Posizioni ricalcolate solo quando cambia la dimensione (es. rotazione)
                    val random = Random(STAR_SEED)
                    val groups = STAR_GROUPS.map { (count, sizeDp, color) ->
                        val points = List(count) {
                            Offset(random.nextFloat() * size.width, random.nextFloat() * size.height)
                        }
                        Triple(points, sizeDp.dp.toPx(), color)
                    }
                    onDrawBehind {
                        for ((points, width, color) in groups) {
                            drawPoints(points, PointMode.Points, color, strokeWidth = width, cap = StrokeCap.Round)
                        }
                    }
                }
        )
    }
}

/** Disegna l'immagine quadrata ritagliata al centro in modo da coprire tutta l'area (verticale o orizzontale). */
private fun DrawScope.drawCovering(image: ImageBitmap) {
    val scale = max(size.width / image.width, size.height / image.height)
    val srcWidth = (size.width / scale).roundToInt().coerceIn(1, image.width)
    val srcHeight = (size.height / scale).roundToInt().coerceIn(1, image.height)
    drawImage(
        image = image,
        srcOffset = IntOffset((image.width - srcWidth) / 2, (image.height - srcHeight) / 2),
        srcSize = IntSize(srcWidth, srcHeight),
        dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt())
    )
}

/**
 * Generatore della nebulosa: nubi di gas nei colori della copertina su un fondo blu notte.
 *
 * Tre strati di luce, tutti da rumore frattale (fbm):
 * - un velo diffuso a bassa frequenza, che copre gran parte della scena;
 * - il gas, deformato da un altro rumore che lo stira in filamenti;
 * - i nuclei, i punti più densi del gas, nel terzo colore e un po' più bianchi.
 * Un altro rumore decide dove prevale il primo o il secondo colore, un altro ancora scava corsie
 * di polvere scura. La luce cala verso i bordi: in verticale restano più scuri l'alto e il basso,
 * in orizzontale i lati, cioè proprio dove stanno i comandi.
 *
 * Le soglie non sono fisse ma percentili dell'immagine stessa: ogni brano ha la stessa quantità
 * di gas, mai una nebulosa quasi vuota o tutta piena.
 *
 * L'immagine è quadrata e piccola ([SIZE] px, circa 400 KB): la nebulosa è morbida e si può
 * ingrandire senza perdere nulla, e va bene in entrambi gli orientamenti senza rigenerarla.
 * Stesso brano, stessa nebulosa (il seme è l'id del brano).
 */
internal object NebulaRenderer {
    private const val SIZE = 320
    private const val SCALE = 4f
    private const val WARP = 1.4f
    private const val VEIL_GAIN = 0.16f
    private const val GAS_GAIN = 0.5f
    private const val CORE_GAIN = 0.3f

    suspend fun render(colors: List<Color>, seed: Int): ImageBitmap = withContext(Dispatchers.Default) {
        // Primo passaggio: i campi di rumore (circa 1,6 MB, liberati alla fine)
        val count = SIZE * SIZE
        val veilField = FloatArray(count)
        val gasField = FloatArray(count)
        val hueField = FloatArray(count)
        val dustField = FloatArray(count)
        for (y in 0 until SIZE) {
            ensureActive() // cambio brano o uscita: si smette subito
            val py = (y + 0.5f) / SIZE * SCALE
            for (x in 0 until SIZE) {
                val px = (x + 0.5f) / SIZE * SCALE
                val i = y * SIZE + x
                val qx = fbm(px * 0.6f + 1.7f, py * 0.6f + 9.2f, seed, 3)
                val qy = fbm(px * 0.6f + 8.3f, py * 0.6f + 2.8f, seed + 7, 3)
                veilField[i] = qy
                gasField[i] = fbm(px + WARP * qx, py + WARP * qy, seed + 13, 5)
                hueField[i] = fbm(px * 0.4f + 4.4f, py * 0.4f + 6.6f, seed + 41, 3)
                dustField[i] = fbm(px * 1.5f + 5.1f, py * 1.5f + 3.3f, seed + 29, 4)
            }
        }
        val veil = percentiles(veilField, 0.15f, 0.85f)
        val gas = percentiles(gasField, 0.35f, 0.97f, 0.93f, 0.997f)
        val hue = percentiles(hueField, 0.25f, 0.75f)
        val dust = percentiles(dustField, 0.55f, 0.95f)

        // Secondo passaggio: i colori
        val first = colors.getOrElse(0) { Color(0xFFA855F7) }
        val second = colors.getOrElse(1) { first }
        val third = colors.getOrElse(2) { second }
        // Canali letti una volta sola: nel ciclo servono 300.000 volte
        val space = floatArrayOf(SPACE_COLOR.red, SPACE_COLOR.green, SPACE_COLOR.blue)
        val a = floatArrayOf(first.red, first.green, first.blue)
        val b = floatArrayOf(second.red, second.green, second.blue)
        val c = floatArrayOf(third.red, third.green, third.blue)
        val dither = Random(seed)
        val rgb = IntArray(3)
        val pixels = IntArray(count)
        for (y in 0 until SIZE) {
            ensureActive()
            val dy = (y + 0.5f) / SIZE - 0.5f
            for (x in 0 until SIZE) {
                val dx = (x + 0.5f) / SIZE - 0.5f
                val i = y * SIZE + x
                val fade = (1f - 0.7f * smoothstep(0.04f, 0.5f, dx * dx + dy * dy)) *
                    (1f - 0.5f * smoothstep(dust[0], dust[1], dustField[i]))
                val gasAmount = smoothstep(gas[0], gas[1], gasField[i]).let { it * sqrt(it) } // bordi tenui
                val light = (VEIL_GAIN * smoothstep(veil[0], veil[1], veilField[i]) + GAS_GAIN * gasAmount) * fade
                val core = smoothstep(gas[2], gas[3], gasField[i]).let { it * it } * fade
                val mix = smoothstep(hue[0], hue[1], hueField[i])
                for (ch in 0..2) {
                    // Fondo + velo e gas (fra primo e secondo colore) + nuclei (terzo colore, verso il bianco);
                    // mezzo livello di rumore contro le bande nelle sfumature scure
                    val value = space[ch] + light * (a[ch] + (b[ch] - a[ch]) * mix) +
                        core * (CORE_GAIN * c[ch] + 0.06f) + (dither.nextFloat() - 0.5f) / 255f
                    rgb[ch] = (value * 255f + 0.5f).toInt().coerceIn(0, 255)
                }
                pixels[i] = (0xFF shl 24) or (rgb[0] shl 16) or (rgb[1] shl 8) or rgb[2]
            }
        }
        Bitmap.createBitmap(pixels, SIZE, SIZE, Bitmap.Config.ARGB_8888).asImageBitmap()
    }

    /** Valori ai percentili richiesti (fra 0 e 1), stimati su un campione di un pixel ogni 7. */
    private fun percentiles(values: FloatArray, vararg fractions: Float): FloatArray {
        val sample = FloatArray((values.size + 6) / 7) { values[it * 7] }
        sample.sort()
        return FloatArray(fractions.size) { sample[(fractions[it] * (sample.size - 1)).toInt()] }
    }

    /** Rumore frattale: [octaves] strati di rumore, ognuno ruotato di circa 37° e a frequenza doppia. */
    private fun fbm(x0: Float, y0: Float, seed: Int, octaves: Int): Float {
        var x = x0
        var y = y0
        var sum = 0f
        var amplitude = 0.5f
        var total = 0f
        for (octave in 0 until octaves) {
            sum += amplitude * valueNoise(x, y, seed + octave * 31)
            total += amplitude
            val nx = 1.6f * x - 1.2f * y
            y = 1.2f * x + 1.6f * y
            x = nx
            amplitude *= 0.5f
        }
        return sum / total
    }

    /** Rumore a valori fra 0 e 1: valori casuali sui nodi della griglia, raccordati in modo morbido. */
    private fun valueNoise(x: Float, y: Float, seed: Int): Float {
        val x0 = floor(x)
        val y0 = floor(y)
        val xi = x0.toInt()
        val yi = y0.toInt()
        val fx = x - x0
        val fy = y - y0
        val u = fx * fx * (3f - 2f * fx)
        val v = fy * fy * (3f - 2f * fy)
        val a = lattice(xi, yi, seed)
        val b = lattice(xi + 1, yi, seed)
        val c = lattice(xi, yi + 1, seed)
        val d = lattice(xi + 1, yi + 1, seed)
        val top = a + (b - a) * u
        val bottom = c + (d - c) * u
        return top + (bottom - top) * v
    }

    /** Valore pseudo-casuale fra 0 e 1 di un nodo della griglia (hash intero, senza tabelle). */
    private fun lattice(x: Int, y: Int, seed: Int): Float {
        var h = x * 374761393 + y * 668265263 + seed * 144665
        h = (h xor (h ushr 13)) * 1274126177
        h = h xor (h ushr 16)
        return (h and 0xFFFFFF) / 16777216f
    }

    private fun smoothstep(edge0: Float, edge1: Float, x: Float): Float {
        val t = ((x - edge0) / (edge1 - edge0)).coerceIn(0f, 1f)
        return t * t * (3f - 2f * t)
    }
}
