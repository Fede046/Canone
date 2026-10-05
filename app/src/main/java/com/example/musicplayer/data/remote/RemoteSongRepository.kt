package com.example.musicplayer.data.remote

import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

sealed class RemoteResult<out T> {
    data class Success<T>(val data: T) : RemoteResult<T>()
    data class Error(val throwable: Throwable) : RemoteResult<Nothing>()
}

/** Rappresenta l'avanzamento di un download in corso, in percentuale 0..100. */
data class DownloadProgress(val songId: String, val progressPercent: Int)

@Singleton
class RemoteSongRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val storage: FirebaseStorage
) {
    companion object {
        private const val SONGS_COLLECTION = "songs"
    }

    /**
     * Osserva in tempo reale la collezione "songs" su Firestore.
     * Se [userName] non e' null o blank, filtra per quel campo.
     * Emette RemoteResult.Error in caso di problemi di rete/permessi,
     * cosi' la UI puo' mostrare un messaggio chiaro.
     */
    fun observeSongs(userName: String? = null): Flow<RemoteResult<List<RemoteSong>>> = callbackFlow {
        var query: Query = firestore.collection(SONGS_COLLECTION)
        if (!userName.isNullOrBlank()) {
            query = query.whereEqualTo("userName", userName)
        }
        val registration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                trySend(RemoteResult.Error(error))
                return@addSnapshotListener
            }
            val songs = snapshot?.documents?.mapNotNull { doc ->
                doc.toObject(RemoteSong::class.java)?.copy(id = doc.id)
            } ?: emptyList()
            trySend(RemoteResult.Success(songs))
        }
        awaitClose { registration.remove() }
    }

    /** Recupero one-shot, utile per retry manuali. */
    suspend fun fetchSongsOnce(userName: String? = null): RemoteResult<List<RemoteSong>> = try {
        var query: Query = firestore.collection(SONGS_COLLECTION)
        if (!userName.isNullOrBlank()) {
            query = query.whereEqualTo("userName", userName)
        }
        val snapshot = query.get().await()
        val songs = snapshot.documents.mapNotNull { doc ->
            doc.toObject(RemoteSong::class.java)?.copy(id = doc.id)
        }
        RemoteResult.Success(songs)
    } catch (t: Throwable) {
        RemoteResult.Error(t)
    }

    /**
     * Scarica il file (audio o copertina) da Firebase Storage verso destFile,
     * emettendo l'avanzamento come Flow<Int> (percentuale).
     * Il chiamante e' responsabile di gestire i file parziali in caso di fallimento.
     */
    fun downloadFile(storagePath: String, destFile: File): Flow<DownloadProgressState> = callbackFlow {
        Log.d("MusicAppDebug", "RemoteSongRepository: downloadFile starting for path: $storagePath")
        val ref = storage.reference.child(storagePath)
        destFile.parentFile?.mkdirs()

        val task = ref.getFile(destFile)

        task.addOnProgressListener { snapshot ->
            val percent = if (snapshot.totalByteCount > 0) {
                (snapshot.bytesTransferred * 100 / snapshot.totalByteCount).toInt()
            } else 0
            Log.v("MusicAppDebug", "RemoteSongRepository: progress for $storagePath: $percent%")
            trySend(DownloadProgressState.InProgress(percent))
        }
        task.addOnSuccessListener {
            Log.d("MusicAppDebug", "RemoteSongRepository: SUCCESS for $storagePath")
            trySend(DownloadProgressState.Success)
            close()
        }
        task.addOnFailureListener { e ->
            Log.e("MusicAppDebug", "RemoteSongRepository: FAILURE for $storagePath", e)
            // Pulizia del file parziale in caso di errore
            if (destFile.exists()) destFile.delete()
            trySend(DownloadProgressState.Failure(e))
            close()
        }

        awaitClose {
            Log.d("MusicAppDebug", "RemoteSongRepository: flow closed for $storagePath")
            task.cancel()
        }
    }
}

sealed class DownloadProgressState {
    data class InProgress(val percent: Int) : DownloadProgressState()
    object Success : DownloadProgressState()
    data class Failure(val throwable: Throwable) : DownloadProgressState()
}