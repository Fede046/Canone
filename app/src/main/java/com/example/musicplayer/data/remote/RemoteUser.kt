package com.example.musicplayer.data.remote

/**
 * Modello che mappa un documento della collezione Firestore "users".
 * I nomi dei campi devono corrispondere esattamente a quelli su Firestore.
 */
data class RemoteUser(
    val id: String = "",
    val username: String = "",
    val passwordHash: String = "",
    val dailyDownloadLimit: Int = 5,
    val downloadedToday: Int = 0,
    val lastDownloadDate: String = "" // formato "yyyy-MM-dd"
)