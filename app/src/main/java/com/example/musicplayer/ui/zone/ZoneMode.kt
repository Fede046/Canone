package com.example.musicplayer.ui.zone

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** Le modalità a schermo intero del player. */
enum class Zone { MUSIC, CIRCLE, FIRE }

/**
 * Stato delle modalità Music Zone, Circle Zone e Firewatch Zone: al massimo una è attiva. Finché lo è, aprire
 * il player porta lì e i brani successivi continuano a essere mostrati lì. Uscire dalla schermata
 * non la spegne: la spegne solo il tasto "Esci da MZ" / "CZ" / "FZ". Non sopravvive al riavvio.
 *
 * Tiene anche l'orientamento scelto per ciascuna schermata (verticale o orizzontale): rientrando
 * si ritrova quello lasciato, anche dopo averla spenta, fino al riavvio. La Circle Zone parte in
 * orizzontale, come il video a cui si ispira.
 */
@Singleton
class ZoneMode @Inject constructor() {
    private val _active = MutableStateFlow<Zone?>(null)
    val active: StateFlow<Zone?> = _active.asStateFlow()

    private val landscape = mapOf(
        Zone.MUSIC to MutableStateFlow(false),
        Zone.CIRCLE to MutableStateFlow(true),
        Zone.FIRE to MutableStateFlow(false)
    )

    fun enable(zone: Zone) {
        _active.value = zone
    }

    fun disable() {
        _active.value = null
    }

    fun isLandscape(zone: Zone): StateFlow<Boolean> = landscape.getValue(zone).asStateFlow()

    fun toggleOrientation(zone: Zone) {
        val state = landscape.getValue(zone)
        state.value = !state.value
    }
}
