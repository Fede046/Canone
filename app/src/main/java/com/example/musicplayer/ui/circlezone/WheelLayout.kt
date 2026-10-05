package com.example.musicplayer.ui.circlezone

import com.example.musicplayer.playback.analysis.ChordTrack
import com.example.musicplayer.playback.analysis.HarmonyResult
import com.example.musicplayer.playback.analysis.NoteTrack

/**
 * Dove sta ogni cosa sulla ruota, calcolato una volta per brano: il disegno a ogni fotogramma
 * legge solo indici.
 *
 * Ogni nota sta su un angolo di uno degli ettagoni concentrici: la direzione è quella della sua
 * lettera (vedi [NoteSpeller]), l'ettagono è la sua ottava, dal più interno (Mi1-Si1) al bordo
 * (Do7-Re♯7). Le note che fanno parte dell'accordo in corso quando attaccano si scrivono come
 * nell'accordo, così voci e triangolo dell'accordo usano le stesse direzioni.
 */
internal class WheelLayout(val result: HarmonyResult, val speller: NoteSpeller) {

    /** Vertici delle tre note di ogni accordo (vuoto per "nessun accordo"). */
    val chordVertices: Array<IntArray> = Array(result.chords.size) { index ->
        if (result.chords.quality[index] == ChordTrack.NONE) IntArray(0)
        else speller.chordVertices(result.chords.root[index])
    }

    /** Nomi delle tre note di ogni accordo, scritti sui loro vertici. */
    val chordToneNames: Array<Array<String>> = Array(result.chords.size) { index ->
        val tones = result.chords.tones(index)
        Array(tones.size) { k -> speller.nameOn(chordVertices[index][k], tones[k]) }
    }

    /** Per ogni voce ([HarmonyResult.BASS], ...): il vertice di ogni nota, -1 per le pause. */
    val voiceVertices: Array<IntArray> = Array(result.voices.size) { v ->
        val track = result.voices[v]
        IntArray(track.size) { i -> vertexOf(track, i) }
    }

    /** Per ogni voce: l'ettagono di ogni nota (0 = il più interno, [RING_COUNT] - 1 = il bordo). */
    val voiceRings: Array<IntArray> = Array(result.voices.size) { v ->
        val track = result.voices[v]
        IntArray(track.size) { i ->
            val midi = track.midi[i]
            if (midi == NoteTrack.REST) 0
            else (speller.octaveOn(voiceVertices[v][i], midi) - FIRST_OCTAVE).coerceIn(0, RING_COUNT - 1)
        }
    }

    /** Per ogni voce: il nome di ogni nota ("" per le pause). */
    val voiceNames: Array<Array<String>> = Array(result.voices.size) { v ->
        val track = result.voices[v]
        Array(track.size) { i ->
            val midi = track.midi[i]
            if (midi == NoteTrack.REST) "" else speller.nameOn(voiceVertices[v][i], midi % 12)
        }
    }

    /** Tutti i nomi che possono comparire intorno alla ruota, da misurare una volta. */
    val allNames: Set<String> = buildSet {
        for (vertex in 0 until 7) add(speller.scaleName(vertex))
        for (names in chordToneNames) addAll(names)
        for (names in voiceNames) for (name in names) if (name.isNotEmpty()) add(name)
    }

    private fun vertexOf(track: NoteTrack, index: Int): Int {
        val midi = track.midi[index]
        if (midi == NoteTrack.REST) return -1
        val pc = midi % 12
        val chord = result.chords.indexAt(track.startSec[index])
        if (chord >= 0) {
            val tones = result.chords.tones(chord)
            for (k in tones.indices) if (tones[k] == pc) return chordVertices[chord][k]
        }
        return speller.vertex(pc)
    }

    companion object {
        /** Un ettagono per ottava, dalla prima (Mi1, la nota più grave analizzata) alla settima. */
        const val RING_COUNT = 7
        private const val FIRST_OCTAVE = 1
    }
}
