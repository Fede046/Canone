package com.example.musicplayer.di

import android.content.Context
import androidx.room.Room
import com.example.musicplayer.data.local.AppDatabase
import com.example.musicplayer.data.local.CatalogSongDao
import com.example.musicplayer.data.local.PlaylistDao
import com.example.musicplayer.data.local.SongDao
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseStorage(): FirebaseStorage = FirebaseStorage.getInstance()

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.DATABASE_NAME)
            .addMigrations(AppDatabase.MIGRATION_2_3, AppDatabase.MIGRATION_3_4, AppDatabase.MIGRATION_4_5, AppDatabase.MIGRATION_5_6)
            .build()

    @Provides
    @Singleton
    fun provideSongDao(db: AppDatabase): SongDao = db.songDao()

    @Provides
    @Singleton
    fun providePlaylistDao(db: AppDatabase): PlaylistDao = db.playlistDao()

    @Provides
    @Singleton
    fun provideCatalogSongDao(db: AppDatabase): CatalogSongDao = db.catalogSongDao()
}
