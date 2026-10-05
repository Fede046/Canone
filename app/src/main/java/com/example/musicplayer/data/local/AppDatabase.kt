package com.example.musicplayer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [SongEntity::class, PlaylistEntity::class, PlaylistSongCrossRef::class, CatalogSongEntity::class],
    version = 6,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun songDao(): SongDao
    abstract fun playlistDao(): PlaylistDao
    abstract fun catalogSongDao(): CatalogSongDao

    companion object {
        const val DATABASE_NAME = "music_player.db"

        val MIGRATION_2_3 = object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE playlists ADD COLUMN color INTEGER NOT NULL DEFAULT ${0xFF1DB954.toLong()}")
            }
        }

        val MIGRATION_3_4 = object : androidx.room.migration.Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `catalog_songs` (`id` TEXT NOT NULL, `title` TEXT NOT NULL, `artist` TEXT NOT NULL, `durationMs` INTEGER NOT NULL, `coverUrl` TEXT NOT NULL, PRIMARY KEY(`id`))")
            }
        }

        val MIGRATION_4_5 = object : androidx.room.migration.Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE catalog_songs ADD COLUMN storagePath TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE catalog_songs ADD COLUMN fileSizeBytes INTEGER NOT NULL DEFAULT 0")
            }
        }

        val MIGRATION_5_6 = object : androidx.room.migration.Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE catalog_songs ADD COLUMN userName TEXT NOT NULL DEFAULT ''")
            }
        }
    }
}
