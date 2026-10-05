package com.example.musicplayer.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.musicplayer.data.remote.RemoteUser
import com.google.firebase.firestore.FirebaseFirestore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import java.security.MessageDigest
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val firestore: FirebaseFirestore
) {
    companion object {
        private const val TAG = "UserRepository"
        private const val PREFS_NAME = "user_session"
        private const val KEY_USER_ID = "logged_in_user_id"
        private const val KEY_USERNAME = "logged_in_username"
        private const val COLLECTION_USERS = "users"
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ---------- Session Management ----------

    /** Returns the currently logged-in user ID, or null if not logged in. */
    private fun getLoggedInUserId(): String? {
        val id = prefs.getString(KEY_USER_ID, null)
        return if (id.isNullOrBlank()) null else id
    }

    /** Returns the currently logged-in username, or null if not logged in. */
    fun getLoggedInUsername(): String? {
        val username = prefs.getString(KEY_USERNAME, null)
        return if (username.isNullOrBlank()) null else username
    }

    /** Checks if a user is currently logged in. */
    fun isLoggedIn(): Boolean = getLoggedInUserId() != null

    // ---------- Authentication ----------

    /**
     * Attempts to log in with the given username and password.
     * Returns a [LoginResult] indicating success or failure.
     */
    suspend fun login(username: String, password: String): LoginResult {
        try {
            // Hash the password with SHA-256
            val passwordHash = hashPassword(password)

            // Query Firestore for a user with this username
            val snapshot = firestore.collection(COLLECTION_USERS)
                .whereEqualTo("username", username)
                .limit(1)
                .get()
                .await()

            val document = snapshot.documents.firstOrNull()
            if (document == null) {
                Log.w(TAG, "Login failed: user not found for username=$username")
                return LoginResult.Error("Username non trovato")
            }

            val user = document.toObject(RemoteUser::class.java)?.copy(id = document.id)
            if (user == null) {
                Log.w(TAG, "Login failed: could not parse user document")
                return LoginResult.Error("Errore nel recupero dei dati utente")
            }

            // Verify password hash
            if (user.passwordHash != passwordHash) {
                Log.w(TAG, "Login failed: wrong password for username=$username")
                return LoginResult.Error("Password errata")
            }

            // Save session
            prefs.edit()
                .putString(KEY_USER_ID, user.id)
                .putString(KEY_USERNAME, user.username)
                .apply()

            Log.d(TAG, "Login successful for username=$username")
            return LoginResult.Success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Login error for username=$username", e)
            return LoginResult.Error("Errore di connessione: ${e.localizedMessage ?: "Riprova più tardi"}")
        }
    }

    /** Logs out the current user by clearing the session. */
    fun logout() {
        Log.d(TAG, "Logging out user: ${getLoggedInUsername()}")
        prefs.edit()
            .remove(KEY_USER_ID)
            .remove(KEY_USERNAME)
            .apply()
    }

    // ---------- Daily Download Limit ----------

    /**
     * Fetches the current user data from Firestore, resetting daily count if needed.
     * Returns null if the user is not logged in or an error occurs.
     */
    suspend fun getCurrentUserWithReset(): RemoteUser? {
        val userId = getLoggedInUserId() ?: return null
        return try {
            val doc = firestore.collection(COLLECTION_USERS).document(userId).get().await()
            val user = doc.toObject(RemoteUser::class.java)?.copy(id = doc.id) ?: return null

            // Check if we need to reset the daily download count
            val today = LocalDate.now().toString()
            if (user.lastDownloadDate != today) {
                // Reset the counter for a new day
                val updatedUser = user.copy(downloadedToday = 0, lastDownloadDate = today)
                firestore.collection(COLLECTION_USERS).document(userId)
                    .update("downloadedToday", 0, "lastDownloadDate", today)
                    .await()
                Log.d(TAG, "Daily download counter reset for user=${user.username}")
                updatedUser
            } else {
                user
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching current user", e)
            null
        }
    }

    /**
     * Checks if the current user can still download today (below their daily limit).
     * Returns a [DownloadLimitResult].
     */
    suspend fun checkDownloadLimit(): DownloadLimitResult {
        val user = getCurrentUserWithReset()
        if (user == null) {
            return DownloadLimitResult.NotLoggedIn
        }
        if (user.downloadedToday >= user.dailyDownloadLimit) {
            return DownloadLimitResult.LimitReached(user.dailyDownloadLimit)
        }
        return DownloadLimitResult.CanDownload(
            remaining = user.dailyDownloadLimit - user.downloadedToday,
            limit = user.dailyDownloadLimit
        )
    }

    /**
     * Increments the download counter for the current user on Firestore.
     * Should be called AFTER a successful download.
     */
    suspend fun incrementDownloadCount(): Boolean {
        val userId = getLoggedInUserId() ?: return false
        return try {
            val doc = firestore.collection(COLLECTION_USERS).document(userId).get().await()
            val user = doc.toObject(RemoteUser::class.java)?.copy(id = doc.id) ?: return false

            val today = LocalDate.now().toString()
            val newCount: Int
            val newDate: String

            if (user.lastDownloadDate != today) {
                newCount = 1
                newDate = today
            } else {
                newCount = user.downloadedToday + 1
                newDate = today
            }

            firestore.collection(COLLECTION_USERS).document(userId)
                .update("downloadedToday", newCount, "lastDownloadDate", newDate)
                .await()

            Log.d(TAG, "Download count incremented for user=${user.username}: $newCount")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error incrementing download count", e)
            false
        }
    }

    // ---------- Helpers ----------

    /** Computes SHA-256 hash of the password and returns it as a hex string. */
    private fun hashPassword(password: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(password.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}

// ---------- Result Types ----------

sealed class LoginResult {
    data class Success(val user: RemoteUser) : LoginResult()
    data class Error(val message: String) : LoginResult()
}

sealed class DownloadLimitResult {
    object NotLoggedIn : DownloadLimitResult()
    data class LimitReached(val limit: Int) : DownloadLimitResult()
    data class CanDownload(val remaining: Int, val limit: Int) : DownloadLimitResult()
}