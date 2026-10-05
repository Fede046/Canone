package com.example.musicplayer.playback

import android.app.PendingIntent
import android.content.Intent
import android.os.SystemClock
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import dagger.hilt.android.AndroidEntryPoint

/**
 * Service in foreground che ospita ExoPlayer e la MediaSession.
 * Grazie a Media3, la notifica media (play/pause/next/previous) e' gestita
 * automaticamente e la riproduzione continua anche con l'app in background
 * o l'Activity chiusa.
 *
 * Nel Manifest va dichiarato con:
 *   android:foregroundServiceType="mediaPlayback"
 */
@AndroidEntryPoint
class PlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    private lateinit var player: ExoPlayer

    private var lastPauseTimeMs: Long = 0L
    private var isStoppingForInactivity = false

    companion object {
        /** Se il player resta in pausa per piu' di 30 secondi senza attivita', fermiamo il servizio. */
        private const val INACTIVITY_TIMEOUT_MS = 30_000L
    }

    override fun onCreate() {
        super.onCreate()

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        player = ExoPlayer.Builder(this)
            .setHandleAudioBecomingNoisy(true)
            .build()
            .apply {
                setAudioAttributes(audioAttributes, true)
                // Disabilita il wake lock della CPU quando non sta attivamente riproducendo
                setWakeMode(C.WAKE_MODE_NETWORK)
                addListener(playerListener)
            }

        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(buildContentIntent())
            .build()
    }

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            when (playbackState) {
                Player.STATE_ENDED -> {
                    // Se il repeat mode è attivo (ONE o ALL), ExoPlayer gestisce automaticamente
                    // il loop, quindi non fermiamo il player
                    if (player.repeatMode == Player.REPEAT_MODE_OFF &&
                        (player.mediaItemCount == 0 || player.currentMediaItemIndex >= player.mediaItemCount - 1)
                    ) {
                        player.stop()
                        scheduleStopSelfIfInactive()
                    }
                }
                Player.STATE_READY -> {
                    isStoppingForInactivity = false
                }
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (!isPlaying) {
                lastPauseTimeMs = SystemClock.elapsedRealtime()
                scheduleStopSelfIfInactive()
            } else {
                isStoppingForInactivity = false
            }
        }

        override fun onMediaItemTransition(mediaItem: androidx.media3.common.MediaItem?, reason: Int) {
            // Qualsiasi attivita' sul player resetta il timeout di inattivita'
            isStoppingForInactivity = false
        }
    }

    private fun scheduleStopSelfIfInactive() {
        if (isStoppingForInactivity) return
        isStoppingForInactivity = true

        // Posticipa il controllo per evitare di fermarsi subito dopo una pausa breve
        android.os.Handler(mainLooper).postDelayed({
            if (isStoppingForInactivity && !player.isPlaying) {
                val elapsedSincePause = SystemClock.elapsedRealtime() - lastPauseTimeMs
                if (elapsedSincePause >= INACTIVITY_TIMEOUT_MS) {
                    stopSelf()
                } else {
                    isStoppingForInactivity = false
                }
            } else {
                isStoppingForInactivity = false
            }
        }, INACTIVITY_TIMEOUT_MS)
    }

    private fun buildContentIntent(): PendingIntent {
        val packageManager = packageManager
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?: Intent()
        return PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    /**
     * Quando l'app viene rimossa dal task switcher, fermiamo il servizio
     * solo se il player non sta attivamente riproducendo.
     * Se sta riproducendo, la notifica media rimane comunque gestibile.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player ?: return
        if (!player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        } else {
            // Se sta riproducendo, lasciamo il service attivo ma senza notifica persistente
            // L'utente puo' mettere pausa dalla notifica
        }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.removeListener(playerListener)
            player.stop()
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}