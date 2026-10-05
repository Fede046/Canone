package com.example.musicplayer.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.musicplayer.ui.zone.ScreenOnMode
import com.example.musicplayer.ui.zone.ScreenOnSetting
import com.example.musicplayer.ui.zone.ZoneSettings

/**
 * Impostazioni dell'app, a schermo intero come la guida. Si aprono dall'ingranaggio della barra
 * in alto e si chiudono con la X o con Indietro. Le scelte valgono subito, senza tasto Salva.
 *
 * Per ora una sola: quanto resta acceso lo schermo nelle Zone (Music, Circle e Firewatch).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsDialog(
    screenOn: ScreenOnSetting,
    onScreenOnChange: (ScreenOnSetting) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                TopAppBar(
                    title = { Text("Impostazioni") },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Chiudi impostazioni")
                        }
                    }
                )
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Schermo nelle Zone (MZ, CZ, FZ)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
                    )
                    Text(
                        text = "Quanto resta acceso lo schermo mentre sei nella Music Zone, nella Circle Zone o nella Firewatch Zone. Fuori dalle Zone vale sempre l'impostazione del telefono.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(modifier = Modifier.selectableGroup()) {
                        ScreenOnOption(
                            title = "Come il telefono",
                            description = "Si spegne con il timeout del telefono.",
                            selected = screenOn.mode == ScreenOnMode.SYSTEM,
                            onSelect = { onScreenOnChange(screenOn.copy(mode = ScreenOnMode.SYSTEM)) }
                        )
                        ScreenOnOption(
                            title = "Sempre acceso finché non lo interrompi",
                            description = "Resta acceso mentre la musica suona nella Zona. Mettendo in pausa o uscendo dalla Zona torna come il telefono.",
                            selected = screenOn.mode == ScreenOnMode.WHILE_PLAYING,
                            onSelect = { onScreenOnChange(screenOn.copy(mode = ScreenOnMode.WHILE_PLAYING)) }
                        )
                        ScreenOnOption(
                            title = "Acceso per ${screenOn.minutes} minuti",
                            description = "Resta acceso per i minuti scelti qui sotto dall'ultimo tocco sullo schermo, poi torna come il telefono.",
                            selected = screenOn.mode == ScreenOnMode.MINUTES,
                            onSelect = { onScreenOnChange(screenOn.copy(mode = ScreenOnMode.MINUTES)) }
                        )
                    }
                    // Scegliere una durata seleziona anche l'opzione dei minuti
                    FlowRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 40.dp, top = 4.dp, bottom = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        for (minutes in ZoneSettings.MINUTE_CHOICES) {
                            FilterChip(
                                selected = screenOn.mode == ScreenOnMode.MINUTES && screenOn.minutes == minutes,
                                onClick = { onScreenOnChange(ScreenOnSetting(ScreenOnMode.MINUTES, minutes)) },
                                label = { Text("$minutes min") }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScreenOnOption(title: String, description: String, selected: Boolean, onSelect: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onSelect, role = Role.RadioButton)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Il clic lo gestisce tutta la riga
        RadioButton(selected = selected, onClick = null)
        Column(modifier = Modifier.padding(start = 16.dp)) {
            Text(text = title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
