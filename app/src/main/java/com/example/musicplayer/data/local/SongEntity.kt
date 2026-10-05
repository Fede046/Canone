package com.example.musicplayer.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Rappresenta una canzone GIA' SCARICATA e persistita localmente.
 * La libreria (schermata "Libreria") legge esclusivamente da questa tabella,
 * quindi deve funzionare al 100% offline.
 */
@Entity(tableName = "downloaded_songs")
data class SongEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val durationMs: Long,
    val localAudioPath: String,
    val localCoverPath: String?,
    val fileSizeBytes: Long,
    val downloadedAt: Long,
    val coverUrl: String = ""
)