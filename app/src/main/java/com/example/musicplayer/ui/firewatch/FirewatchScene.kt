package com.example.musicplayer.ui.firewatch

import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.PointMode
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import com.example.musicplayer.R
import kotlin.math.PI
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

/*
 * La scena della Firewatch Zone: l'immagine di riferimento del programmatore (torretta, montagne e
 * boschi a strati di blu), preparata una volta fuori dall'app: cielo reso trasparente (con i bordi
 * delle montagne ripuliti dal suo colore) e stormo dipinto tolto, perché gli uccelli ora volano.
 *
 * Dietro l'immagine il cielo dell'ora del giorno, con stelle, sole o luna: passano dietro le
 * montagne. L'immagine si ricolora con una matrice di colore (alba, tramonto, notte...); di notte
 * le finestre della torretta si accendono.
 */

/** Colori fissi della scena. */
internal object FwColors {
    /** Le finestre accese di notte. */
    val WindowLight = Color(0xFFFFD27A)
    /** Comandi sul cielo chiaro di giorno. */
    val Ink = Color(0xFF172544)
}

/** Dove sta l'immagine sullo schermo, e dove il cielo. */
internal class ScenePlacement(val width: Float, val height: Float) {
    /** L'immagine copre tutta la larghezza e almeno il 62% dell'altezza. */
    val scale = max(width / IMAGE_WIDTH, height * IMAGE_SHARE / IMAGE_HEIGHT)
    val imageWidth = IMAGE_WIDTH * scale
    val imageHeight = IMAGE_HEIGHT * scale
    val left = (width - imageWidth) / 2f
    /** In verticale l'immagine sta in fondo; in orizzontale l'orizzonte sta a metà schermo e il bosco in basso si taglia. */
    val top = max(height - imageHeight, height * 0.45f - HORIZON_Y * scale)
    val horizonY = top + HORIZON_Y * scale

    /** Dove volano gli uccelli: dal cielo in alto fino a poco sopra le montagne. */
    val skyTop = height * 0.08f
    val skyBottom = max(skyTop + height * 0.08f, horizonY - height * 0.04f)
    /** Misura degli uccelli. */
    val unit = min(width, height)

    fun imagePoint(x: Float, y: Float) = Offset(left + x * scale, top + y * scale)

    companion object {
        const val IMAGE_WIDTH = 2000f
        const val IMAGE_HEIGHT = 1125f
        /** Riga dell'immagine dove il cielo incontra le montagne (mediana). */
        const val HORIZON_Y = 380f
        private const val IMAGE_SHARE = 0.62f

        /** Le quattro finestre della cabina, in pixel dell'immagine (left, top, right, bottom). */
        val WINDOWS = listOf(
            floatArrayOf(961f, 380f, 972f, 399f),
            floatArrayOf(979f, 380f, 990f, 399f),
            floatArrayOf(997f, 380f, 1008f, 399f),
            floatArrayOf(1014f, 380f, 1025f, 399f)
        )
    }
}

private const val STAR_COUNT = 150
private const val STAR_SEED = 5

/**
 * Sfondo: cielo, stelle, sole o luna, l'immagine ricolorata e le finestre accese.
 * Si ridisegna solo quando cambia il momento della giornata (una volta al minuto) o la dimensione.
 */
@Composable
internal fun FirewatchBackdrop(sky: SkyState, modifier: Modifier) {
    val image = ImageBitmap.imageResource(R.drawable.firewatch_scene)
    Spacer(
        modifier = modifier.drawWithCache {
            val placement = ScenePlacement(size.width, size.height)
            val skyBrush = Brush.verticalGradient(
                listOf(sky.skyTop, sky.skyHorizon),
                startY = 0f,
                endY = placement.horizonY
            )
            val random = Random(STAR_SEED)
            val stars = List(STAR_COUNT) {
                Offset(random.nextFloat() * size.width, random.nextFloat() * placement.horizonY)
            }
            // Sole e luna: un arco da sinistra a destra, che parte e finisce dietro le montagne
            val arc = sky.arc
            val body = Offset(
                size.width * (0.08f + 0.84f * arc),
                placement.horizonY + size.height * 0.05f - sin(PI.toFloat() * arc) * (placement.horizonY - size.height * 0.10f)
            )
            val bodyRadius = placement.unit * if (sky.isSun) 0.045f else 0.035f
            val glow = Brush.radialGradient(
                listOf(sky.bodyColor.copy(alpha = if (sky.isSun) 0.45f else 0.25f), Color.Transparent),
                center = body,
                radius = bodyRadius * 6f
            )
            val filter = ColorFilter.colorMatrix(sky.imageMatrix)
            val imageOffset = IntOffset(placement.left.roundToInt(), placement.top.roundToInt())
            val imageSize = IntSize(placement.imageWidth.roundToInt(), placement.imageHeight.roundToInt())
            val windowRects = ScenePlacement.WINDOWS.map { (l, t, r, b) ->
                placement.imagePoint(l, t) to Size((r - l) * placement.scale, (b - t) * placement.scale)
            }
            val starSize = max(1.5f, placement.unit * 0.0025f)

            onDrawBehind {
                drawRect(skyBrush)
                if (sky.night > 0.02f) {
                    drawPoints(stars, PointMode.Points, Color.White.copy(alpha = 0.8f * sky.night), strokeWidth = starSize, cap = StrokeCap.Round)
                }
                drawCircle(glow, radius = bodyRadius * 6f, center = body)
                drawCircle(sky.bodyColor, radius = bodyRadius, center = body)
                drawImage(image, dstOffset = imageOffset, dstSize = imageSize, colorFilter = filter)
                if (sky.night > 0.05f) {
                    for ((origin, rect) in windowRects) {
                        drawRect(FwColors.WindowLight.copy(alpha = 0.25f * sky.night), origin - Offset(rect.width * 0.4f, rect.height * 0.4f), Size(rect.width * 1.8f, rect.height * 1.8f))
                        drawRect(FwColors.WindowLight.copy(alpha = sky.night), origin, rect)
                    }
                }
            }
        }
    )
}
