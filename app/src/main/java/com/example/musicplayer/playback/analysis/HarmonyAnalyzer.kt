package com.example.musicplayer.playback.analysis

import android.content.Context
import android.os.Process
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.log2
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Dati grezzi dell'analisi armonica per la Circle Zone:
 * - l'energia di ognuno dei [NOTE_COUNT] semitoni da Mi1 a Re♯7, [FRAME_RATE] volte al secondo,
 *   in dB quantizzati su un byte;
 * - l'inviluppo degli attacchi (aumento di energia), [ENVELOPE_RATE] volte al secondo, per il tempo;
 * - gli stessi semitoni con una finestra lunga la metà, [BASS_FRAME_RATE] volte al secondo: meno
 *   precisa in frequenza ma più pronta, per seguire le linee di basso veloci.
 * Tutto il resto (tonalità, accordi, voci, tempo, sezioni) si ricava da qui in [HarmonyResult.derive]:
 * rileggendo la cache si ottiene lo stesso risultato.
 */
internal class HarmonyRaw(estimatedSeconds: Float) {
    var notes = ByteArray(((estimatedSeconds + 2f) * FRAME_RATE).toInt().coerceAtLeast(16) * NOTE_COUNT)
        private set
    var frameCount = 0
        private set
    var envelope = ByteArray(((estimatedSeconds + 2f) * ENVELOPE_RATE).toInt().coerceAtLeast(16))
        private set
    var envelopeCount = 0
        private set
    var bass = ByteArray(((estimatedSeconds + 2f) * BASS_FRAME_RATE).toInt().coerceAtLeast(16) * NOTE_COUNT)
        private set
    var bassFrameCount = 0
        private set

    fun appendNotes(values: ByteArray) {
        if ((frameCount + 1) * NOTE_COUNT > notes.size) notes = notes.copyOf(notes.size * 2)
        System.arraycopy(values, 0, notes, frameCount * NOTE_COUNT, NOTE_COUNT)
        frameCount++
    }

    fun appendEnvelope(value: Byte) {
        if (envelopeCount >= envelope.size) envelope = envelope.copyOf(envelope.size * 2)
        envelope[envelopeCount++] = value
    }

    fun appendBass(values: ByteArray) {
        if ((bassFrameCount + 1) * NOTE_COUNT > bass.size) bass = bass.copyOf(bass.size * 2)
        System.arraycopy(values, 0, bass, bassFrameCount * NOTE_COUNT, NOTE_COUNT)
        bassFrameCount++
    }

    /** Valore (0..255) del semitono [note] al fotogramma [frame]. */
    fun note(frame: Int, note: Int): Int = notes[frame * NOTE_COUNT + note].toInt() and 0xFF

    /** Valore (0..255) del semitono [note] al fotogramma [frame] della finestra corta. */
    fun bassNote(frame: Int, note: Int): Int = bass[frame * NOTE_COUNT + note].toInt() and 0xFF

    fun writeTo(file: File) {
        file.parentFile?.mkdirs()
        val tmp = File(file.path + ".tmp")
        DataOutputStream(tmp.outputStream().buffered()).use { out ->
            out.writeInt(CACHE_MAGIC)
            out.writeInt(CACHE_VERSION)
            out.writeInt(frameCount)
            out.write(notes, 0, frameCount * NOTE_COUNT)
            out.writeInt(envelopeCount)
            out.write(envelope, 0, envelopeCount)
            out.writeInt(bassFrameCount)
            out.write(bass, 0, bassFrameCount * NOTE_COUNT)
        }
        tmp.renameTo(file)
    }

    companion object {
        const val FRAME_RATE = 10
        const val ENVELOPE_RATE = 100
        const val BASS_FRAME_RATE = 20
        /** Primo semitono analizzato: Mi1 (MIDI 28, 41 Hz). */
        const val NOTE_LOW = 28
        const val NOTE_COUNT = 72
        private const val CACHE_MAGIC = 0x435A4831 // "CZH1"
        // Versione 2: finestra corta per i bassi
        private const val CACHE_VERSION = 2

        /** Il file è una cache di questa versione (altrimenti è da rifare: la pulizia la cancella). */
        fun isCurrentCache(file: File): Boolean = hasHeader(file, CACHE_MAGIC, CACHE_VERSION)

        fun readFrom(file: File): HarmonyRaw? = try {
            DataInputStream(file.inputStream().buffered()).use { input ->
                if (input.readInt() != CACHE_MAGIC || input.readInt() != CACHE_VERSION) return null
                val frames = input.readInt()
                val raw = HarmonyRaw(frames.toFloat() / FRAME_RATE)
                val frame = ByteArray(NOTE_COUNT)
                repeat(frames) {
                    input.readFully(frame)
                    raw.appendNotes(frame)
                }
                val envelopeFrames = input.readInt()
                repeat(envelopeFrames) { raw.appendEnvelope(input.readByte()) }
                val bassFrames = input.readInt()
                repeat(bassFrames) {
                    input.readFully(frame)
                    raw.appendBass(frame)
                }
                raw
            }
        } catch (e: Exception) {
            Log.w("MusicAppDebug", "HarmonyAnalyzer: cache non leggibile ${file.name}", e)
            null
        }
    }
}

/**
 * Analisi armonica di un brano locale per la Circle Zone. Come quella della Music Zone gira su
 * un solo thread a bassa priorità, solo mentre la schermata è aperta, e finisce in cache su disco:
 * ogni brano si analizza una volta sola. Annullabile: un'analisi parziale non va in cache.
 */
@Singleton
class HarmonyAnalyzer @Inject constructor(
    @ApplicationContext private val context: Context
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    private val analysisDispatcher = Dispatchers.Default.limitedParallelism(1)

    /**
     * Restituisce il risultato completo, o null se il file non si può decodificare.
     * [onProgress] (0..1, da un thread in background) segue la decodifica la prima volta.
     */
    suspend fun analyze(songId: String, audioPath: String, onProgress: (Float) -> Unit): HarmonyResult? =
        withContext(analysisDispatcher) {
            val cache = cacheFile(context, songId)
            if (cache.exists()) {
                HarmonyRaw.readFrom(cache)?.let { return@withContext HarmonyResult.derive(it) }
            }
            val previousPriority = Process.getThreadPriority(Process.myTid())
            Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND)
            try {
                val decoder = MonoDecoder.open(audioPath) ?: return@withContext null
                val raw = decoder.use {
                    val seconds = it.durationUs / 1_000_000f
                    val raw = HarmonyRaw(seconds)
                    var lastReported = -1
                    it.decode(HarmonyAccumulator(raw) { decodedSec ->
                        val percent = (decodedSec / seconds * 100f).toInt().coerceIn(0, 100)
                        if (percent != lastReported) {
                            lastReported = percent
                            onProgress(percent / 100f)
                        }
                    })
                    raw
                }
                raw.writeTo(cache)
                Log.d("MusicAppDebug", "HarmonyAnalyzer: $songId analizzato, ${raw.frameCount} fotogrammi")
                HarmonyResult.derive(raw)
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                Log.w("MusicAppDebug", "HarmonyAnalyzer: analisi non riuscita per $songId", e)
                null
            } finally {
                Process.setThreadPriority(previousPriority)
            }
        }

    companion object {
        /** File di cache dell'analisi armonica di un brano (cancellato insieme al brano). */
        fun cacheFile(context: Context, songId: String): File = File(cacheDirectory(context), "$songId.czh")

        /** Cartella delle cache della Circle Zone (una per brano, chiamata con l'id). */
        fun cacheDirectory(context: Context): File = File(context.filesDir, "circlezone")
    }
}

/**
 * Raccoglie i campioni mono, li porta a circa 11 kHz con un filtro passa-basso e calcola:
 * - [HarmonyRaw.FRAME_RATE] volte al secondo una FFT da [FFT_SIZE] punti (0,37 s, 2,7 Hz per bin:
 *   abbastanza per separare i semitoni dei bassi). Dei picchi dello spettro si stima la frequenza
 *   esatta (interpolazione parabolica) e la si assegna al semitono più vicino;
 * - [HarmonyRaw.ENVELOPE_RATE] volte al secondo l'aumento di energia in dB, per il tempo;
 * - [HarmonyRaw.BASS_FRAME_RATE] volte al secondo la stessa FFT con una finestra di [SHORT_WINDOW]
 *   punti (0,17 s, completata con zeri): per i bassi veloci.
 */
private class HarmonyAccumulator(
    private val raw: HarmonyRaw,
    private val onDecodedSeconds: (Float) -> Unit
) : PcmSink {
    private var inputRate = 0
    private var factor = 1
    private var rate = 0
    private var fir = FloatArray(1) { 1f }
    private var history = FloatArray(1)
    private var historyPos = 0
    private var phase = 0

    private val fft = Fft(FFT_SIZE)
    private val ring = FloatArray(FFT_SIZE)
    private var ringPos = 0
    private var hop = 0
    private var sinceFrame = 0
    private var bassHop = 0
    private var sinceBassFrame = 0
    private val re = FloatArray(FFT_SIZE)
    private val im = FloatArray(FFT_SIZE)
    private val magnitude = FloatArray(FFT_SIZE / 2)
    private val notePower = FloatArray(HarmonyRaw.NOTE_COUNT)
    private val noteBytes = ByteArray(HarmonyRaw.NOTE_COUNT)
    private var binHz = 1f
    private var binLow = 2
    private var binHigh = 3

    private var envelopeHop = 0
    private var envelopeCount = 0
    private var envelopeEnergy = 0f
    private var previousLogEnergy = Float.NaN

    override fun configure(sampleRate: Int) {
        if (sampleRate == inputRate) return
        inputRate = sampleRate
        factor = (sampleRate / TARGET_RATE.toFloat()).roundToInt().coerceAtLeast(1)
        rate = sampleRate / factor
        fir = if (factor > 1) lowPass(factor) else FloatArray(1) { 1f }
        history = FloatArray(Integer.highestOneBit(fir.size - 1).coerceAtLeast(1) * 2)
        historyPos = 0
        phase = 0
        hop = rate / HarmonyRaw.FRAME_RATE
        bassHop = rate / HarmonyRaw.BASS_FRAME_RATE
        envelopeHop = rate / HarmonyRaw.ENVELOPE_RATE
        binHz = rate.toFloat() / FFT_SIZE
        binLow = (midiToHz(HarmonyRaw.NOTE_LOW - 0.5f) / binHz).toInt().coerceAtLeast(2)
        binHigh = (midiToHz(HarmonyRaw.NOTE_LOW + HarmonyRaw.NOTE_COUNT - 0.5f) / binHz).toInt()
            .coerceAtMost(FFT_SIZE / 2 - 2)
    }

    override fun addSample(sample: Float) {
        if (factor == 1) {
            addDecimated(sample)
            return
        }
        val mask = history.size - 1
        history[historyPos] = sample
        historyPos = (historyPos + 1) and mask
        if (++phase < factor) return
        phase = 0
        // Filtro solo sui campioni che si tengono: 1 su [factor]
        var sum = 0f
        var index = historyPos - 1
        for (tap in fir.indices) {
            sum += fir[tap] * history[index and mask]
            index--
        }
        addDecimated(sum)
    }

    private fun addDecimated(sample: Float) {
        ring[ringPos] = sample
        ringPos = (ringPos + 1) and (FFT_SIZE - 1)

        envelopeEnergy += sample * sample
        if (++envelopeCount >= envelopeHop) {
            val logEnergy = 10f * log10(envelopeEnergy / envelopeCount + 1e-10f)
            val rise = if (previousLogEnergy.isNaN()) 0f else (logEnergy - previousLogEnergy).coerceAtLeast(0f)
            previousLogEnergy = logEnergy
            // 1/8 di dB per unità: fino a 32 dB in 10 ms
            raw.appendEnvelope((rise * 8f).toInt().coerceIn(0, 255).toByte())
            envelopeEnergy = 0f
            envelopeCount = 0
        }

        if (++sinceBassFrame >= bassHop) {
            sinceBassFrame = 0
            raw.appendBass(spectrumNotes(SHORT_WINDOW, HANN_SHORT))
        }
        if (++sinceFrame >= hop) {
            sinceFrame = 0
            raw.appendNotes(spectrumNotes(FFT_SIZE, HANN))
            onDecodedSeconds(raw.frameCount.toFloat() / HarmonyRaw.FRAME_RATE)
        }
    }

    /**
     * Energia dei semitoni negli ultimi [windowLength] campioni (finestra di Hann, completata con
     * zeri fino a [FFT_SIZE]): i picchi dello spettro, con la frequenza stimata per interpolazione.
     */
    private fun spectrumNotes(windowLength: Int, window: FloatArray): ByteArray {
        val start = ringPos + FFT_SIZE - windowLength
        for (i in 0 until FFT_SIZE) {
            re[i] = if (i < windowLength) ring[(start + i) and (FFT_SIZE - 1)] * window[i] else 0f
            im[i] = 0f
        }
        fft.transform(re, im)
        // Ampiezza di una sinusoide: |X| · 4 / N con la finestra di Hann (N = punti della finestra)
        val scale = 4f / windowLength
        var maxMagnitude = 0f
        for (k in binLow - 1..binHigh + 1) {
            val m = sqrt(re[k] * re[k] + im[k] * im[k]) * scale
            magnitude[k] = m
            if (m > maxMagnitude) maxMagnitude = m
        }
        notePower.fill(0f)
        val floor = maxMagnitude * PEAK_FLOOR
        for (k in binLow..binHigh) {
            val m = magnitude[k]
            if (m <= floor || m < magnitude[k - 1] || m < magnitude[k + 1]) continue
            // Picco: frequenza esatta per interpolazione parabolica sui logaritmi
            val a = ln(magnitude[k - 1] + 1e-12f)
            val b = ln(m + 1e-12f)
            val c = ln(magnitude[k + 1] + 1e-12f)
            val denominator = a - 2f * b + c
            val offset = if (denominator != 0f) (0.5f * (a - c) / denominator).coerceIn(-0.5f, 0.5f) else 0f
            val midi = hzToMidi((k + offset) * binHz)
            val nearest = midi.roundToInt()
            val deviation = abs(midi - nearest)
            val index = nearest - HarmonyRaw.NOTE_LOW
            if (deviation > MAX_DEVIATION || index !in 0 until HarmonyRaw.NOTE_COUNT) continue
            notePower[index] += m * m * (1f - deviation)
        }
        for (i in 0 until HarmonyRaw.NOTE_COUNT) {
            val db = 10f * log10(notePower[i] + 1e-12f)
            noteBytes[i] = ((db + 100f) * 2.55f).toInt().coerceIn(0, 255).toByte()
        }
        return noteBytes
    }

    companion object {
        const val FFT_SIZE = 4096
        const val SHORT_WINDOW = 2048
        const val TARGET_RATE = 11025
        /** Picchi sotto -50 dB rispetto al più forte: rumore. */
        private const val PEAK_FLOOR = 0.003f
        /** Oltre 0,42 semitoni dal più vicino un picco non è una nota intonata. */
        private const val MAX_DEVIATION = 0.42f

        private val HANN = Fft.hann(FFT_SIZE)
        private val HANN_SHORT = Fft.hann(SHORT_WINDOW)

        fun midiToHz(midi: Float): Float = 440f * 2f.pow((midi - 69f) / 12f)

        fun hzToMidi(hz: Float): Float = 69f + 12f * log2(hz / 440f)

        /**
         * Passa-basso a sinc finestrato (Hamming) per scendere di [factor] volte: taglio all'85%
         * della nuova frequenza di Nyquist, 16 coefficienti per ogni campione tenuto.
         */
        private fun lowPass(factor: Int): FloatArray {
            val taps = 16 * factor + 1
            val middle = taps / 2
            val cutoff = 0.425 / factor
            val h = FloatArray(taps) { n ->
                val x = (n - middle).toDouble()
                val sinc = if (x == 0.0) 2 * cutoff else sin(2 * PI * cutoff * x) / (PI * x)
                val window = 0.54 - 0.46 * cos(2 * PI * n / (taps - 1))
                (sinc * window).toFloat()
            }
            val total = h.sum()
            for (i in h.indices) h[i] /= total
            return h
        }
    }
}
