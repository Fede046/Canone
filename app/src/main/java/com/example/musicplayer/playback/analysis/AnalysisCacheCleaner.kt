package com.example.musicplayer.playback.analysis

import android.content.Context
import android.util.Log
import com.example.musicplayer.data.local.SongDao
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Pulizia delle cache di analisi (Music Zone e Circle Zone), una volta all'avvio dell'app.
 * Cancella i file:
 * - dei brani che non sono più nella libreria (eliminati da fuori, o prima che la cancellazione
 *   del brano portasse via anche le sue analisi);
 * - di una versione vecchia del formato, che verrebbero comunque rifatti;
 * - temporanei rimasti a metà da un'analisi interrotta (solo se vecchi di qualche minuto, per non
 *   toccare un'analisi in corso).
 */
@Singleton
class AnalysisCacheCleaner @Inject constructor(
    @ApplicationContext private val context: Context,
    private val songDao: SongDao
) {
    suspend fun clean() {
        withContext<Unit>(Dispatchers.IO) {
            try {
                val library = songDao.getAllIds().toSet()
                val deleted =
                    cleanDirectory(AudioAnalyzer.cacheDirectory(context), library) { SongAnalysis.isCurrentCache(it) } +
                        cleanDirectory(HarmonyAnalyzer.cacheDirectory(context), library) { HarmonyRaw.isCurrentCache(it) }
                if (deleted > 0) Log.d("MusicAppDebug", "AnalysisCacheCleaner: $deleted file di analisi cancellati")
            } catch (e: Exception) {
                Log.w("MusicAppDebug", "AnalysisCacheCleaner: pulizia non riuscita", e)
            }
        }
    }

    /** Cancella nella cartella i file da togliere; restituisce quanti. */
    private fun cleanDirectory(directory: File, library: Set<String>, isCurrent: (File) -> Boolean): Int {
        val files = directory.listFiles() ?: return 0
        var deleted = 0
        val now = System.currentTimeMillis()
        for (file in files) {
            if (!file.isFile) continue
            val remove = if (file.name.endsWith(".tmp")) {
                now - file.lastModified() > TMP_MAX_AGE_MS
            } else {
                file.nameWithoutExtension !in library || !isCurrent(file)
            }
            if (remove && file.delete()) deleted++
        }
        return deleted
    }

    private companion object {
        const val TMP_MAX_AGE_MS = 10 * 60 * 1000L
    }
}

/** Il file inizia con [magic] e [version] (le cache di analisi hanno questa intestazione). */
internal fun hasHeader(file: File, magic: Int, version: Int): Boolean = try {
    DataInputStream(file.inputStream().buffered()).use { it.readInt() == magic && it.readInt() == version }
} catch (e: Exception) {
    false
}
