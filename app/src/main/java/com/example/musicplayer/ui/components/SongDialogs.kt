package com.example.musicplayer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.musicplayer.data.local.SongEntity

/** Palette predefinita dei colori delle playlist (ARGB). */
val PLAYLIST_COLORS = listOf(
    0xFF8B5CF6.toInt(), // Viola (predefinito)
    0xFF1DB954.toInt(), // Verde
    0xFFE53935.toInt(), // Rosso
    0xFFFB8C00.toInt(), // Arancione
    0xFFFDD835.toInt(), // Giallo
    0xFF039BE5.toInt(), // Azzurro
    0xFF5E35B1.toInt(), // Viola scuro
    0xFFD81B60.toInt(), // Rosa
    0xFF00ACC1.toInt(), // Ciano
    0xFF6D4C41.toInt()  // Marrone
)

/**
 * Dialogo per modificare titolo e artista di un singolo brano.
 * Nessuno dei due campi può restare vuoto: in quel caso "Salva" è disabilitato.
 */
@Composable
fun EditSongDialog(
    song: SongEntity,
    onDismiss: () -> Unit,
    onConfirm: (title: String, artist: String) -> Unit
) {
    var title by remember(song.id) { mutableStateOf(song.title) }
    var artist by remember(song.id) { mutableStateOf(song.artist) }
    val isTitleBlank = title.isBlank()
    val isArtistBlank = artist.isBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Modifica brano") },
        text = {
            Column {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Titolo") },
                    singleLine = true,
                    isError = isTitleBlank,
                    supportingText = if (isTitleBlank) {
                        { Text("Il titolo non può essere vuoto") }
                    } else null,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = artist,
                    onValueChange = { artist = it },
                    label = { Text("Artista") },
                    singleLine = true,
                    isError = isArtistBlank,
                    supportingText = if (isArtistBlank) {
                        { Text("L'artista non può essere vuoto") }
                    } else null,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "La modifica vale solo su questo telefono: il catalogo online non cambia.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(title, artist) },
                enabled = !isTitleBlank && !isArtistBlank
            ) {
                Text("Salva")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annulla")
            }
        }
    )
}

/**
 * Dialogo di creazione di una playlist: nome e colore.
 * [onConfirm] riceve il nome già ripulito dagli spazi e il colore ARGB.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CreatePlaylistDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, color: Long) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedColor by remember { mutableStateOf(PLAYLIST_COLORS.first().toLong()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nuova Playlist") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Nome playlist") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                Text(
                    text = "Scegli un colore:",
                    style = MaterialTheme.typography.labelLarge
                )
                FlowRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    PLAYLIST_COLORS.forEach { colorInt ->
                        val isSelected = colorInt.toLong() == selectedColor
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Color(colorInt))
                                .clickable { selectedColor = colorInt.toLong() }
                                .then(
                                    if (isSelected) Modifier.padding(2.dp) else Modifier
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.3f))
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(name.trim(), selectedColor) },
                enabled = name.isNotBlank()
            ) {
                Text("Crea")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annulla")
            }
        }
    )
}
