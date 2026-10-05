package com.example.musicplayer.ui.playlist

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlaylistPlay
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.data.local.SongEntity
import com.example.musicplayer.ui.components.RowScopeSongInfo
import com.example.musicplayer.ui.components.SongAction
import com.example.musicplayer.ui.components.SongCover
import com.example.musicplayer.ui.components.SongMenuHost
import com.example.musicplayer.ui.components.formatDuration

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun PlaylistDetailScreen(
    playlistId: Long,
    onBack: () -> Unit,
    viewModel: PlaylistViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // Brano di cui è aperto il menu (pressione prolungata)
    var menuSong by remember { mutableStateOf<SongEntity?>(null) }
    var showDeletePlaylistDialog by remember { mutableStateOf(false) }

    LaunchedEffect(playlistId) {
        viewModel.selectPlaylist(playlistId)
    }

    val playlistColor = state.selectedPlaylist?.color?.let { Color(it.toInt()) } ?: MaterialTheme.colorScheme.primary

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(playlistColor),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.PlaylistPlay,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.padding(start = 8.dp))
                        Text(state.selectedPlaylist?.name ?: "Playlist")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Indietro")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { showDeletePlaylistDialog = true },
                        modifier = Modifier.padding(end = 4.dp)
                    ) {
                        Text(
                            "Elimina",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.songsInSelectedPlaylist.isEmpty()) {
                Text(
                    text = "Nessuna canzone in questa playlist.\n\nPer aggiungerne una, tieni premuto un brano " +
                            "nella Libreria e scegli \"Aggiungi a playlist\".",
                    modifier = Modifier.padding(24.dp)
                )
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(state.songsInSelectedPlaylist, key = { it.id }) { song ->
                        val isCurrentlyPlaying = song.id == state.playingSongId
                        PlaylistSongRow(
                            song = song,
                            isCurrentlyPlaying = isCurrentlyPlaying,
                            onClick = { viewModel.playSongFromPlaylist(song) },
                            onLongClick = { menuSong = song }
                        )
                        Divider()
                    }
                }
            }
        }

        SongMenuHost(
            menuSong = menuSong,
            onDismissMenu = { menuSong = null },
            // Finché la playlist corrente non è caricata l'elenco non è ancora pronto
            playlists = state.playlists.takeIf { state.selectedPlaylist != null },
            observeContainingPlaylistIds = viewModel::observePlaylistIdsForSong,
            onAddToPlaylist = { playlist, song -> viewModel.addSongToPlaylist(playlist.id, song.id) },
            onCreatePlaylistWithSong = { name, color, song -> viewModel.createPlaylistWithSong(name, color, song.id) },
            onEditSong = { song, title, artist -> viewModel.updateSongInfo(song, title, artist) },
            onDeleteSong = { song -> viewModel.deleteSongLocally(song) },
            extraActions = { song ->
                listOf(
                    SongAction(Icons.Default.RemoveCircleOutline, "Rimuovi dalla playlist") {
                        viewModel.removeSongFromPlaylist(playlistId, song.id)
                    }
                )
            }
        )

        if (showDeletePlaylistDialog) {
            AlertDialog(
                onDismissRequest = { showDeletePlaylistDialog = false },
                title = { Text("Elimina playlist") },
                text = {
                    Text("Vuoi eliminare definitivamente la playlist \"${state.selectedPlaylist?.name}\"?")
                },
                confirmButton = {
                    TextButton(onClick = {
                        state.selectedPlaylist?.let { viewModel.deletePlaylist(it) }
                        showDeletePlaylistDialog = false
                        onBack()
                    }) {
                        Text("Elimina", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeletePlaylistDialog = false }) {
                        Text("Annulla")
                    }
                }
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun PlaylistSongRow(
    song: SongEntity,
    isCurrentlyPlaying: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SongCover(localCoverPath = song.localCoverPath, remoteCoverUrl = song.coverUrl)
        RowScopeSongInfo(
            title = song.title,
            artist = song.artist,
            duration = formatDuration(song.durationMs),
            modifier = Modifier.weight(1f)
        )
        if (isCurrentlyPlaying) {
            NowPlayingBars(modifier = Modifier.size(24.dp))
        }
    }
}

/**
 * Animated equalizer bars indicating that a song is currently playing.
 * Shows 4 vertical bars that animate up and down at different speeds.
 */
@Composable
private fun NowPlayingBars(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "nowPlaying")
    val barCount = 4

    val anim1 by transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 400, delayMillis = 0, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar0"
    )
    val anim2 by transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 300, delayMillis = 100, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar1"
    )
    val anim3 by transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 500, delayMillis = 50, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar2"
    )
    val anim4 by transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 350, delayMillis = 150, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar3"
    )

    val heights = floatArrayOf(anim1, anim2, anim3, anim4)

    val barColor = MaterialTheme.colorScheme.primary

    Canvas(modifier = modifier) {
        val barWidth = size.width / (barCount * 2)
        val maxHeight = size.height
        for (i in 0 until barCount) {
            val heightFraction = heights[i]
            val barHeight = maxHeight * heightFraction
            val x = i * barWidth * 2 + barWidth / 2
            drawRect(
                color = barColor,
                topLeft = Offset(x, maxHeight - barHeight),
                size = androidx.compose.ui.geometry.Size(barWidth * 0.6f, barHeight)
            )
        }
    }
}
