package com.example.musicplayer.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface PlaylistDao {

    @Query("SELECT * FROM playlists ORDER BY name ASC")
    fun observeAll(): Flow<List<PlaylistEntity>>

    /** Inserisce la playlist e restituisce il suo id. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(playlist: PlaylistEntity): Long

    @Delete
    suspend fun delete(playlist: PlaylistEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun addSongToPlaylist(crossRef: PlaylistSongCrossRef)

    @Delete
    suspend fun removeSongFromPlaylist(crossRef: PlaylistSongCrossRef)

    @Transaction
    @Query("SELECT * FROM downloaded_songs WHERE id IN (SELECT songId FROM playlist_song_cross_ref WHERE playlistId = :playlistId)")
    fun observeSongsInPlaylist(playlistId: Long): Flow<List<SongEntity>>

    /** Id delle playlist che contengono il brano (per segnarle nella scelta della playlist). */
    @Query("SELECT playlistId FROM playlist_song_cross_ref WHERE songId = :songId")
    fun observePlaylistIdsForSong(songId: String): Flow<List<Long>>

    @Query("SELECT * FROM playlists WHERE id = :id")
    suspend fun getById(id: Long): PlaylistEntity?
}
