package com.example.musicplayer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.data.local.SongEntity
import kotlinx.coroutines.launch

/** Una voce del menu che si apre tenendo premuto un brano. */
data class SongAction(
    val icon: ImageVector,
    val label: String,
    val isDestructive: Boolean = false,
    val onClick: () -> Unit
)

/**
 * Menu dal basso con le azioni su un brano (si apre con la pressione prolungata).
 * Toccando una voce il pannello si chiude con l'animazione e poi parte l'azione.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongActionsSheet(
    song: SongEntity,
    actions: List<SongAction>,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.navigationBarsPadding()) {
            SheetSongHeader(song)
            HorizontalDivider()
            actions.forEach { action ->
                SheetRow(
                    icon = action.icon,
                    label = action.label,
                    tint = if (action.isDestructive) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurface,
                    onClick = {
                        scope.launch { sheetState.hide() }.invokeOnCompletion {
                            onDismiss()
                            action.onClick()
                        }
                    }
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

/**
 * Scelta della playlist a cui aggiungere un brano. Le playlist che lo contengono già
 * sono segnate con la spunta e non sono selezionabili; "Nuova playlist" ne crea una
 * e ci aggiunge subito il brano.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddToPlaylistSheet(
    song: SongEntity,
    playlists: List<PlaylistEntity>?,
    containingPlaylistIds: Set<Long>,
    onAdd: (PlaylistEntity) -> Unit,
    onCreateNew: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    fun closeThen(action: () -> Unit) {
        scope.launch { sheetState.hide() }.invokeOnCompletion {
            onDismiss()
            action()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.navigationBarsPadding()) {
            Text(
                text = "Aggiungi a playlist",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )
            SheetSongHeader(song)
            HorizontalDivider()
            SheetRow(
                icon = Icons.Default.Add,
                label = "Nuova playlist",
                tint = MaterialTheme.colorScheme.primary,
                onClick = { closeThen(onCreateNew) }
            )
            when {
                // Elenco non ancora letto dal database
                playlists == null -> Spacer(modifier = Modifier.height(48.dp))
                playlists.isEmpty() -> Text(
                    text = "Non hai ancora playlist: creane una qui sopra.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
                )
                else -> LazyColumn(modifier = Modifier.heightIn(max = 420.dp)) {
                    items(playlists, key = { it.id }) { playlist ->
                        val alreadyThere = playlist.id in containingPlaylistIds
                        PlaylistChoiceRow(
                            playlist = playlist,
                            alreadyThere = alreadyThere,
                            onClick = { closeThen { onAdd(playlist) } }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SheetSongHeader(song: SongEntity) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SongCover(localCoverPath = song.localCoverPath, remoteCoverUrl = song.coverUrl)
        Column(modifier = Modifier.padding(start = 12.dp)) {
            Text(
                text = song.title,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = song.artist,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SheetRow(
    icon: ImageVector,
    label: String,
    tint: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint)
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = tint,
            modifier = Modifier.padding(start = 20.dp)
        )
    }
}

@Composable
private fun PlaylistChoiceRow(
    playlist: PlaylistEntity,
    alreadyThere: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !alreadyThere, onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(playlist.color.toInt())),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.PlaylistPlay,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 16.dp)
        ) {
            Text(
                text = playlist.name,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (alreadyThere) {
                Text(
                    text = "Già presente",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (alreadyThere) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}
