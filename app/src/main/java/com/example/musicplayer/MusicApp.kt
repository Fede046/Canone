package com.example.musicplayer

import android.app.Application
import com.example.musicplayer.playback.analysis.AnalysisCacheCleaner
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class MusicApp : Application() {

    @Inject
    lateinit var analysisCacheCleaner: AnalysisCacheCleaner

    override fun onCreate() {
        super.onCreate()
        // Pulizia delle cache di analisi in background: non rallenta l'avvio
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch { analysisCacheCleaner.clean() }
    }
}
