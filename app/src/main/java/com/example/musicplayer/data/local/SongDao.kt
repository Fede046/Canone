package com.example.musicplayer.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SongDao {

    @Query("SELECT * FROM downloaded_songs ORDER BY downloadedAt DESC")
    fun observeAll(): Flow<List<SongEntity>>

    @Query("SELECT * FROM downloaded_songs WHERE id = :id")
    suspend fun getById(id: String): SongEntity?

    @Query("SELECT id FROM downloaded_songs")
    fun observeDownloadedIds(): Flow<List<String>>

    @Query("SELECT id FROM downloaded_songs")
    suspend fun getAllIds(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(song: SongEntity)

    /** Modifica titolo e artista di un brano scaricato; id e file restano invariati. */
    @Query("UPDATE downloaded_songs SET title = :title, artist = :artist WHERE id = :id")
    suspend fun updateTitleAndArtist(id: String, title: String, artist: String)

    @Delete
    suspend fun delete(song: SongEntity)

    @Query("DELETE FROM downloaded_songs WHERE id = :id")
    suspend fun deleteById(id: String)
}
