package com.example.musicplayer.ui.circlezone

import com.example.musicplayer.playback.analysis.ChordTrack
import com.example.musicplayer.playback.analysis.MusicKey
import kotlin.math.abs

/**
 * Nomi italiani di note, tonalità e accordi, scritti secondo la tonalità: in Re minore il sesto
 * grado è Si♭ e la nota fra Do e Re è Do♯ (la sensibile), non Re♭.
 *
 * Dà anche il vertice della ruota di ogni nota (0..6, dalla tonica in senso orario): quello della
 * sua lettera. Do♯ sta sul vertice del Do, Si♭ su quello del Si: sulla ruota si passa sempre da
 * vertice a vertice, e l'alterazione si legge nel nome.
 */
internal class NoteSpeller(val key: MusicKey) {
    private val letters = IntArray(7)
    private val accidentals = IntArray(7)
    private val vertices = IntArray(12)
    private val names = arrayOfNulls<String>(12)

    init {
        val (tonicLetter, _) = (if (key.isMinor) MINOR_TONICS else MAJOR_TONICS)[key.tonic]
        for (degree in 0 until 7) {
            val letter = (tonicLetter + degree) % 7
            letters[degree] = letter
            accidentals[degree] = Math.floorMod(key.scale[degree] - NATURAL[letter] + 6, 12) - 6
        }
        for (pc in 0 until 12) {
            val degree = key.degreeOf(pc)
            if (degree >= 0) {
                vertices[pc] = degree
                names[pc] = spell(letters[degree], accidentals[degree])
                continue
            }
            // Fuori scala: fra due gradi a un tono di distanza. Si alza quello sotto o si abbassa
            // quello sopra, con l'alterazione più semplice (Sol in La maggiore, non Fa♯♯). A parità:
            // in minore si alza (Do♯ in Re minore, la sensibile), in maggiore si abbassano terzo,
            // sesto e settimo grado (Mi♭, La♭, Si♭ in Do maggiore) e si alzano gli altri (Do♯, Fa♯)
            val below = key.degreeOf(pc - 1)
            val above = (below + 1) % 7
            val raised = accidentals[below] + 1
            val lowered = accidentals[above] - 1
            val lower = abs(lowered) < abs(raised) ||
                (abs(lowered) == abs(raised) && !key.isMinor && below in MAJOR_FLAT_GAPS)
            vertices[pc] = if (lower) above else below
            names[pc] = if (lower) spell(letters[above], lowered) else spell(letters[below], raised)
        }
    }

    /** Vertice (0..6) della nota, fuori da un accordo. */
    fun vertex(pitchClass: Int): Int = vertices[Math.floorMod(pitchClass, 12)]

    fun name(pitchClass: Int): String = names[Math.floorMod(pitchClass, 12)]!!

    fun isDiatonic(pitchClass: Int): Boolean = key.degreeOf(pitchClass) >= 0

    /** La nota [pitchClass] scritta con la lettera del vertice [vertex] (Sol♯ sul vertice del Sol). */
    fun nameOn(vertex: Int, pitchClass: Int): String {
        val letter = letters[vertex]
        return spell(letter, Math.floorMod(pitchClass - NATURAL[letter] + 6, 12) - 6)
    }

    /**
     * Ottava (numerazione scientifica: Do4 = Do centrale) della nota MIDI [midi] scritta sul vertice
     * [vertex]: conta la lettera, così Do♭4 (che suona come Si3) resta nell'ottava 4.
     */
    fun octaveOn(vertex: Int, midi: Int): Int {
        val letter = letters[vertex]
        val accidental = Math.floorMod(midi % 12 - NATURAL[letter] + 6, 12) - 6
        return Math.floorDiv(midi - accidental, 12) - 1
    }

    /** Il nome della nota della scala sul vertice [vertex]. */
    fun scaleName(vertex: Int): String = spell(letters[vertex], accidentals[vertex])

    /**
     * Vertici delle note di un accordo (fondamentale, terza, quinta): per terze, cioè a due e quattro
     * vertici dalla fondamentale. Così ogni triade è un triangolo e la terza di Mi maggiore in Do
     * maggiore si scrive Sol♯, non La♭.
     */
    fun chordVertices(root: Int): IntArray {
        val rootVertex = vertex(root)
        return intArrayOf(rootVertex, (rootVertex + 2) % 7, (rootVertex + 4) % 7)
    }

    /** "Re minore", "Si♭ maggiore". */
    val keyName: String = "${name(key.tonic)} ${if (key.isMinor) "minore" else "maggiore"}"

    /** "Re", "Rem", "Mi°". */
    fun chordName(root: Int, quality: Int): String = name(root) + when (quality) {
        ChordTrack.MINOR -> "m"
        ChordTrack.DIMINISHED -> "°"
        else -> ""
    }

    private fun spell(letter: Int, accidental: Int): String = LETTERS[letter] + when (accidental) {
        -2 -> "♭♭"
        -1 -> "♭"
        1 -> "♯"
        2 -> "♯♯"
        else -> ""
    }

    companion object {
        private val LETTERS = arrayOf("Do", "Re", "Mi", "Fa", "Sol", "La", "Si")
        private val NATURAL = intArrayOf(0, 2, 4, 5, 7, 9, 11)
        /** In maggiore, gli intervalli (dal grado indicato al successivo) dove si preferisce il bemolle. */
        private val MAJOR_FLAT_GAPS = setOf(1, 4, 5)

        // Come si scrive la tonica di ogni tonalità (lettera, alterazione): le grafie più comuni
        private val MAJOR_TONICS = arrayOf(
            0 to 0, 1 to -1, 1 to 0, 2 to -1, 2 to 0, 3 to 0,
            3 to 1, 4 to 0, 5 to -1, 5 to 0, 6 to -1, 6 to 0
        )
        private val MINOR_TONICS = arrayOf(
            0 to 0, 0 to 1, 1 to 0, 2 to -1, 2 to 0, 3 to 0,
            3 to 1, 4 to 0, 4 to 1, 5 to 0, 6 to -1, 6 to 0
        )
    }
}
