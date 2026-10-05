package com.example.musicplayer.ui.player

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlaylistAdd
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.RepeatOne
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.Player
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.ui.components.MarqueeText
import com.example.musicplayer.ui.components.SongCover
import com.example.musicplayer.ui.components.formatDuration
import com.example.musicplayer.ui.zone.Zone
import kotlinx.coroutines.delay

/** Mini-player persistente, mostrato in fondo alla schermata quando c'e' una canzone attiva. */
@Composable
fun MiniPlayerBar(
    onExpandClick: () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playback = uiState

    if (playback.currentSongId == null) return

    Surface(
        tonalElevation = 4.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onExpandClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            SongCover(localCoverPath = playback.coverPath, remoteCoverUrl = playback.coverUrl)
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                MarqueeText(
                    text = if (playback.title.isNotEmpty()) playback.title else "Nessuna canzone",
                    style = MaterialTheme.typography.bodyLarge,
                    speedMsPerChar = 60,
                    pauseMs = 800
                )
                MarqueeText(
                    text = if (playback.artist.isNotEmpty()) playback.artist else "Artista sconosciuto",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    speedMsPerChar = 60,
                    pauseMs = 800
                )
            }
            IconButton(onClick = { viewModel.togglePlayPause() }) {
                Icon(
                    imageVector = if (playback.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (playback.isPlaying) "Pausa" else "Play"
                )
            }
        }
    }
}

/** Schermata player espansa, con copertina grande, seek bar e controlli. */
@Composable
fun ExpandedPlayerScreen(
    onBackClick: () -> Unit,
    activeZone: Zone?,
    onOpenZone: (Zone) -> Unit,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playback = uiState
    var showPlaylistDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onBackClick, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(
                    imageVector = Icons.Default.KeyboardArrowDown,
                    contentDescription = "Chiudi",
                    modifier = Modifier.size(32.dp)
                )
            }
            Text(
                text = "In riproduzione",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.align(Alignment.Center)
            )
            // Pulsante Aggiungi a playlist
            IconButton(
                onClick = { showPlaylistDialog = true },
                modifier = Modifier.align(Alignment.CenterEnd)
            ) {
                Icon(
                    imageVector = Icons.Default.PlaylistAdd,
                    contentDescription = "Aggiungi a playlist",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // La copertina prende lo spazio che resta (al massimo 300 dp): sugli schermi bassi,
        // o con caratteri e visualizzazione ingranditi, si rimpicciolisce lei e non i controlli
        BoxWithConstraints(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            val coverSize = minOf(maxWidth, maxHeight, 300.dp)
            SongCover(localCoverPath = playback.coverPath, remoteCoverUrl = playback.coverUrl, modifier = Modifier.size(coverSize))
        }

        Spacer(modifier = Modifier.height(24.dp))

        MarqueeText(
            text = if (playback.title.isNotEmpty()) playback.title else "Sconosciuto",
            style = MaterialTheme.typography.headlineSmall,
            speedMsPerChar = 80,
            pauseMs = 1500
        )
        MarqueeText(
            text = if (playback.artist.isNotEmpty()) playback.artist else "Artista sconosciuto",
            style = MaterialTheme.typography.bodyLarge.copy(
                color = MaterialTheme.colorScheme.onSurfaceVariant
            ),
            speedMsPerChar = 80,
            pauseMs = 1500
        )

        Spacer(modifier = Modifier.height(16.dp))

        PlaybackProgress(
            isPlaying = playback.isPlaying,
            durationMs = playback.durationMs,
            viewModel = viewModel
        )

        // Riga principale: Precedente | Play/Pause | Successiva
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            IconButton(onClick = { viewModel.skipToPrevious() }) {
                Icon(
                    imageVector = Icons.Default.SkipPrevious,
                    contentDescription = "Precedente",
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            IconButton(
                onClick = { viewModel.togglePlayPause() },
                modifier = Modifier.size(80.dp)
            ) {
                Icon(
                    imageVector = if (playback.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (playback.isPlaying) "Pausa" else "Play",
                    modifier = Modifier.size(64.dp)
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            IconButton(onClick = { viewModel.skipToNext() }) {
                Icon(
                    imageVector = Icons.Default.SkipNext,
                    contentDescription = "Successiva",
                    modifier = Modifier.size(36.dp)
                )
            }
        }

        // Riga secondaria: Shuffle | Repeat | Timer | MZ | CZ | FZ.
        // Ogni pulsante ha una parte uguale della larghezza, così nessuno esce dallo schermo
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val slot = Modifier.weight(1f)

            // Pulsante Shuffle
            IconButton(onClick = { viewModel.toggleShuffle() }, modifier = slot) {
                Icon(
                    imageVector = Icons.Default.Shuffle,
                    contentDescription = "Casuale",
                    tint = if (playback.shuffleModeEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                )
            }

            // Pulsante Repeat (cicla OFF -> ONE -> ALL -> OFF)
            IconButton(onClick = { viewModel.toggleRepeatMode() }, modifier = slot) {
                Icon(
                    imageVector = when (playback.repeatMode) {
                        Player.REPEAT_MODE_ONE -> Icons.Default.RepeatOne
                        else -> Icons.Default.Repeat
                    },
                    contentDescription = when (playback.repeatMode) {
                        Player.REPEAT_MODE_ONE -> "Ripeti una canzone"
                        Player.REPEAT_MODE_ALL -> "Ripeti playlist"
                        else -> "Ripeti"
                    },
                    tint = if (playback.repeatMode != Player.REPEAT_MODE_OFF)
                        MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                )
            }

            SleepTimerButton(viewModel = viewModel, modifier = slot)

            // Music Zone, Circle Zone e Firewatch Zone: visualizzatori a schermo intero; restano attivi anche per i brani successivi
            ZoneButton("MZ", "Music Zone", activeZone == Zone.MUSIC, slot) { onOpenZone(Zone.MUSIC) }
            ZoneButton("CZ", "Circle Zone", activeZone == Zone.CIRCLE, slot) { onOpenZone(Zone.CIRCLE) }
            ZoneButton("FZ", "Firewatch Zone", activeZone == Zone.FIRE, slot) { onOpenZone(Zone.FIRE) }
        }
    }

    if (showPlaylistDialog && playback.currentSongId != null) {
        AddToPlaylistDialog(
            viewModel = viewModel,
            onDismiss = { showPlaylistDialog = false }
        )
    }
}

/** Tasto testuale di una modalità a schermo intero (MZ, CZ): colorato quando è attiva. */
@Composable
private fun ZoneButton(
    label: String,
    description: String,
    isActive: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    IconButton(onClick = onClick, modifier = modifier) {
        Text(
            text = label,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            softWrap = false,
            style = MaterialTheme.typography.titleMedium,
            color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.semantics { contentDescription = description }
        )
    }
}

/**
 * Barra di avanzamento con i tempi. Sta in un composable separato perché la posizione
 * cambia ogni 250 ms: così si ricompone solo questa parte, non tutta la schermata
 * né l'eventuale finestra "Aggiungi a playlist" aperta sopra.
 */
@Composable
private fun PlaybackProgress(
    isPlaying: Boolean,
    durationMs: Long,
    viewModel: PlayerViewModel
) {
    var currentPositionMs by remember { mutableLongStateOf(0L) }

    // Aggiorna la posizione con un timer UI-driven SOLO quando questa schermata è visibile
    // e il player sta riproducendo. Quando la schermata scompare, la coroutine si ferma automaticamente.
    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            while (true) {
                currentPositionMs = viewModel.currentPosition()
                delay(250L)
            }
        }
    }

    Slider(
        value = currentPositionMs.toFloat().coerceIn(0f, durationMs.toFloat().coerceAtLeast(1f)),
        onValueChange = { viewModel.seekTo(it.toLong()) },
        valueRange = 0f..durationMs.toFloat().coerceAtLeast(1f),
        modifier = Modifier.fillMaxWidth()
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = formatDuration(currentPositionMs), style = MaterialTheme.typography.bodySmall)
        Text(text = formatDuration(durationMs), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun AddToPlaylistDialog(
    viewModel: PlayerViewModel,
    onDismiss: () -> Unit
) {
    val playlists by viewModel.playlists.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier.fillMaxWidth(0.9f),
        title = { Text("Aggiungi a playlist") },
        text = {
            Column {
                val loadedPlaylists = playlists
                if (loadedPlaylists == null) {
                    // Elenco non ancora letto dal database: niente messaggio "nessuna playlist"
                    Spacer(modifier = Modifier.height(48.dp))
                } else if (loadedPlaylists.isEmpty()) {
                    Text(
                        "Non hai ancora playlist. Creane una!",
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                        items(loadedPlaylists, key = { it.id }) { playlist ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.addCurrentSongToPlaylist(playlist.id)
                                        onDismiss()
                                    }
                                    .padding(vertical = 12.dp, horizontal = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = playlist.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Row {
                TextButton(onClick = { showCreateDialog = true }) {
                    Text("Nuova Playlist")
                }
                TextButton(onClick = onDismiss) { Text("Annulla") }
            }
        }
    )

    if (showCreateDialog) {
        CreatePlaylistDialog(
            onDismiss = { showCreateDialog = false },
            onConfirm = { name ->
                viewModel.createPlaylist(name)
                showCreateDialog = false
            }
        )
    }
}

@Composable
private fun CreatePlaylistDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nuova Playlist") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                placeholder = { Text("Nome playlist") },
                singleLine = true
            )
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onConfirm(name) }) {
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

/**
 * Pulsante sleep timer. Se il timer è attivo mostra il tempo rimanente
 * e con un click lo cancella. Se non è attivo mostra un dialog per impostarlo.
 */
@Composable
private fun SleepTimerButton(viewModel: PlayerViewModel, modifier: Modifier = Modifier) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val sleepTimerMs = uiState.sleepTimerRemainingMs
    var showDialog by remember { mutableStateOf(false) }

    if (sleepTimerMs > 0) {
        // Timer attivo: mostra minuti rimanenti, click per cancellare
        IconButton(onClick = { viewModel.cancelSleepTimer() }, modifier = modifier) {
            Box {
                Icon(
                    imageVector = Icons.Default.Timer,
                    contentDescription = "Sleep timer attivo",
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "${(sleepTimerMs / 60000)}m",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.align(Alignment.BottomEnd)
                )
            }
        }
    } else {
        // Nessun timer
        IconButton(onClick = { showDialog = true }, modifier = modifier) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = "Sleep timer",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Sleep Timer") },
            text = {
                Column {
                    Text("Ferma la riproduzione tra...")
                    Spacer(modifier = Modifier.height(16.dp))
                    listOf(
                        15L to "15 minuti",
                        30L to "30 minuti",
                        45L to "45 minuti",
                        60L to "1 ora",
                        90L to "1 ora e mezza"
                    ).forEach { (minutes, label) ->
                        TextButton(
                            onClick = {
                                viewModel.setSleepTimer(minutes * 60 * 1000L)
                                showDialog = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(label)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Annulla")
                }
            }
        )
    }
}