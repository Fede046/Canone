package com.example.musicplayer.playback.analysis

import android.content.Context
import android.os.Process
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.log10

/**
 * Analisi di un brano per la Music Zone: energia di [BAND_COUNT] bande di frequenza,
 * [FRAME_RATE] volte al secondo, quantizzata su un byte (0..255, scala in dB).
 *
 * Mentre arrivano i fotogrammi calcola anche, in un solo passaggio:
 * - i colpi forti (picchi dell'aumento di energia sopra la media degli ultimi 2 secondi);
 * - i cambi di figura: al primo colpo forte dopo almeno [MIN_FIGURE_SEC] secondi,
 *   o comunque dopo [MAX_FIGURE_SEC] secondi;
 * - l'energia accumulata, che guida la velocità delle voci senza stato nel disegno.
 * Sono dati derivati solo dai byte grezzi: rileggendo la cache si ottiene lo stesso risultato.
 *
 * Viene riempita mentre l'analisi procede: chi legge usa solo i dati fino ai contatori.
 * Lo scrittore aggiorna prima gli array e poi i contatori (volatile), così chi legge
 * vede sempre dati completi.
 */
class SongAnalysis(
    val songId: String,
    initialCapacityFrames: Int
) {
    @Volatile
    private var data = ByteArray(initialCapacityFrames.coerceAtLeast(1) * BAND_COUNT)

    @Volatile
    var frameCount: Int = 0
        private set

    @Volatile
    var isComplete: Boolean = false
        private set

    // Livelli "basso" e "alto" di ogni banda (10° e 98° percentile), per portare l'energia su 0..1
    @Volatile
    private var low = FloatArray(BAND_COUNT) { 90f }

    @Volatile
    private var high = FloatArray(BAND_COUNT) { 200f }

    // Energia accumulata (secondi × energia 0..1) a ogni fotogramma: la velocità delle voci
    @Volatile
    private var cumulativeEnergy = FloatArray(initialCapacityFrames.coerceAtLeast(1))

    // Colpi forti: fotogramma e intensità (0..1), in ordine
    @Volatile
    private var onsetFrames = IntArray(256)

    @Volatile
    private var onsetStrengths = FloatArray(256)

    @Volatile
    var onsetCount: Int = 0
        private set

    // Fotogrammi in cui inizia una nuova figura (il primo è sempre 0)
    @Volatile
    private var figureChangeFrames = IntArray(32)

    @Volatile
    var figureChangeCount: Int = 1
        private set

    // Stato del rilevatore dei colpi (solo lo scrittore lo usa)
    private val fluxRing = FloatArray(FLUX_RING_SIZE)
    private var lastOnsetFrame = -GAP_FRAMES

    internal fun appendFrame(bandValues: ByteArray) {
        val index = frameCount
        var buffer = data
        if ((index + 1) * BAND_COUNT > buffer.size) {
            buffer = buffer.copyOf(buffer.size * 2)
            data = buffer
        }
        System.arraycopy(bandValues, 0, buffer, index * BAND_COUNT, BAND_COUNT)
        updateDerived(index, buffer)
        frameCount = index + 1
        if (frameCount % LEVELS_UPDATE_FRAMES == 0) updateLevels()
    }

    /** Aggiorna energia accumulata, colpi forti e cambi di figura con il fotogramma [frame]. */
    private fun updateDerived(frame: Int, buffer: ByteArray) {
        val base = frame * BAND_COUNT
        // Energia "fissa" (bassi e medi, senza normalizzazione: serve solo alla velocità)
        var lowMid = 0f
        for (band in 0 until 4) lowMid += buffer[base + band].toInt() and 0xFF
        val energy = ((lowMid / 4f - 100f) / 110f).coerceIn(0f, 1f)
        var cumulative = cumulativeEnergy
        if (frame >= cumulative.size) {
            cumulative = cumulative.copyOf(cumulative.size * 2)
            cumulativeEnergy = cumulative
        }
        cumulative[frame] = (if (frame > 0) cumulative[frame - 1] else 0f) + energy / FRAME_RATE

        // Aumento di energia rispetto al fotogramma prima, sommato sulle bande (unità dei byte)
        var flux = 0f
        if (frame > 0) {
            for (band in 0 until BAND_COUNT) {
                val rise = (buffer[base + band].toInt() and 0xFF) - (buffer[base - BAND_COUNT + band].toInt() and 0xFF)
                if (rise > 0) flux += rise
            }
        }
        fluxRing[frame and (FLUX_RING_SIZE - 1)] = flux

        // Il fotogramma precedente è un colpo se è un picco locale ben sopra la media recente
        val candidate = frame - 1
        if (candidate >= 1) {
            val candidateFlux = fluxRing[candidate and (FLUX_RING_SIZE - 1)]
            val previousFlux = fluxRing[(candidate - 1) and (FLUX_RING_SIZE - 1)]
            var sum = 0f
            val from = maxOf(0, candidate - FLUX_MEAN_FRAMES)
            for (f in from until candidate) sum += fluxRing[f and (FLUX_RING_SIZE - 1)]
            val mean = if (candidate > from) sum / (candidate - from) else 0f
            val isOnset = candidateFlux > maxOf(ONSET_RATIO * mean, ONSET_MIN_FLUX) &&
                candidateFlux >= previousFlux && candidateFlux > flux &&
                candidate - lastOnsetFrame >= GAP_FRAMES
            if (isOnset) {
                lastOnsetFrame = candidate
                addOnset(candidate, (candidateFlux / (3f * maxOf(mean, 8f))).coerceIn(0.3f, 1f))
                if (candidate - lastFigureChange() >= MIN_FIGURE_SEC * FRAME_RATE) addFigureChange(candidate)
            }
        }
        // Brano senza colpi netti: la figura cambia comunque
        if (frame - lastFigureChange() >= MAX_FIGURE_SEC * FRAME_RATE) addFigureChange(frame)
    }

    private fun addOnset(frame: Int, strength: Float) {
        val index = onsetCount
        var frames = onsetFrames
        var strengths = onsetStrengths
        if (index >= frames.size) {
            frames = frames.copyOf(frames.size * 2)
            strengths = strengths.copyOf(strengths.size * 2)
            onsetFrames = frames
            onsetStrengths = strengths
        }
        frames[index] = frame
        strengths[index] = strength
        onsetCount = index + 1
    }

    private fun lastFigureChange(): Int = figureChangeFrames[figureChangeCount - 1]

    private fun addFigureChange(frame: Int) {
        val index = figureChangeCount
        var frames = figureChangeFrames
        if (index >= frames.size) {
            frames = frames.copyOf(frames.size * 2)
            figureChangeFrames = frames
        }
        frames[index] = frame
        figureChangeCount = index + 1
    }

    internal fun markComplete() {
        updateLevels()
        isComplete = true
    }

    /** Ricalcola i percentili per banda con un istogramma dei byte (costo lineare, nessuna allocazione grande). */
    private fun updateLevels() {
        val count = frameCount
        if (count == 0) return
        val buffer = data
        val newLow = FloatArray(BAND_COUNT)
        val newHigh = FloatArray(BAND_COUNT)
        val histogram = IntArray(256)
        for (band in 0 until BAND_COUNT) {
            histogram.fill(0)
            for (frame in 0 until count) {
                histogram[buffer[frame * BAND_COUNT + band].toInt() and 0xFF]++
            }
            newLow[band] = percentile(histogram, count, 0.10f)
            newHigh[band] = maxOf(percentile(histogram, count, 0.98f), newLow[band] + 12f)
        }
        low = newLow
        high = newHigh
    }

    private fun percentile(histogram: IntArray, total: Int, fraction: Float): Float {
        val target = (total * fraction).toInt()
        var cumulative = 0
        for (value in 0 until 256) {
            cumulative += histogram[value]
            if (cumulative > target) return value.toFloat()
        }
        return 255f
    }

    /** Energia normalizzata (0..1) della banda al fotogramma indicato; 0 se non ancora analizzato. */
    fun energyAtFrame(band: Int, frame: Int): Float {
        if (frame < 0 || frame >= frameCount) return 0f
        val raw = (data[frame * BAND_COUNT + band].toInt() and 0xFF).toFloat()
        val lo = low[band]
        val hi = high[band]
        return ((raw - lo) / (hi - lo)).coerceIn(0f, 1f)
    }

    /** Livello grezzo della banda al fotogramma: dB + 100 su 0..255 (0 se non ancora analizzato). */
    fun levelAtFrame(band: Int, frame: Int): Int {
        if (frame < 0 || frame >= frameCount) return 0
        return data[frame * BAND_COUNT + band].toInt() and 0xFF
    }

    /** Energia normalizzata della banda all'istante (secondi), interpolata fra due fotogrammi. */
    fun energyAt(band: Int, timeSec: Float): Float {
        if (timeSec < 0f) return 0f
        val position = timeSec * FRAME_RATE
        val frame = position.toInt()
        val fraction = position - frame
        val a = energyAtFrame(band, frame)
        val b = energyAtFrame(band, frame + 1)
        return a + (b - a) * fraction
    }

    /** Energia accumulata all'istante (secondi × energia); oltre l'analisi resta all'ultimo valore. */
    fun accumulatedEnergyAt(timeSec: Float): Float {
        val count = frameCount
        if (count == 0 || timeSec <= 0f) return 0f
        val cumulative = cumulativeEnergy
        val position = timeSec * FRAME_RATE
        val frame = position.toInt()
        if (frame >= count - 1) return cumulative[count - 1]
        val a = cumulative[frame]
        return a + (cumulative[frame + 1] - a) * (position - frame)
    }

    /** Indice della figura in corso al fotogramma indicato (ricerca binaria sui cambi). */
    fun figureIndexAt(frame: Int): Int {
        val count = figureChangeCount
        val frames = figureChangeFrames
        var low = 0
        var high = count - 1
        while (low < high) {
            val mid = (low + high + 1) ushr 1
            if (frames[mid] <= frame) low = mid else high = mid - 1
        }
        return low
    }

    /** Fotogramma in cui è iniziata la figura [index]. */
    fun figureStartFrame(index: Int): Int = figureChangeFrames[index]

    /** Primo colpo forte con fotogramma >= [frame] (ricerca binaria); [onsetCount] se nessuno. */
    fun firstOnsetFrom(frame: Int): Int {
        val frames = onsetFrames
        var low = 0
        var high = onsetCount
        while (low < high) {
            val mid = (low + high) ushr 1
            if (frames[mid] < frame) low = mid + 1 else high = mid
        }
        return low
    }

    fun onsetFrame(index: Int): Int = onsetFrames[index]

    fun onsetStrength(index: Int): Float = onsetStrengths[index]

    internal fun writeTo(file: File) {
        file.parentFile?.mkdirs()
        val tmp = File(file.path + ".tmp")
        DataOutputStream(tmp.outputStream().buffered()).use { out ->
            out.writeInt(CACHE_MAGIC)
            out.writeInt(CACHE_VERSION)
            out.writeInt(FRAME_RATE)
            out.writeInt(BAND_COUNT)
            out.writeInt(frameCount)
            out.write(data, 0, frameCount * BAND_COUNT)
        }
        tmp.renameTo(file)
    }

    companion object {
        const val FRAME_RATE = 30
        const val BAND_COUNT = 6
        private const val LEVELS_UPDATE_FRAMES = FRAME_RATE * 10
        private const val CACHE_MAGIC = 0x4D5A5631 // "MZV1"
        // Versione 2: campionamento dimezzato (22 kHz) per l'analisi, banda alta fino a 10,5 kHz
        private const val CACHE_VERSION = 2

        /** Durata minima e massima di una figura, in secondi. */
        const val MIN_FIGURE_SEC = 8
        const val MAX_FIGURE_SEC = 16

        // Rilevatore dei colpi: media dell'aumento di energia sugli ultimi 2 s, picco 1,6 volte
        // sopra la media e almeno 12 (circa 5 dB sommati sulle bande), almeno 0,2 s fra due colpi
        private const val FLUX_RING_SIZE = 64
        private const val FLUX_MEAN_FRAMES = 60
        private const val ONSET_RATIO = 1.6f
        private const val ONSET_MIN_FLUX = 12f
        private const val GAP_FRAMES = 6

        /** Il file è una cache di questa versione (altrimenti è da rifare: la pulizia la cancella). */
        internal fun isCurrentCache(file: File): Boolean = hasHeader(file, CACHE_MAGIC, CACHE_VERSION)

        internal fun readFrom(songId: String, file: File): SongAnalysis? = try {
            DataInputStream(file.inputStream().buffered()).use { input ->
                if (input.readInt() != CACHE_MAGIC || input.readInt() != CACHE_VERSION) return null
                if (input.readInt() != FRAME_RATE || input.readInt() != BAND_COUNT) return null
                val frames = input.readInt()
                val analysis = SongAnalysis(songId, frames)
                val frame = ByteArray(BAND_COUNT)
                repeat(frames) {
                    input.readFully(frame)
                    analysis.appendFrame(frame)
                }
                analysis.markComplete()
                analysis
            }
        } catch (e: Exception) {
            Log.w("MusicAppDebug", "AudioAnalyzer: cache non leggibile per $songId", e)
            null
        }
    }
}

/**
 * Decodifica un MP3 locale ([MonoDecoder]) e ne calcola lo spettro per la Music Zone.
 * L'analisi gira su un solo thread a bassa priorità e il risultato finisce in cache su disco:
 * ogni brano si analizza una volta sola.
 */
@Singleton
class AudioAnalyzer @Inject constructor(
    @ApplicationContext private val context: Context
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    private val analysisDispatcher = Dispatchers.Default.limitedParallelism(1)

    /**
     * Restituisce subito (tramite [onReady]) l'oggetto dell'analisi, che si riempie mentre
     * la decodifica procede, molto più veloce della riproduzione. Annullabile: se la coroutine
     * viene cancellata (cambio brano, uscita dalla schermata) l'analisi parziale non va in cache.
     */
    suspend fun analyze(songId: String, audioPath: String, onReady: (SongAnalysis) -> Unit) {
        // Nessuna copia tenuta in memoria qui: uscendo dalla Music Zone l'analisi viene liberata,
        // e rileggerla dalla cache costa pochi millisecondi
        withContext(analysisDispatcher) {
            val cache = cacheFile(context, songId)
            if (cache.exists()) {
                SongAnalysis.readFrom(songId, cache)?.let {
                    withContext(Dispatchers.Main) { onReady(it) }
                    return@withContext
                }
            }
            val previousPriority = Process.getThreadPriority(Process.myTid())
            Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND)
            try {
                decodeAndAnalyze(songId, audioPath, onReady)?.writeTo(cache)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                Log.w("MusicAppDebug", "AudioAnalyzer: analisi non riuscita per $songId", e)
            } finally {
                Process.setThreadPriority(previousPriority)
            }
        }
    }

    private suspend fun decodeAndAnalyze(
        songId: String,
        audioPath: String,
        onReady: (SongAnalysis) -> Unit
    ): SongAnalysis? {
        val decoder = MonoDecoder.open(audioPath) ?: return null
        decoder.use {
            val estimatedFrames = (it.durationUs / 1_000_000.0 * SongAnalysis.FRAME_RATE).toInt() + SongAnalysis.FRAME_RATE
            val analysis = SongAnalysis(songId, estimatedFrames)
            withContext(Dispatchers.Main) { onReady(analysis) }
            it.decode(SpectrumAccumulator(analysis))
            analysis.markComplete()
            Log.d("MusicAppDebug", "AudioAnalyzer: $songId analizzato, ${analysis.frameCount} fotogrammi")
            return analysis
        }
    }

    companion object {
        /** File di cache dell'analisi di un brano (cancellato insieme al brano). */
        fun cacheFile(context: Context, songId: String): File = File(cacheDirectory(context), "$songId.mzv")

        /** Cartella delle cache della Music Zone (una per brano, chiamata con l'id). */
        fun cacheDirectory(context: Context): File = File(context.filesDir, "musiczone")
    }
}

/**
 * Raccoglie i campioni mono e, ogni 1/[SongAnalysis.FRAME_RATE] di secondo, calcola una FFT
 * da [FFT_SIZE] punti (finestra di Hann) e l'energia delle bande, in dB quantizzati su un byte.
 * Sopra i 32 kHz i campioni si mediano a coppie: a 22 kHz una FFT da 1024 punti ha la stessa
 * risoluzione (21,5 Hz) di una da 2048 a 44,1 kHz, con metà del lavoro.
 */
private class SpectrumAccumulator(private val analysis: SongAnalysis) : PcmSink {
    private val ring = FloatArray(FFT_SIZE)
    private var ringPos = 0
    private var samplesSinceFrame = 0
    private var hop = 0
    private var bandBins: Array<IntRange> = emptyArray()
    private var configuredRate = 0
    private var decimate = false
    private var pendingSample = 0f
    private var hasPending = false

    private val fft = Fft(FFT_SIZE)
    private val re = FloatArray(FFT_SIZE)
    private val im = FloatArray(FFT_SIZE)
    private val frameBytes = ByteArray(SongAnalysis.BAND_COUNT)

    override fun configure(sampleRate: Int) {
        if (sampleRate == configuredRate) return
        configuredRate = sampleRate
        decimate = sampleRate >= 32000
        val effectiveRate = if (decimate) sampleRate / 2 else sampleRate
        hop = effectiveRate / SongAnalysis.FRAME_RATE
        val binHz = effectiveRate.toFloat() / FFT_SIZE
        val maxHz = effectiveRate * 0.475f
        bandBins = Array(SongAnalysis.BAND_COUNT) { band ->
            val from = (minOf(BAND_EDGES_HZ[band], maxHz) / binHz).toInt().coerceAtLeast(1)
            val to = (minOf(BAND_EDGES_HZ[band + 1], maxHz) / binHz).toInt().coerceIn(from, FFT_SIZE / 2 - 1)
            from..to
        }
    }

    override fun addSample(sample: Float) {
        if (decimate) {
            // Media a coppie (filtro passa-basso minimo prima di dimezzare)
            if (!hasPending) {
                pendingSample = sample
                hasPending = true
                return
            }
            hasPending = false
            addEffectiveSample((pendingSample + sample) * 0.5f)
        } else {
            addEffectiveSample(sample)
        }
    }

    private fun addEffectiveSample(sample: Float) {
        ring[ringPos] = sample
        ringPos = (ringPos + 1) and (FFT_SIZE - 1)
        if (++samplesSinceFrame >= hop) {
            samplesSinceFrame = 0
            computeFrame()
        }
    }

    private fun computeFrame() {
        for (i in 0 until FFT_SIZE) {
            re[i] = ring[(ringPos + i) and (FFT_SIZE - 1)] * HANN[i]
            im[i] = 0f
        }
        fft.transform(re, im)
        val scale = 2f / FFT_SIZE
        for (band in 0 until SongAnalysis.BAND_COUNT) {
            val bins = bandBins[band]
            var power = 0f
            for (bin in bins) {
                val mr = re[bin] * scale
                val mi = im[bin] * scale
                power += mr * mr + mi * mi
            }
            power /= (bins.last - bins.first + 1)
            // -100..0 dB → 0..255
            val db = 10f * log10(power + 1e-12f)
            frameBytes[band] = (((db + 100f) / 100f) * 255f).toInt().coerceIn(0, 255).toByte()
        }
        analysis.appendFrame(frameBytes)
    }

    companion object {
        const val FFT_SIZE = 1024

        /** Limiti delle 6 bande: bassi, medio-bassi, medi, medio-alti, presenza, brillantezza (tagliata alla metà del campionamento). */
        private val BAND_EDGES_HZ = floatArrayOf(30f, 120f, 350f, 1000f, 2500f, 6000f, 16000f)

        private val HANN = Fft.hann(FFT_SIZE)
    }
}
