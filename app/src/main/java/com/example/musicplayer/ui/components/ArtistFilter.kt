package com.example.musicplayer.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** Un artista fra le scelte del filtro, con il numero dei suoi brani. */
data class ArtistFilterOption(
    val name: String,
    val songCount: Int
)

/**
 * Raggruppa gli artisti (confronto esatto sul testo) e li ordina alfabeticamente,
 * senza distinguere maiuscole e minuscole.
 */
fun buildArtistOptions(artists: List<String>): List<ArtistFilterOption> =
    artists.groupingBy { it }.eachCount()
        .map { (name, count) -> ArtistFilterOption(name, count) }
        .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.name })

/**
 * Riga del filtro per artista: il chip apre l'elenco degli artisti, la X torna a tutti i brani.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArtistFilterBar(
    selectedArtist: String?,
    onOpenPicker: () -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        FilterChip(
            selected = selectedArtist != null,
            onClick = onOpenPicker,
            label = {
                Text(
                    text = selectedArtist ?: "Tutti gli artisti",
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            },
            trailingIcon = {
                Icon(
                    imageVector = Icons.Default.ArrowDropDown,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            },
            modifier = Modifier.weight(1f, fill = false)
        )
        if (selectedArtist != null) {
            IconButton(onClick = onClear) {
                Icon(Icons.Default.Clear, contentDescription = "Mostra tutti gli artisti")
            }
        }
    }
}

/**
 * Elenco degli artisti fra cui scegliere il filtro. La prima voce torna a tutti i brani.
 */
@Composable
fun ArtistPickerDialog(
    artists: List<ArtistFilterOption>,
    selectedArtist: String?,
    totalSongCount: Int,
    onSelect: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Scegli artista") },
        text = {
            LazyColumn(modifier = Modifier.heightIn(max = 420.dp)) {
                item(key = "all") {
                    ArtistPickerRow(
                        name = "Tutti gli artisti",
                        songCount = totalSongCount,
                        isSelected = selectedArtist == null,
                        onClick = { onSelect(null) }
                    )
                }
                items(artists, key = { "artist_" + it.name }) { option ->
                    ArtistPickerRow(
                        name = option.name,
                        songCount = option.songCount,
                        isSelected = option.name == selectedArtist,
                        onClick = { onSelect(option.name) }
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Chiudi")
            }
        }
    )
}

@Composable
private fun ArtistPickerRow(
    name: String,
    songCount: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.bodyLarge,
            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = if (songCount == 1) "1 brano" else "$songCount brani",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 8.dp)
        )
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Selezionato",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(20.dp)
            )
        }
    }
}
