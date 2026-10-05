package com.example.musicplayer.playback.analysis

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import java.io.Closeable
import java.nio.ByteOrder
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ensureActive

/** Chi riceve i campioni decodificati: mono, fra -1 e 1, alla frequenza indicata da [configure]. */
internal interface PcmSink {
    /** Chiamato prima dei campioni e a ogni cambio di formato (stessa frequenza: nessun effetto). */
    fun configure(sampleRate: Int)

    fun addSample(sample: Float)
}

/**
 * Decodifica la prima traccia audio di un file locale (MediaExtractor + MediaCodec) e la passa,
 * ridotta a mono, a un [PcmSink]. Usata dalle analisi di Music Zone e Circle Zone: niente
 * Visualizer di sistema, quindi niente permesso del microfono.
 */
internal class MonoDecoder private constructor(
    private val extractor: MediaExtractor,
    private val format: MediaFormat
) : Closeable {

    /** Durata dichiarata dal file (10 minuti se manca). */
    val durationUs: Long = if (format.containsKey(MediaFormat.KEY_DURATION))
        format.getLong(MediaFormat.KEY_DURATION) else 10L * 60 * 1_000_000

    private var codec: MediaCodec? = null

    /** Decodifica tutto il file; annullabile fra un buffer e l'altro. */
    suspend fun decode(sink: PcmSink) {
        val mime = format.getString(MediaFormat.KEY_MIME) ?: return
        var sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        var pcmEncoding = AudioFormat.ENCODING_PCM_16BIT
        val codec = MediaCodec.createDecoderByType(mime).apply {
            configure(format, null, null, 0)
            start()
        }
        this.codec = codec
        val info = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false
        while (!outputDone) {
            coroutineContext.ensureActive()
            // Riempie tutti i buffer d'ingresso liberi senza aspettare
            while (!inputDone) {
                val inIndex = codec.dequeueInputBuffer(0)
                if (inIndex < 0) break
                val inBuffer = codec.getInputBuffer(inIndex)!!
                val size = extractor.readSampleData(inBuffer, 0)
                if (size < 0) {
                    codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                    inputDone = true
                } else {
                    codec.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
                    extractor.advance()
                }
            }
            // Aspetta un'uscita solo se non c'è altro da fare
            val outIndex = codec.dequeueOutputBuffer(info, TIMEOUT_US)
            when {
                outIndex >= 0 -> {
                    val out = codec.getOutputBuffer(outIndex)!!
                    out.position(info.offset)
                    out.limit(info.offset + info.size)
                    out.order(ByteOrder.nativeOrder())
                    sink.configure(sampleRate)
                    if (pcmEncoding == AudioFormat.ENCODING_PCM_FLOAT) {
                        val floats = out.asFloatBuffer()
                        while (floats.remaining() >= channels) {
                            var sum = 0f
                            repeat(channels) { sum += floats.get() }
                            sink.addSample(sum / channels)
                        }
                    } else {
                        val shorts = out.asShortBuffer()
                        while (shorts.remaining() >= channels) {
                            var sum = 0f
                            repeat(channels) { sum += shorts.get() }
                            sink.addSample(sum / channels / 32768f)
                        }
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                }
                outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    val outFormat = codec.outputFormat
                    sampleRate = outFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    channels = outFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    if (outFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                        pcmEncoding = outFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
                    }
                }
            }
        }
    }

    override fun close() {
        codec?.let {
            try { it.stop() } catch (_: Exception) {}
            it.release()
        }
        extractor.release()
    }

    companion object {
        private const val TIMEOUT_US = 10_000L

        /** Apre il file e sceglie la prima traccia audio; null se non ce n'è nessuna. */
        fun open(audioPath: String): MonoDecoder? {
            val extractor = MediaExtractor()
            try {
                extractor.setDataSource(audioPath)
                val trackIndex = (0 until extractor.trackCount).firstOrNull { index ->
                    extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
                }
                if (trackIndex == null) {
                    extractor.release()
                    return null
                }
                extractor.selectTrack(trackIndex)
                return MonoDecoder(extractor, extractor.getTrackFormat(trackIndex))
            } catch (e: Exception) {
                extractor.release()
                throw e
            }
        }
    }
}
