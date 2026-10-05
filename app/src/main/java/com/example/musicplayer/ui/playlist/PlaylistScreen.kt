package com.example.musicplayer.ui.playlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.PlaylistPlay
import androidx.compose.material3.Divider
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.ui.components.CreatePlaylistDialog

@Composable
fun PlaylistScreen(
    onPlaylistClick: (Long) -> Unit,
    viewModel: PlaylistViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Nuova Playlist")
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.playlists.isEmpty()) {
                Text(
                    text = "Non hai ancora creato nessuna playlist.",
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(state.playlists) { playlist ->
                        PlaylistRow(
                            playlist = playlist,
                            onClick = { onPlaylistClick(playlist.id) }
                        )
                        Divider()
                    }
                }
            }
        }

        if (showCreateDialog) {
            CreatePlaylistDialog(
                onDismiss = { showCreateDialog = false },
                onConfirm = { name, color ->
                    viewModel.createPlaylist(name, color)
                    showCreateDialog = false
                }
            )
        }
    }
}

@Composable
private fun PlaylistRow(
    playlist: PlaylistEntity,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(playlist.color.toInt())),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.PlaylistPlay,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
        Text(
            text = playlist.name,
            modifier = Modifier
                .weight(1f)
                .padding(start = 16.dp),
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
