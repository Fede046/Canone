package com.example.musicplayer.playback.analysis

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Tonalità: tonica (classe di altezza 0..11, 0 = Do) e modo. */
data class MusicKey(val tonic: Int, val isMinor: Boolean) {
    /** Le sette classi di altezza della scala (maggiore o minore naturale), dalla tonica. */
    val scale: IntArray = (if (isMinor) MINOR_STEPS else MAJOR_STEPS).map { (tonic + it) % 12 }.toIntArray()

    /** Grado (0..6) della classe di altezza, o -1 se non è nella scala. */
    fun degreeOf(pitchClass: Int): Int = scale.indexOf(Math.floorMod(pitchClass, 12))

    companion object {
        val MAJOR_STEPS = intArrayOf(0, 2, 4, 5, 7, 9, 11)
        val MINOR_STEPS = intArrayOf(0, 2, 3, 5, 7, 8, 10)
    }
}

/** Accordi riconosciuti, in ordine: inizio (secondi), fondamentale (0..11) e qualità. */
class ChordTrack(val startSec: FloatArray, val root: IntArray, val quality: IntArray) {
    val size get() = startSec.size

    /** Indice dell'accordo in corso all'istante, -1 prima del primo. */
    fun indexAt(timeSec: Float): Int = lastStartBefore(startSec, timeSec)

    // Calcolate una volta: il disegno le chiede a ogni fotogramma
    private val toneTable = Array(startSec.size) { index ->
        val intervals = when (quality[index]) {
            MAJOR -> MAJOR_TRIAD
            MINOR -> MINOR_TRIAD
            DIMINISHED -> DIMINISHED_TRIAD
            else -> null
        }
        if (intervals == null) IntArray(0) else IntArray(3) { (root[index] + intervals[it]) % 12 }
    }

    /** Classi di altezza dell'accordo [index] (vuoto per "nessun accordo"). Da non modificare. */
    fun tones(index: Int): IntArray = toneTable[index]

    companion object {
        const val NONE = -1
        const val MAJOR = 0
        const val MINOR = 1
        const val DIMINISHED = 2
        internal val MAJOR_TRIAD = intArrayOf(0, 4, 7)
        internal val MINOR_TRIAD = intArrayOf(0, 3, 7)
        internal val DIMINISHED_TRIAD = intArrayOf(0, 3, 6)
    }
}

/** Note di una voce, in ordine: inizio (secondi) e nota MIDI ([REST] = pausa). */
class NoteTrack(val startSec: FloatArray, val midi: IntArray) {
    val size get() = startSec.size

    fun indexAt(timeSec: Float): Int = lastStartBefore(startSec, timeSec)

    companion object {
        const val REST = -1
    }
}

/** Sezioni del brano: inizio (secondi) e carattere ([OPENING], [DEVELOPMENT], ...). */
class SectionTrack(val startSec: FloatArray, val kind: IntArray) {
    val size get() = startSec.size

    fun indexAt(timeSec: Float): Int = lastStartBefore(startSec, timeSec).coerceAtLeast(0)

    companion object {
        const val OPENING = 0
        const val DEVELOPMENT = 1
        const val CALM = 2
        const val CLIMAX = 3
        const val RETURN = 4
        const val CLOSING = 5
    }
}

/**
 * Tutto ciò che la Circle Zone ricava dall'audio. È una stima: il brano è una registrazione,
 * non una partitura. Tonalità e accordi vengono dai profili delle 12 classi di altezza, le voci
 * dalla nota più forte di tre registri (basso, mezzo, acuto), il tempo dall'autocorrelazione
 * degli attacchi, le sezioni dai cambi di colore armonico ed energia.
 */
class HarmonyResult internal constructor(
    val durationSec: Float,
    val key: MusicKey,
    /** Battiti al minuto stimati; 0 se il brano non ha un battito riconoscibile. */
    val tempoBpm: Float,
    val firstBeatSec: Float,
    val chords: ChordTrack,
    /** Voci: [BASS], [MIDDLE], [MELODY]. */
    val voices: List<NoteTrack>,
    val sections: SectionTrack
) {
    /** Battuta (da 1) e movimento (1..4) all'istante, in 4/4; null senza tempo. */
    fun barAt(timeSec: Float): Pair<Int, Int>? {
        if (tempoBpm <= 0f || timeSec < firstBeatSec) return null
        val beat = ((timeSec - firstBeatSec) * tempoBpm / 60f).toInt()
        return Pair(beat / 4 + 1, beat % 4 + 1)
    }

    /** Durata di una battuta in secondi (4 movimenti); 2 s senza tempo. */
    val barSec: Float get() = if (tempoBpm > 0f) 240f / tempoBpm else 2f

    companion object {
        const val BASS = 0
        const val MIDDLE = 1
        const val MELODY = 2

        private const val FPS = HarmonyRaw.FRAME_RATE
        /** La finestra della FFT (0,37 s) finisce al fotogramma: il suo centro è circa 0,18 s prima. */
        private const val ANALYSIS_LAG_SEC = 0.18f
        /** Lo stesso per la finestra corta dei bassi (0,17 s). */
        private const val BASS_LAG_SEC = 0.09f

        /** Profili di Krumhansl-Kessler: quanto ogni grado "appartiene" alla tonalità. */
        private val MAJOR_PROFILE = floatArrayOf(6.35f, 2.23f, 3.48f, 2.33f, 4.38f, 4.09f, 2.52f, 5.19f, 2.39f, 3.66f, 2.29f, 2.88f)
        private val MINOR_PROFILE = floatArrayOf(6.33f, 2.68f, 3.52f, 5.38f, 2.60f, 3.53f, 2.54f, 4.75f, 3.98f, 2.69f, 3.34f, 3.17f)

        // Riconoscimento accordi
        private const val CHORD_SMOOTH = 2 // ±2 fotogrammi: 0,5 s
        private const val BASS_ROOT_BONUS = 0.12f
        private const val DIATONIC_BONUS = 0.05f
        private const val NO_CHORD_SCORE = 0.45f
        private const val CHORD_SWITCH_PENALTY = 0.18f
        private const val MIN_CHORD_FRAMES = 4

        // Voci: registri in semitoni dall'inizio dell'analisi (Mi1)
        private val VOICE_RANGES = arrayOf(0 until 24, 24 until 48, 48 until 72)
        private const val VOICE_ACTIVITY = 0.45f
        private const val MIN_NOTE_FRAMES = 2
        /** Fondamentali candidate per il basso: da Mi1 a Fa♯3. */
        private const val BASS_CANDIDATES = 27
        /** Armoniche 1..6 in semitoni sopra la fondamentale, e il loro peso. */
        private val HARMONIC_OFFSETS = intArrayOf(0, 12, 19, 24, 28, 31)
        private val HARMONIC_WEIGHTS = floatArrayOf(1f, 0.8f, 0.6f, 0.5f, 0.4f, 0.35f)

        // Sezioni
        private const val SECTION_KERNEL_SEC = 8
        private const val SECTION_MIN_SEC = 12
        private const val MAX_SECTIONS = 9

        internal fun derive(raw: HarmonyRaw): HarmonyResult {
            val frames = raw.frameCount
            val duration = frames.toFloat() / FPS
            if (frames < FPS * 2) {
                return HarmonyResult(
                    duration, MusicKey(0, false), 0f, 0f,
                    ChordTrack(FloatArray(0), IntArray(0), IntArray(0)),
                    List(3) { NoteTrack(FloatArray(0), IntArray(0)) },
                    SectionTrack(floatArrayOf(0f), intArrayOf(SectionTrack.OPENING))
                )
            }
            val salience = salience(raw)
            val chroma = Array(3) { band -> bandChroma(salience, frames, VOICE_RANGES[band]) }
            // Colore armonico complessivo: tutti i registri, l'acuto un po' meno (armonici)
            val full = Array(frames) { f -> FloatArray(12) { pc -> chroma[0][f][pc] + chroma[1][f][pc] + 0.8f * chroma[2][f][pc] } }
            val key = detectKey(full)
            val chords = detectChords(full, chroma[BASS], key)
            val (bpm, firstBeat) = detectTempo(raw)
            val voices = List(3) { band ->
                if (band == BASS) detectBass(raw) else detectVoice(salience, frames, VOICE_RANGES[band])
            }
            val sections = detectSections(full, salience, frames)
            return HarmonyResult(duration, key, bpm, firstBeat, chords, voices, sections)
        }

        private fun frameTime(frame: Int): Float = ((frame + 1f) / FPS - ANALYSIS_LAG_SEC).coerceAtLeast(0f)

        private fun bassFrameTime(frame: Int): Float =
            ((frame + 1f) / HarmonyRaw.BASS_FRAME_RATE - BASS_LAG_SEC).coerceAtLeast(0f)

        /**
         * Rilievo di ogni semitono (0..1) rispetto al più forte del fotogramma, su 60 unità
         * (circa 24 dB). I fotogrammi molto più piani delle parti forti del brano valgono zero.
         */
        private fun salience(raw: HarmonyRaw): Array<FloatArray> {
            val frames = raw.frameCount
            val levels = IntArray(frames) { f -> (0 until HarmonyRaw.NOTE_COUNT).maxOf { raw.note(f, it) } }
            val loud = levels.sorted()[(frames * 0.9f).toInt().coerceAtMost(frames - 1)]
            return Array(frames) { f ->
                val level = levels[f]
                if (level < loud - 40) FloatArray(HarmonyRaw.NOTE_COUNT)
                else FloatArray(HarmonyRaw.NOTE_COUNT) { n -> ((raw.note(f, n) - (level - 60)) / 60f).coerceAtLeast(0f) }
            }
        }

        private fun bandChroma(salience: Array<FloatArray>, frames: Int, range: IntRange): Array<FloatArray> =
            Array(frames) { f ->
                val chroma = FloatArray(12)
                for (n in range) chroma[(n + HarmonyRaw.NOTE_LOW) % 12] += salience[f][n]
                chroma
            }

        /** Tonalità con la correlazione più alta fra il colore armonico totale e i 24 profili. */
        private fun detectKey(full: Array<FloatArray>): MusicKey {
            val total = FloatArray(12)
            for (frame in full) for (pc in 0 until 12) total[pc] += frame[pc]
            var best = MusicKey(0, false)
            var bestScore = -2f
            for (tonic in 0 until 12) {
                for (minor in listOf(false, true)) {
                    val profile = if (minor) MINOR_PROFILE else MAJOR_PROFILE
                    val score = correlation(total) { pc -> profile[Math.floorMod(pc - tonic, 12)] }
                    if (score > bestScore) {
                        bestScore = score
                        best = MusicKey(tonic, minor)
                    }
                }
            }
            return best
        }

        private inline fun correlation(values: FloatArray, other: (Int) -> Float): Float {
            val meanA = values.average().toFloat()
            var meanB = 0f
            for (i in 0 until 12) meanB += other(i)
            meanB /= 12f
            var cov = 0f
            var varA = 0f
            var varB = 0f
            for (i in 0 until 12) {
                val a = values[i] - meanA
                val b = other(i) - meanB
                cov += a * b
                varA += a * a
                varB += b * b
            }
            return if (varA <= 0f || varB <= 0f) 0f else cov / sqrt(varA * varB)
        }

        /**
         * Accordi: per ogni fotogramma il colore armonico (mediato su 0,5 s) si confronta con le triadi
         * maggiori, minori e diminuite sulle 12 fondamentali, con un piccolo vantaggio se il basso
         * suona la fondamentale e se l'accordo è della tonalità. Il percorso migliore (Viterbi) paga
         * ogni cambio di accordo, così gli accordi non tremolano.
         */
        private fun detectChords(full: Array<FloatArray>, bass: Array<FloatArray>, key: MusicKey): ChordTrack {
            val frames = full.size
            val candidates = ArrayList<IntArray>() // (fondamentale, qualità)
            for (root in 0 until 12) for (quality in 0..2) candidates += intArrayOf(root, quality)
            val templates = candidates.map { (root, quality) ->
                val vector = FloatArray(12)
                val intervals = when (quality) {
                    ChordTrack.MAJOR -> ChordTrack.MAJOR_TRIAD
                    ChordTrack.MINOR -> ChordTrack.MINOR_TRIAD
                    else -> ChordTrack.DIMINISHED_TRIAD
                }
                for (interval in intervals) vector[(root + interval) % 12] = 1f / sqrt(3f)
                vector
            }
            val diatonic = diatonicChords(key)
            val bonus = FloatArray(candidates.size) { c ->
                val (root, quality) = candidates[c]
                (if (root * 3 + quality in diatonic) DIATONIC_BONUS else 0f) -
                    (if (quality == ChordTrack.DIMINISHED) 0.04f else 0f)
            }
            val states = candidates.size + 1 // l'ultimo stato è "nessun accordo"
            val none = candidates.size

            // Punteggi
            val scores = Array(frames) { FloatArray(states) }
            val smooth = FloatArray(12)
            val smoothBass = FloatArray(12)
            for (f in 0 until frames) {
                smooth.fill(0f)
                smoothBass.fill(0f)
                for (g in max(0, f - CHORD_SMOOTH)..min(frames - 1, f + CHORD_SMOOTH)) {
                    for (pc in 0 until 12) {
                        smooth[pc] += full[g][pc]
                        smoothBass[pc] += bass[g][pc]
                    }
                }
                val norm = sqrt(smooth.sumOf { (it * it).toDouble() }).toFloat()
                val bassMax = smoothBass.max()
                val row = scores[f]
                if (norm < 1e-3f) {
                    row.fill(-1f)
                    row[none] = 1f
                    continue
                }
                for (c in candidates.indices) {
                    var dot = 0f
                    val template = templates[c]
                    for (pc in 0 until 12) dot += smooth[pc] * template[pc]
                    val root = candidates[c][0]
                    val bassOnRoot = if (bassMax > 0f) smoothBass[root] / bassMax else 0f
                    row[c] = dot / norm + BASS_ROOT_BONUS * bassOnRoot + bonus[c]
                }
                row[none] = NO_CHORD_SCORE
            }

            // Viterbi con penalità uniforme per ogni cambio
            val back = Array(frames) { IntArray(states) }
            var previous = scores[0].copyOf()
            for (f in 1 until frames) {
                var bestState = 0
                for (s in 1 until states) if (previous[s] > previous[bestState]) bestState = s
                val switchScore = previous[bestState] - CHORD_SWITCH_PENALTY
                val current = FloatArray(states)
                for (s in 0 until states) {
                    if (previous[s] >= switchScore) {
                        current[s] = previous[s] + scores[f][s]
                        back[f][s] = s
                    } else {
                        current[s] = switchScore + scores[f][s]
                        back[f][s] = bestState
                    }
                }
                previous = current
            }
            val path = IntArray(frames)
            var state = 0
            for (s in 1 until states) if (previous[s] > previous[state]) state = s
            for (f in frames - 1 downTo 0) {
                path[f] = state
                state = back[f][state]
            }

            // Segmenti; quelli troppo corti si uniscono al precedente
            val starts = ArrayList<Int>()
            val labels = ArrayList<Int>()
            for (f in 0 until frames) {
                if (labels.isEmpty() || path[f] != labels.last()) {
                    if (starts.isNotEmpty() && f - starts.last() < MIN_CHORD_FRAMES && labels.size > 1) {
                        starts.removeAt(starts.size - 1)
                        labels.removeAt(labels.size - 1)
                        if (path[f] == labels.last()) continue
                    }
                    starts += f
                    labels += path[f]
                }
            }
            return ChordTrack(
                FloatArray(starts.size) { frameTime(starts[it]) },
                IntArray(labels.size) { if (labels[it] == none) 0 else candidates[labels[it]][0] },
                IntArray(labels.size) { if (labels[it] == none) ChordTrack.NONE else candidates[labels[it]][1] }
            )
        }

        /** Triadi della tonalità (fondamentale × 3 + qualità), più dominante maggiore e settima diminuita in minore. */
        private fun diatonicChords(key: MusicKey): Set<Int> {
            val result = HashSet<Int>()
            val scale = key.scale
            for (degree in 0 until 7) {
                val root = scale[degree]
                val third = Math.floorMod(scale[(degree + 2) % 7] - root, 12)
                val fifth = Math.floorMod(scale[(degree + 4) % 7] - root, 12)
                val quality = when {
                    third == 4 && fifth == 7 -> ChordTrack.MAJOR
                    third == 3 && fifth == 7 -> ChordTrack.MINOR
                    third == 3 && fifth == 6 -> ChordTrack.DIMINISHED
                    else -> continue
                }
                result += root * 3 + quality
            }
            if (key.isMinor) {
                result += ((key.tonic + 7) % 12) * 3 + ChordTrack.MAJOR
                result += ((key.tonic + 11) % 12) * 3 + ChordTrack.DIMINISHED
            }
            return result
        }

        /**
         * Tempo: autocorrelazione dell'inviluppo degli attacchi fra 50 e 200 battiti al minuto,
         * con una preferenza per i tempi vicini a 115; fase: la griglia di battiti che cade
         * sugli attacchi più forti.
         */
        private fun detectTempo(raw: HarmonyRaw): Pair<Float, Float> {
            val count = raw.envelopeCount
            val rate = HarmonyRaw.ENVELOPE_RATE
            if (count < rate * 8) return Pair(0f, 0f)
            val envelope = FloatArray(count) { (raw.envelope[it].toInt() and 0xFF).toFloat() }
            // Toglie la media locale (0,5 s): restano gli attacchi
            val window = rate / 2
            val detrended = FloatArray(count)
            var sum = 0f
            for (i in 0 until count) {
                sum += envelope[i]
                if (i >= window) sum -= envelope[i - window]
                val mean = sum / min(i + 1, window)
                detrended[i] = (envelope[i] - mean).coerceAtLeast(0f)
            }
            val minLag = rate * 60 / 200
            val maxLag = rate * 60 / 50
            val autocorrelation = FloatArray(maxLag + 2)
            for (lag in minLag - 1..maxLag + 1) {
                var acc = 0f
                for (i in 0 until count - lag) acc += detrended[i] * detrended[i + lag]
                autocorrelation[lag] = acc / (count - lag)
            }
            var bestLag = -1
            var bestScore = 0f
            for (lag in minLag..maxLag) {
                val bpm = 60f * rate / lag
                val octaves = ln(bpm / 115f) / ln(2f)
                val prior = exp(-0.5f * (octaves / 0.6f) * (octaves / 0.6f))
                val score = autocorrelation[lag] * prior
                if (score > bestScore) {
                    bestScore = score
                    bestLag = lag
                }
            }
            if (bestLag < 0 || bestScore <= 1e-4f) return Pair(0f, 0f)
            // Picco raffinato con una parabola
            val a = autocorrelation[bestLag - 1]
            val b = autocorrelation[bestLag]
            val c = autocorrelation[bestLag + 1]
            val denominator = a - 2f * b + c
            val period = bestLag + if (denominator != 0f) (0.5f * (a - c) / denominator).coerceIn(-0.5f, 0.5f) else 0f
            // Fase: la griglia con più attacchi
            var bestPhase = 0
            var bestPhaseScore = -1f
            for (phase in 0 until period.toInt()) {
                var acc = 0f
                var position = phase.toFloat()
                while (position < count) {
                    acc += detrended[position.roundToInt().coerceAtMost(count - 1)]
                    position += period
                }
                if (acc > bestPhaseScore) {
                    bestPhaseScore = acc
                    bestPhase = phase
                }
            }
            return Pair(60f * rate / period, bestPhase.toFloat() / rate)
        }

        /**
         * Voce di mezzo e melodia: in ogni fotogramma la nota più forte del registro, se è abbastanza
         * forte rispetto a quanto suona di solito quel registro.
         */
        private fun detectVoice(salience: Array<FloatArray>, frames: Int, range: IntRange): NoteTrack {
            val pitch = IntArray(frames) { NoteTrack.REST }
            val strength = FloatArray(frames)
            for (f in 0 until frames) {
                var best = -1
                var bestValue = 0f
                for (n in range) {
                    if (salience[f][n] > bestValue) {
                        bestValue = salience[f][n]
                        best = n
                    }
                }
                pitch[f] = best
                strength[f] = bestValue
            }
            val active = strength.filter { it > 0f }.sorted()
            if (active.isEmpty()) return NoteTrack(FloatArray(0), IntArray(0))
            val typical = active[(active.size * 0.9f).toInt().coerceAtMost(active.size - 1)]
            for (f in 0 until frames) if (strength[f] < VOICE_ACTIVITY * typical) pitch[f] = NoteTrack.REST
            return buildTrack(pitch) { frameTime(it) }
        }

        /**
         * Basso: dalla finestra corta (20 volte al secondo). Ogni candidata fondamentale da Mi1 a Fa♯3
         * raccoglie l'energia delle sue prime sei armoniche (somma armonica): così vince la nota che
         * ha tutta la serie, non un armonico isolato (la quinta sopra, l'ottava) o il colpo della cassa.
         * Vale solo se la fondamentale stessa si sente, e se il registro basso suona abbastanza.
         */
        private fun detectBass(raw: HarmonyRaw): NoteTrack {
            val frames = raw.bassFrameCount
            if (frames == 0) return NoteTrack(FloatArray(0), IntArray(0))
            // Ampiezza compressa (radice): nessun picco domina la somma
            val amplitude = Array(frames) { f ->
                FloatArray(HarmonyRaw.NOTE_COUNT) { n -> 10f.pow((raw.bassNote(f, n) / 2.55f - 100f) / 40f) }
            }
            val levels = IntArray(frames) { f -> (0 until HarmonyRaw.NOTE_COUNT).maxOf { raw.bassNote(f, it) } }
            val loud = levels.sorted()[(frames * 0.9f).toInt().coerceAtMost(frames - 1)]
            val pitch = IntArray(frames) { NoteTrack.REST }
            val strength = FloatArray(frames)
            for (f in 0 until frames) {
                if (levels[f] < loud - 40) continue
                val row = amplitude[f]
                var best = -1
                var bestValue = 0f
                for (n in 0 until BASS_CANDIDATES) {
                    var sum = 0f
                    for (h in HARMONIC_OFFSETS.indices) {
                        val index = n + HARMONIC_OFFSETS[h]
                        if (index < HarmonyRaw.NOTE_COUNT) sum += HARMONIC_WEIGHTS[h] * row[index]
                    }
                    if (sum > bestValue) {
                        bestValue = sum
                        best = n
                    }
                }
                var bassMax = 0f
                for (n in 0 until 24) bassMax = max(bassMax, row[n])
                if (best >= 0 && row[best] >= 0.5f * bassMax) {
                    pitch[f] = best
                    strength[f] = bestValue
                }
            }
            val active = strength.filter { it > 0f }.sorted()
            if (active.isEmpty()) return NoteTrack(FloatArray(0), IntArray(0))
            val typical = active[(active.size * 0.9f).toInt().coerceAtMost(active.size - 1)]
            for (f in 0 until frames) if (strength[f] < VOICE_ACTIVITY * typical) pitch[f] = NoteTrack.REST
            return buildTrack(pitch) { bassFrameTime(it) }
        }

        /**
         * Dalle note fotogramma per fotogramma alla voce: un filtro mediano toglie i lampi di un
         * fotogramma, le note più corte di [MIN_NOTE_FRAMES] fotogrammi si uniscono alla precedente.
         */
        private inline fun buildTrack(pitch: IntArray, time: (Int) -> Float): NoteTrack {
            val frames = pitch.size
            // Mediano su 3 fotogrammi
            val filtered = IntArray(frames) { f ->
                if (f == 0 || f == frames - 1) pitch[f]
                else {
                    val a = pitch[f - 1]
                    val b = pitch[f]
                    val c = pitch[f + 1]
                    if (a == c) a else b
                }
            }
            val starts = ArrayList<Int>()
            val notes = ArrayList<Int>()
            var f = 0
            while (f < frames) {
                var end = f
                while (end + 1 < frames && filtered[end + 1] == filtered[f]) end++
                val length = end - f + 1
                val note = filtered[f]
                if (length < MIN_NOTE_FRAMES && notes.isNotEmpty()) {
                    // Troppo corta: prolunga la precedente
                } else if (notes.isEmpty() || notes.last() != note) {
                    starts += f
                    notes += note
                }
                f = end + 1
            }
            return NoteTrack(
                FloatArray(starts.size) { time(starts[it]) },
                IntArray(notes.size) { if (notes[it] < 0) NoteTrack.REST else notes[it] + HarmonyRaw.NOTE_LOW }
            )
        }

        /**
         * Sezioni: ogni secondo un descrittore (colore armonico ed energia); la novità è alta dove
         * il prima e il dopo si somigliano dentro ma non fra loro (nucleo a scacchiera di Foote
         * sulla matrice delle somiglianze). Poi a ogni sezione un carattere.
         */
        private fun detectSections(full: Array<FloatArray>, salience: Array<FloatArray>, frames: Int): SectionTrack {
            val seconds = frames / FPS
            if (seconds < SECTION_MIN_SEC * 3) return SectionTrack(floatArrayOf(0f), intArrayOf(SectionTrack.OPENING))
            val energy = FloatArray(seconds)
            val features = Array(seconds) { s ->
                val vector = FloatArray(13)
                for (f in s * FPS until (s + 1) * FPS) {
                    for (pc in 0 until 12) vector[pc] += full[f][pc]
                    energy[s] += salience[f].sum()
                }
                vector
            }
            val maxEnergy = energy.max().coerceAtLeast(1e-6f)
            for (s in 0 until seconds) {
                val vector = features[s]
                val norm = sqrt((0 until 12).sumOf { (vector[it] * vector[it]).toDouble() }).toFloat().coerceAtLeast(1e-6f)
                for (pc in 0 until 12) vector[pc] /= norm
                vector[12] = energy[s] / maxEnergy
            }
            fun similarity(a: Int, b: Int): Float {
                var dot = 0f
                for (pc in 0 until 12) dot += features[a][pc] * features[b][pc]
                return dot - abs(features[a][12] - features[b][12])
            }
            val k = SECTION_KERNEL_SEC
            val novelty = FloatArray(seconds)
            for (i in k until seconds - k) {
                var value = 0f
                for (a in -k until k) for (b in -k until k) {
                    val sign = if ((a < 0) == (b < 0)) 1f else -1f
                    val weight = exp(-((a + 0.5f) * (a + 0.5f) + (b + 0.5f) * (b + 0.5f)) / (2f * k * k / 4f))
                    value += sign * weight * similarity(i + a, i + b)
                }
                novelty[i] = value
            }
            val mean = novelty.average().toFloat()
            val deviation = sqrt(novelty.map { (it - mean) * (it - mean) }.average()).toFloat()
            val peaks = (k until seconds - k).filter { i ->
                novelty[i] > mean + 0.6f * deviation &&
                    (max(0, i - SECTION_MIN_SEC / 2)..min(seconds - 1, i + SECTION_MIN_SEC / 2)).all { novelty[it] <= novelty[i] }
            }.sortedByDescending { novelty[it] }
            val boundaries = ArrayList<Int>()
            for (peak in peaks) {
                if (boundaries.size >= MAX_SECTIONS - 1) break
                if (boundaries.all { abs(it - peak) >= SECTION_MIN_SEC }) boundaries += peak
            }
            boundaries.sort()
            val starts = listOf(0) + boundaries
            val ends = boundaries + seconds

            // Carattere: energia media e colore armonico di ogni sezione
            val sectionEnergy = FloatArray(starts.size) { i -> (starts[i] until ends[i]).map { features[it][12] }.average().toFloat() }
            val sectionColor = Array(starts.size) { i ->
                FloatArray(12) { pc -> (starts[i] until ends[i]).sumOf { features[it][pc].toDouble() }.toFloat() }
            }
            val averageEnergy = sectionEnergy.average().toFloat()
            val loudest = sectionEnergy.indices.maxByOrNull { sectionEnergy[it] } ?: 0
            val kinds = IntArray(starts.size) { i ->
                val returns = (1 until i).any { j ->
                    cosine(sectionColor[i], sectionColor[j]) > 0.97f && abs(sectionEnergy[i] - sectionEnergy[j]) < 0.08f
                }
                when {
                    i == 0 -> SectionTrack.OPENING
                    i == starts.size - 1 && starts.size >= 3 -> SectionTrack.CLOSING
                    returns -> SectionTrack.RETURN
                    i == loudest && sectionEnergy[i] > averageEnergy * 1.05f -> SectionTrack.CLIMAX
                    sectionEnergy[i] < averageEnergy * 0.9f -> SectionTrack.CALM
                    else -> SectionTrack.DEVELOPMENT
                }
            }
            return SectionTrack(FloatArray(starts.size) { starts[it].toFloat() }, kinds)
        }

        private fun cosine(a: FloatArray, b: FloatArray): Float {
            var dot = 0f
            var na = 0f
            var nb = 0f
            for (i in a.indices) {
                dot += a[i] * b[i]
                na += a[i] * a[i]
                nb += b[i] * b[i]
            }
            return if (na <= 0f || nb <= 0f) 0f else dot / sqrt(na * nb)
        }
    }
}

/** Ultimo indice con inizio <= [time] (ricerca binaria); -1 se nessuno. */
private fun lastStartBefore(starts: FloatArray, time: Float): Int {
    var low = 0
    var high = starts.size - 1
    var result = -1
    while (low <= high) {
        val mid = (low + high) ushr 1
        if (starts[mid] <= time) {
            result = mid
            low = mid + 1
        } else {
            high = mid - 1
        }
    }
    return result
}
