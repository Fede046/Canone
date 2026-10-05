package com.example.musicplayer.ui.library

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.data.local.SongEntity
import com.example.musicplayer.ui.components.ArtistFilterBar
import com.example.musicplayer.ui.components.ArtistPickerDialog
import com.example.musicplayer.ui.components.RowScopeSongInfo
import com.example.musicplayer.ui.components.SongCover
import com.example.musicplayer.ui.components.SongMenuHost
import com.example.musicplayer.ui.components.formatDuration
import kotlin.random.Random

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun LibraryScreen(
    viewModel: LibraryViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val playlists by viewModel.playlists.collectAsStateWithLifecycle()
    // Brano di cui è aperto il menu (pressione prolungata)
    var menuSong by remember { mutableStateOf<SongEntity?>(null) }
    var showArtistPicker by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Barra di ricerca
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = { viewModel.setSearchQuery(it) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("Cerca canzoni o artisti...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (state.searchQuery.isNotEmpty()) {
                    IconButton(onClick = { viewModel.setSearchQuery("") }) {
                        Icon(Icons.Default.Clear, contentDescription = "Cancella")
                    }
                }
            },
            singleLine = true
        )

        // Filtro per artista: il chip apre l'elenco degli artisti, la X torna a tutti i brani
        if (state.artists.isNotEmpty()) {
            ArtistFilterBar(
                selectedArtist = state.selectedArtist,
                onOpenPicker = { showArtistPicker = true },
                onClear = { viewModel.setSelectedArtist(null) }
            )
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                state.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))

                state.songs.isEmpty() -> Text(
                    text = if (state.searchQuery.isNotEmpty())
                        "Nessun risultato per \"${state.searchQuery}\""
                    else
                        "Nessuna canzone scaricata. Vai al catalogo per scaricarne alcune.",
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp)
                )

                else -> LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(state.songs, key = { it.id }) { song ->
                        val isCurrentlyPlaying = song.id == state.playingSongId
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .combinedClickable(
                                    onClick = { viewModel.playSong(song) },
                                    onLongClick = { menuSong = song }
                                )
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            SongCover(localCoverPath = song.localCoverPath, remoteCoverUrl = song.coverUrl)
                            RowScopeSongInfo(
                                title = song.title,
                                artist = song.artist,
                                duration = remember(song.durationMs) { formatDuration(song.durationMs) },
                                modifier = Modifier.weight(1f)
                            )
                            if (isCurrentlyPlaying) {
                                NowPlayingBars(modifier = Modifier.size(24.dp))
                            }
                        }
                        Divider()
                    }
                }
            }
        }
    }

    if (showArtistPicker) {
        ArtistPickerDialog(
            artists = state.artists,
            selectedArtist = state.selectedArtist,
            totalSongCount = state.totalSongCount,
            onSelect = { artist ->
                viewModel.setSelectedArtist(artist)
                showArtistPicker = false
            },
            onDismiss = { showArtistPicker = false }
        )
    }

    SongMenuHost(
        menuSong = menuSong,
        onDismissMenu = { menuSong = null },
        playlists = playlists,
        observeContainingPlaylistIds = viewModel::observePlaylistIdsForSong,
        onAddToPlaylist = { playlist, song -> viewModel.addSongToPlaylist(playlist.id, song.id) },
        onCreatePlaylistWithSong = { name, color, song -> viewModel.createPlaylistWithSong(name, color, song.id) },
        onEditSong = { song, title, artist -> viewModel.updateSongInfo(song, title, artist) },
        onDeleteSong = { song -> viewModel.deleteSong(song) }
    )
}

/**
 * Animated equalizer bars indicating that a song is currently playing.
 * Shows 4 vertical bars that animate up and down at different speeds.
 */
@Composable
private fun NowPlayingBars(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "nowPlaying")
    val barCount = 4

    // Gli State delle animazioni si leggono solo dentro il Canvas: a ogni frame si ridisegna
    // senza ricomporre la riga.
    val anim1 = transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 400, delayMillis = 0, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar0"
    )
    val anim2 = transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 300, delayMillis = 100, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar1"
    )
    val anim3 = transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 500, delayMillis = 50, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar2"
    )
    val anim4 = transition.animateFloat(
        initialValue = 0.3f, targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 350, delayMillis = 150, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "bar3"
    )

    val barColor = MaterialTheme.colorScheme.primary

    Canvas(modifier = modifier) {
        val heights = floatArrayOf(anim1.value, anim2.value, anim3.value, anim4.value)
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
