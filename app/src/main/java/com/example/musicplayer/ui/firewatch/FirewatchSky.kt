package com.example.musicplayer.ui.firewatch

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.lerp
import java.time.ZonedDateTime
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Il momento della giornata per la Firewatch Zone, dall'orologio del telefono.
 *
 * Alba e tramonto si stimano senza posizione: il giorno dura 12 ore ± 3,3 a seconda della
 * stagione (circa come in Italia: 15 ore e mezza a fine giugno, 9 a fine dicembre) ed è centrato
 * sul mezzogiorno solare (12:15, un'ora dopo con l'ora legale).
 *
 * L'"altezza del sole" va da -1 (mezzanotte) a 1 (mezzogiorno) e sceglie fra sei colorazioni,
 * sfumando fra le vicine: notte, crepuscolo, tramonto (o alba, di mattina), ora dorata, giorno.
 */
internal class SkyState(
    val skyTop: Color,
    val skyHorizon: Color,
    /** Colorazione dell'immagine: identità di giorno, poi verso una sfumatura fra [shadows] e [lights]. */
    val imageMatrix: ColorMatrix,
    /** Frazione del percorso del sole da alba (0) a tramonto (1); fuori dal giorno, della luna. */
    val arc: Float,
    val isSun: Boolean,
    val bodyColor: Color,
    /** Quanto si vedono stelle e finestre accese (0 di giorno, 1 di notte). */
    val night: Float,
    val birdColor: Color,
    /** Il cielo in alto è scuro: i comandi vanno chiari. */
    val darkSky: Boolean
)

private class Palette(
    val altitude: Float,
    val skyTop: Color,
    val skyHorizon: Color,
    val amount: Float,
    val shadows: Color,
    val lights: Color,
    val body: Color,
    val bird: Color,
    val night: Float
)

private fun rgb(r: Int, g: Int, b: Int) = Color(r, g, b)

// Tarate su anteprime dell'immagine di riferimento (sera e mattina differiscono solo intorno al tramonto)
private val NIGHT = Palette(-0.25f, rgb(6, 10, 24), rgb(22, 36, 70), 0.90f, rgb(4, 7, 16), rgb(62, 84, 132), rgb(238, 236, 222), rgb(132, 148, 186), 1f)
private val DUSK = Palette(-0.08f, rgb(26, 26, 62), rgb(150, 92, 122), 0.82f, rgb(12, 10, 30), rgb(130, 104, 168), rgb(255, 176, 96), rgb(40, 26, 52), 0.6f)
private val SUNSET = Palette(0.04f, rgb(64, 72, 140), rgb(247, 152, 92), 0.70f, rgb(30, 14, 40), rgb(250, 172, 120), rgb(255, 176, 96), rgb(42, 22, 40), 0.15f)
private val DAWN = Palette(0.04f, rgb(72, 92, 162), rgb(250, 190, 162), 0.65f, rgb(30, 18, 48), rgb(250, 184, 172), rgb(255, 186, 120), rgb(42, 26, 52), 0.1f)
private val GOLDEN = Palette(0.20f, rgb(150, 182, 232), rgb(250, 226, 192), 0.35f, rgb(30, 22, 52), rgb(255, 228, 192), rgb(255, 236, 200), rgb(23, 37, 68), 0f)
private val DAY = Palette(0.40f, rgb(221, 231, 249), rgb(238, 244, 251), 0f, rgb(16, 27, 49), rgb(234, 241, 250), rgb(255, 246, 214), rgb(23, 37, 68), 0f)

internal object FirewatchSky {

    fun at(time: ZonedDateTime): SkyState {
        val hours = time.hour + time.minute / 60f + time.second / 3600f
        val dayOfYear = time.dayOfYear
        val dayLength = 12f + 3.3f * cos(2f * PI.toFloat() * (dayOfYear - 172) / 365f)
        val dst = time.zone.rules.isDaylightSavings(time.toInstant())
        val noon = 12.25f + if (dst) 1f else 0f
        val sunrise = noon - dayLength / 2f
        val sunset = noon + dayLength / 2f

        val isDay = hours in sunrise..sunset
        val arc: Float
        val altitude: Float
        if (isDay) {
            arc = (hours - sunrise) / dayLength
            altitude = sin(PI.toFloat() * arc)
        } else {
            val nightLength = 24f - dayLength
            val sinceSunset = ((hours - sunset) + 24f) % 24f
            arc = sinceSunset / nightLength
            altitude = -sin(PI.toFloat() * arc)
        }
        val morning = hours < noon
        val keys = listOf(NIGHT, DUSK, if (morning) DAWN else SUNSET, GOLDEN, DAY)
        // Interpolazione fra le due colorazioni vicine
        var low = keys.first()
        var high = keys.last()
        var f = 0f
        if (altitude <= keys.first().altitude) {
            low = keys.first(); high = keys.first()
        } else if (altitude >= keys.last().altitude) {
            low = keys.last(); high = keys.last()
        } else {
            for (i in 0 until keys.size - 1) {
                if (altitude <= keys[i + 1].altitude) {
                    low = keys[i]
                    high = keys[i + 1]
                    f = (altitude - low.altitude) / (high.altitude - low.altitude)
                    break
                }
            }
        }
        val skyTop = lerp(low.skyTop, high.skyTop, f)
        val amount = low.amount + (high.amount - low.amount) * f
        val night = low.night + (high.night - low.night) * f
        return SkyState(
            skyTop = skyTop,
            skyHorizon = lerp(low.skyHorizon, high.skyHorizon, f),
            imageMatrix = gradeMatrix(amount, lerp(low.shadows, high.shadows, f), lerp(low.lights, high.lights, f)),
            // Il sole si vede dall'alba al tramonto (e scende dietro le montagne), la luna di notte
            arc = arc,
            isSun = isDay,
            bodyColor = if (isDay) lerp(low.body, high.body, f) else NIGHT.body,
            night = night,
            birdColor = lerp(low.bird, high.bird, f),
            darkSky = skyTop.red * 0.3f + skyTop.green * 0.59f + skyTop.blue * 0.11f < 0.45f
        )
    }

    /**
     * (1 - k) × colore originale + k × mappa sfumata dalla luminanza: dalle ombre [shadows] alle luci
     * [lights]. È lineare, quindi una matrice di colore applicata al disegno (sulla GPU, senza copie).
     */
    private fun gradeMatrix(k: Float, shadows: Color, lights: Color): ColorMatrix {
        val weights = floatArrayOf(0.299f, 0.587f, 0.114f)
        val dark = floatArrayOf(shadows.red, shadows.green, shadows.blue)
        val light = floatArrayOf(lights.red, lights.green, lights.blue)
        val values = FloatArray(20)
        for (c in 0 until 3) {
            for (i in 0 until 3) {
                values[c * 5 + i] = (if (c == i) 1f - k else 0f) + k * (light[c] - dark[c]) * weights[i]
            }
            values[c * 5 + 4] = k * dark[c] * 255f
        }
        values[18] = 1f // alfa invariata
        return ColorMatrix(values)
    }
}
