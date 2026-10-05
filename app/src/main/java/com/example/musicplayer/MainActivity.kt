package com.example.musicplayer

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.lifecycle.lifecycleScope
import com.example.musicplayer.navigation.MusicAppNavGraph
import com.example.musicplayer.playback.PlaybackService
import com.example.musicplayer.ui.theme.MusicPlayerTheme
import com.example.musicplayer.ui.zone.ZoneMode
import com.example.musicplayer.ui.zone.ZoneSettings
import com.google.common.util.concurrent.MoreExecutors
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var zoneMode: ZoneMode

    @Inject
    lateinit var zoneSettings: ZoneSettings

    private var mediaController: MediaController? = null

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* risultato non bloccante */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()

        setContent {
            MusicPlayerTheme {
                MusicAppNavGraph(zoneMode, zoneSettings)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Rotazione o altro cambio di configurazione (anche il blocco dell'orientamento di MZ e CZ):
        // l'activity viene ricreata subito e il player non va toccato.
        if (isChangingConfigurations) return
        // Quando l'Activity viene distrutta (es. back button definitivo), controlliamo
        // se il player sta riproducendo. Se non sta riproducendo, fermiamo il service.
        if (mediaController == null) {
            // Tentiamo di connetterci brevemente per controllare lo stato. Contesto dell'applicazione:
            // con quello dell'activity distrutta il rilascio del controller va in crash
            // ("Service not registered").
            val appContext = applicationContext
            val sessionToken = SessionToken(appContext, ComponentName(appContext, PlaybackService::class.java))
            val future = MediaController.Builder(appContext, sessionToken).buildAsync()
            future.addListener({
                val controller = future.get()
                if (!controller.isPlaying) {
                    controller.stop()
                    controller.release()
                    appContext.stopService(Intent(appContext, PlaybackService::class.java))
                } else {
                    controller.release()
                }
            }, MoreExecutors.directExecutor())
        } else {
            if (!mediaController!!.isPlaying) {
                mediaController?.stop()
                mediaController?.release()
                stopService(Intent(this, PlaybackService::class.java))
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}