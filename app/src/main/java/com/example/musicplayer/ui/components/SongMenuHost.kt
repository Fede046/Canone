package com.example.musicplayer.ui.components

import android.widget.Toast
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.data.local.SongEntity
import kotlinx.coroutines.flow.Flow

/**
 * Gestisce tutto ciò che parte dalla pressione prolungata su un brano: il menu delle azioni,
 * la scelta della playlist, la creazione di una playlist nuova, la modifica di titolo e artista
 * e la conferma dell'eliminazione. Usato da Libreria e dettaglio playlist.
 *
 * @param menuSong brano di cui è aperto il menu; null = menu chiuso.
 * @param extraActions voci in più dopo "Aggiungi a playlist" (es. "Rimuovi dalla playlist").
 */
@Composable
fun SongMenuHost(
    menuSong: SongEntity?,
    onDismissMenu: () -> Unit,
    playlists: List<PlaylistEntity>?,
    observeContainingPlaylistIds: (songId: String) -> Flow<List<Long>>,
    onAddToPlaylist: (playlist: PlaylistEntity, song: SongEntity) -> Unit,
    onCreatePlaylistWithSong: (name: String, color: Long, song: SongEntity) -> Unit,
    onEditSong: (song: SongEntity, title: String, artist: String) -> Unit,
    onDeleteSong: (song: SongEntity) -> Unit,
    extraActions: (song: SongEntity) -> List<SongAction> = { emptyList() }
) {
    val context = LocalContext.current
    var songForPlaylist by remember { mutableStateOf<SongEntity?>(null) }
    var songForNewPlaylist by remember { mutableStateOf<SongEntity?>(null) }
    var songBeingEdited by remember { mutableStateOf<SongEntity?>(null) }
    var songPendingDeletion by remember { mutableStateOf<SongEntity?>(null) }

    menuSong?.let { song ->
        SongActionsSheet(
            song = song,
            actions = buildList {
                add(SongAction(Icons.AutoMirrored.Filled.PlaylistAdd, "Aggiungi a playlist") {
                    songForPlaylist = song
                })
                addAll(extraActions(song))
                add(SongAction(Icons.Default.Edit, "Modifica titolo e artista") {
                    songBeingEdited = song
                })
                add(SongAction(Icons.Default.Delete, "Elimina dal telefono", isDestructive = true) {
                    songPendingDeletion = song
                })
            },
            onDismiss = onDismissMenu
        )
    }

    songForPlaylist?.let { song ->
        val containingIds by remember(song.id) { observeContainingPlaylistIds(song.id) }
            .collectAsStateWithLifecycle(initialValue = emptyList())
        AddToPlaylistSheet(
            song = song,
            playlists = playlists,
            containingPlaylistIds = containingIds.toSet(),
            onAdd = { playlist ->
                onAddToPlaylist(playlist, song)
                Toast.makeText(context, "Aggiunto a \"${playlist.name}\"", Toast.LENGTH_SHORT).show()
            },
            onCreateNew = { songForNewPlaylist = song },
            onDismiss = { songForPlaylist = null }
        )
    }

    songForNewPlaylist?.let { song ->
        CreatePlaylistDialog(
            onDismiss = { songForNewPlaylist = null },
            onConfirm = { name, color ->
                onCreatePlaylistWithSong(name, color, song)
                songForNewPlaylist = null
                Toast.makeText(context, "Playlist \"$name\" creata con il brano", Toast.LENGTH_SHORT).show()
            }
        )
    }

    songBeingEdited?.let { song ->
        EditSongDialog(
            song = song,
            onDismiss = { songBeingEdited = null },
            onConfirm = { title, artist ->
                onEditSong(song, title, artist)
                songBeingEdited = null
            }
        )
    }

    songPendingDeletion?.let { song ->
        AlertDialog(
            onDismissRequest = { songPendingDeletion = null },
            title = { Text("Elimina canzone") },
            text = { Text("Vuoi eliminare definitivamente \"${song.title}\" dal telefono?") },
            confirmButton = {
                TextButton(onClick = {
                    onDeleteSong(song)
                    songPendingDeletion = null
                }) {
                    Text("Elimina", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { songPendingDeletion = null }) {
                    Text("Annulla")
                }
            }
        )
    }
}
