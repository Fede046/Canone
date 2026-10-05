package com.example.musicplayer.ui.zone

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** Quanto resta acceso lo schermo nelle Zone (MZ, CZ, FZ). */
enum class ScreenOnMode {
    /** Come il resto del telefono: si spegne con il suo timeout. */
    SYSTEM,

    /** Sempre acceso finché la musica suona nella Zona: in pausa o uscendo torna come il telefono. */
    WHILE_PLAYING,

    /** Acceso per alcuni minuti dall'ultimo tocco, poi come il telefono. */
    MINUTES
}

data class ScreenOnSetting(val mode: ScreenOnMode, val minutes: Int)

/**
 * Impostazioni delle Zone, salvate sul telefono (restano dopo il riavvio dell'app).
 * Per ora una sola: lo schermo acceso, che vale per tutte e tre le Zone.
 */
@Singleton
class ZoneSettings @Inject constructor(
    @ApplicationContext context: Context
) {
    private val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    private val _screenOn = MutableStateFlow(
        ScreenOnSetting(
            mode = preferences.getString(KEY_MODE, null)
                ?.let { name -> ScreenOnMode.entries.firstOrNull { it.name == name } }
                ?: ScreenOnMode.SYSTEM,
            minutes = preferences.getInt(KEY_MINUTES, DEFAULT_MINUTES).takeIf { it in MINUTE_CHOICES } ?: DEFAULT_MINUTES
        )
    )
    val screenOn: StateFlow<ScreenOnSetting> = _screenOn.asStateFlow()

    fun setScreenOn(setting: ScreenOnSetting) {
        preferences.edit()
            .putString(KEY_MODE, setting.mode.name)
            .putInt(KEY_MINUTES, setting.minutes)
            .apply()
        _screenOn.value = setting
    }

    companion object {
        /** Le durate fra cui scegliere, in minuti. */
        val MINUTE_CHOICES = listOf(5, 10, 15, 30, 60)
        private const val DEFAULT_MINUTES = 15
        private const val PREFERENCES = "zone_settings"
        private const val KEY_MODE = "screen_on_mode"
        private const val KEY_MINUTES = "screen_on_minutes"
    }
}
