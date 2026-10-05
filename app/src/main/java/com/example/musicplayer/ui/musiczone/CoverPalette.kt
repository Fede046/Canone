package com.example.musicplayer.ui.musiczone

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.drawable.toBitmap
import androidx.palette.graphics.Palette
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.abs
import kotlin.random.Random

/**
 * Colori della Music Zone presi dalla copertina: le tinte principali, schiarite e saturate
 * quanto basta per risaltare sul nero. Senza copertina (o con una copertina grigia)
 * i colori sono casuali, ma sempre gli stessi per lo stesso brano.
 */
object CoverPalette {
    private const val COLOR_COUNT = 6
    private const val MIN_HUE_DISTANCE = 22f

    suspend fun extract(
        context: Context,
        songId: String,
        coverPath: String?,
        coverUrl: String?
    ): List<Color> {
        val bitmap = loadSmallBitmap(context, coverPath, coverUrl)
        val fromCover = bitmap?.let { withContext(Dispatchers.Default) { fromBitmap(it) } }.orEmpty()
        return completeWithRandom(fromCover, songId)
    }

    /** Copertina ridotta a 96 px tramite Coil (cache condivisa con il resto dell'app). */
    private suspend fun loadSmallBitmap(context: Context, coverPath: String?, coverUrl: String?): Bitmap? {
        val model: Any = when {
            !coverPath.isNullOrBlank() && withContext(Dispatchers.IO) { File(coverPath).exists() } -> File(coverPath)
            !coverUrl.isNullOrBlank() -> coverUrl
            else -> return null
        }
        val request = ImageRequest.Builder(context)
            .data(model)
            .size(96)
            .allowHardware(false) // Palette deve leggere i pixel
            .build()
        val result = context.imageLoader.execute(request) as? SuccessResult ?: return null
        return result.drawable.toBitmap()
    }

    private fun fromBitmap(bitmap: Bitmap): List<Color> {
        val palette = Palette.from(bitmap).maximumColorCount(16).generate()
        val swatches = listOfNotNull(
            palette.vibrantSwatch,
            palette.lightVibrantSwatch,
            palette.darkVibrantSwatch,
            palette.mutedSwatch,
            palette.lightMutedSwatch,
            palette.dominantSwatch
        ) + palette.swatches.sortedByDescending { it.population }

        val hues = mutableListOf<FloatArray>()
        for (swatch in swatches) {
            val hsl = swatch.hsl.copyOf()
            if (hsl[1] < 0.18f) continue // grigi e quasi-grigi: sul nero non dicono nulla
            if (hues.any { hueDistance(it[0], hsl[0]) < MIN_HUE_DISTANCE }) continue
            hues += hsl
            if (hues.size == COLOR_COUNT) break
        }
        return hues.map { glowOnBlack(it[0], it[1]) }
    }

    /**
     * Completa la lista fino a [COLOR_COUNT]: con almeno un colore dalla copertina aggiunge
     * varianti di tinta vicine; senza, genera tinte casuali (seme = id del brano) ben distanziate.
     */
    private fun completeWithRandom(colors: List<Color>, songId: String): List<Color> {
        if (colors.size >= COLOR_COUNT) return colors
        val result = colors.toMutableList()
        val random = Random(songId.hashCode())
        if (result.isEmpty()) {
            var hue = random.nextFloat() * 360f
            repeat(COLOR_COUNT) {
                result += glowOnBlack(hue, 0.65f + random.nextFloat() * 0.25f)
                hue = (hue + 137.5f) % 360f // angolo aureo: tinte sempre ben separate
            }
        } else {
            val base = FloatArray(3)
            ColorUtils.colorToHSL(result.first().toArgb(), base)
            var step = 1
            while (result.size < COLOR_COUNT) {
                val offset = if (step % 2 == 1) 30f * ((step + 1) / 2) else -30f * (step / 2)
                result += glowOnBlack((base[0] + offset + 360f) % 360f, base[1].coerceAtLeast(0.5f))
                step++
            }
        }
        return result
    }

    private fun glowOnBlack(hue: Float, saturation: Float): Color {
        val argb = ColorUtils.HSLToColor(floatArrayOf(hue, saturation.coerceIn(0.5f, 0.95f), 0.62f))
        return Color(argb)
    }

    private fun hueDistance(a: Float, b: Float): Float {
        val d = abs(a - b) % 360f
        return if (d > 180f) 360f - d else d
    }
}
