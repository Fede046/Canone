package com.example.musicplayer.playback.analysis

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** FFT radix-2 iterativa, in place, per una dimensione fissa (potenza di 2) con le tabelle precalcolate. */
internal class Fft(private val size: Int) {
    init {
        require(size >= 2 && size and (size - 1) == 0) { "FFT size must be a power of 2" }
    }

    private val cosTable = FloatArray(size / 2) { cos(-2.0 * PI * it / size).toFloat() }
    private val sinTable = FloatArray(size / 2) { sin(-2.0 * PI * it / size).toFloat() }
    private val bitReverse = IntArray(size).also { table ->
        val bits = Integer.numberOfTrailingZeros(size)
        for (i in 0 until size) table[i] = Integer.reverse(i) ushr (32 - bits)
    }

    fun transform(re: FloatArray, im: FloatArray) {
        for (i in 0 until size) {
            val j = bitReverse[i]
            if (j > i) {
                val tr = re[i]; re[i] = re[j]; re[j] = tr
                val ti = im[i]; im[i] = im[j]; im[j] = ti
            }
        }
        var length = 2
        while (length <= size) {
            val half = length / 2
            val step = size / length
            var start = 0
            while (start < size) {
                for (k in 0 until half) {
                    val wr = cosTable[k * step]
                    val wi = sinTable[k * step]
                    val a = start + k
                    val b = a + half
                    val xr = re[b] * wr - im[b] * wi
                    val xi = re[b] * wi + im[b] * wr
                    re[b] = re[a] - xr
                    im[b] = im[a] - xi
                    re[a] += xr
                    im[a] += xi
                }
                start += length
            }
            length *= 2
        }
    }

    companion object {
        /** Finestra di Hann di [size] punti. */
        fun hann(size: Int) = FloatArray(size) { i -> (0.5 - 0.5 * cos(2.0 * PI * i / (size - 1))).toFloat() }
    }
}
