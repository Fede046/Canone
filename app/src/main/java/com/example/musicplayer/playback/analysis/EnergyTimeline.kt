package com.example.musicplayer.playback.analysis

import kotlin.math.max
import kotlin.math.min

/**
 * Energia di un brano nel tempo (0..1, ogni [STEP_SEC] secondi) e lo stato della scena della
 * Firewatch Zone che ne deriva: [CALM], [MIDDLE], [ENERGETIC].
 *
 * L'energia unisce quattro misure, mediate su ±2 s, dall'analisi della Music Zone:
 * - il volume (bande fino a 6 kHz);
 * - la brillantezza (bande medio-alte e alte: chitarre distorte, piatti), che separa un brano
 *   energico da uno solo registrato forte;
 * - la densità dei colpi forti;
 * - la dinamica interna: quanto il momento è forte rispetto al resto del brano (strofa calma,
 *   ritornello esplosivo).
 * Le prime tre danno un valore assoluto, l'ultima lo alza o lo abbassa: così un brano calmo
 * non arriva mai allo stato energico solo perché ha un punto più forte degli altri. Tarata su due brani,
 * uno tranquillo (mai energico) e uno veloce con molti bassi (energico nei ritornelli).
 *
 * Gli stati hanno soglie con margine e una permanenza minima: la scena non salta avanti e
 * indietro su un singolo colpo di batteria.
 */
class EnergyTimeline private constructor(
    private val energy: FloatArray,
    private val states: IntArray
) {
    /** Energia all'istante (0 fuori dal brano). */
    fun energyAt(timeSec: Float): Float {
        val index = (timeSec / STEP_SEC).toInt()
        return if (index in energy.indices) energy[index] else 0f
    }

    /** Stato all'istante; [CALM] fuori dal brano. */
    fun stateAt(timeSec: Float): Int {
        val index = (timeSec / STEP_SEC).toInt()
        return if (index in states.indices) states[index] else CALM
    }

    companion object {
        const val CALM = 0
        const val MIDDLE = 1
        const val ENERGETIC = 2
        const val STEP_SEC = 0.5f

        private const val SMOOTH_STEPS = 4
        private const val MIDDLE_THRESHOLD = 0.36f
        private const val ENERGETIC_THRESHOLD = 0.66f
        private const val MARGIN = 0.05f
        private const val MIN_STEPS = 12

        /** Curva di un'analisi completa (servono i percentili di tutto il brano). */
        fun from(analysis: SongAnalysis): EnergyTimeline {
            val framesPerStep = (STEP_SEC * SongAnalysis.FRAME_RATE).toInt()
            val steps = analysis.frameCount / framesPerStep
            if (steps == 0) return EnergyTimeline(FloatArray(0), IntArray(0))
            val loudness = FloatArray(steps)
            val brightness = FloatArray(steps)
            val hits = FloatArray(steps)
            for (step in 0 until steps) {
                var loud = 0f
                var bright = 0f
                for (frame in step * framesPerStep until (step + 1) * framesPerStep) {
                    for (band in 0 until 5) loud += decibels(analysis.levelAtFrame(band, frame))
                    for (band in 3 until SongAnalysis.BAND_COUNT) bright += decibels(analysis.levelAtFrame(band, frame))
                }
                loudness[step] = loud / (5 * framesPerStep)
                brightness[step] = bright / ((SongAnalysis.BAND_COUNT - 3) * framesPerStep)
            }
            for (index in 0 until analysis.onsetCount) {
                val step = analysis.onsetFrame(index) / framesPerStep
                if (step < steps) hits[step] += analysis.onsetStrength(index)
            }
            val smoothLoudness = smooth(loudness)
            val smoothBrightness = smooth(brightness)
            val smoothHits = smooth(hits)

            val sorted = smoothLoudness.sorted()
            val low = sorted[(steps * 0.10f).toInt()]
            val high = sorted[min(steps - 1, (steps * 0.95f).toInt())]
            val energy = FloatArray(steps) { step ->
                val loud = ((smoothLoudness[step] + 60f) / 25f).coerceIn(0f, 1f)
                val bright = ((smoothBrightness[step] + 85f) / 40f).coerceIn(0f, 1f)
                val hitsPerSecond = smoothHits[step] / STEP_SEC
                val dense = ((hitsPerSecond - 1.5f) / 2.5f).coerceIn(0f, 1f)
                val absolute = 0.4f * loud + 0.35f * bright + 0.25f * dense
                val relative = ((smoothLoudness[step] - low) / max(high - low, 1e-3f)).coerceIn(0f, 1f)
                (absolute * (0.5f + 0.8f * relative)).coerceIn(0f, 1f)
            }
            return EnergyTimeline(energy, states(energy))
        }

        private fun decibels(level: Int): Float = level / 2.55f - 100f

        /** Media mobile su ±[SMOOTH_STEPS] passi. */
        private fun smooth(values: FloatArray): FloatArray {
            val prefix = FloatArray(values.size + 1)
            for (i in values.indices) prefix[i + 1] = prefix[i] + values[i]
            return FloatArray(values.size) { i ->
                val from = max(0, i - SMOOTH_STEPS)
                val to = min(values.size, i + SMOOTH_STEPS + 1)
                (prefix[to] - prefix[from]) / (to - from)
            }
        }

        /** Stati con margine (per scendere bisogna andare un po' sotto la soglia) e permanenza minima. */
        private fun states(energy: FloatArray): IntArray {
            val result = IntArray(energy.size)
            var current = CALM
            var since = 0
            for (i in energy.indices) {
                val e = energy[i]
                var target = level(e, 0f)
                if (target < current) target = level(e, MARGIN).coerceAtMost(current)
                if (target != current && since >= MIN_STEPS) {
                    current = target
                    since = 0
                }
                since++
                result[i] = current
            }
            return result
        }

        private fun level(energy: Float, margin: Float): Int = when {
            energy > ENERGETIC_THRESHOLD - margin -> ENERGETIC
            energy > MIDDLE_THRESHOLD - margin -> MIDDLE
            else -> CALM
        }
    }
}
