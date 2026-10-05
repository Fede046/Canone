package com.example.musicplayer.data.remote

/**
 * Modello che mappa un documento della collezione Firestore "songs".
 * I nomi dei campi devono corrispondere esattamente a quelli su Firestore
 * affinche' toObject() funzioni correttamente.
 */
data class RemoteSong(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val duration: Long = 0L,
    val storagePath: String = "",
    val coverUrl: String = "",
    val fileSizeBytes: Long = 0L,
    val userName: String = ""
)