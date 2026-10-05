package com.example.musicplayer.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity leggera per la cache locale del catalogo (Sfoglia).
 * Contiene solo i metadati necessari per la ricerca offline:
 * titolo, artista, durata, cover URL.
 * Non contiene i file audio/scaricati — quelli restano in [SongEntity].
 */
@Entity(tableName = "catalog_songs")
data class CatalogSongEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val durationMs: Long,
    val coverUrl: String = "",
    val storagePath: String = "",
    val fileSizeBytes: Long = 0L,
    val userName: String = ""
)