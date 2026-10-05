package com.example.musicplayer.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CatalogSongDao {

    /** Osserva TUTTE le canzoni del catalogo (cache locale). */
    @Query("SELECT * FROM catalog_songs ORDER BY title ASC")
    fun observeAll(): Flow<List<CatalogSongEntity>>

    /** Osserva solo le canzoni di un determinato utente. */
    @Query("SELECT * FROM catalog_songs WHERE userName = :userName ORDER BY title ASC")
    fun observeByUser(userName: String): Flow<List<CatalogSongEntity>>

    /** Cerca per titolo o artista usando LIKE (case-insensitive) tra le canzoni di un utente. */
    @Query("SELECT * FROM catalog_songs WHERE (title LIKE '%' || :query || '%' OR artist LIKE '%' || :query || '%') AND userName = :userName ORDER BY title ASC")
    fun searchByUser(query: String, userName: String): Flow<List<CatalogSongEntity>>

    /** Cerca per titolo o artista usando LIKE (case-insensitive) su TUTTE le canzoni. */
    @Query("SELECT * FROM catalog_songs WHERE title LIKE '%' || :query || '%' OR artist LIKE '%' || :query || '%' ORDER BY title ASC")
    fun search(query: String): Flow<List<CatalogSongEntity>>

    /** Inserisce o sostituisce un lotto di canzoni (usato durante la sincronizzazione). */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(songs: List<CatalogSongEntity>)

    /** Sincronizzazione incrementale: cancella tutto e reinserisce (o usa REPLACE per singoli documenti). */
    @Query("DELETE FROM catalog_songs")
    suspend fun deleteAll()

    /** Cancella solo le canzoni di un determinato utente (utile per refresh selettivo). */
    @Query("DELETE FROM catalog_songs WHERE userName = :userName")
    suspend fun deleteByUser(userName: String)

    /** Ottiene una canzone per ID. */
    @Query("SELECT * FROM catalog_songs WHERE id = :id")
    suspend fun getById(id: String): CatalogSongEntity?

    /** Ottiene tutti gli ID presenti nella cache. */
    @Query("SELECT id FROM catalog_songs")
    suspend fun getAllIds(): List<String>
}