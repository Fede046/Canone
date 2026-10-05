package com.example.musicplayer.ui.catalog

import android.util.Log
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.musicplayer.data.repository.DownloadState
import com.example.musicplayer.ui.components.ArtistFilterBar
import com.example.musicplayer.ui.components.ArtistPickerDialog
import com.example.musicplayer.ui.components.DownloadStatusIcon
import com.example.musicplayer.ui.components.RowScopeSongInfo
import com.example.musicplayer.ui.components.SongCover
import com.example.musicplayer.ui.components.formatDuration

@Composable
fun CatalogScreen(
    viewModel: CatalogViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var showArtistPicker by remember { mutableStateOf(false) }

    // Show limit message as snackbar
    LaunchedEffect(state.limitMessage) {
        state.limitMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    // If user is not logged in, show full-screen login instead of the catalog
    if (!state.isLoggedIn) {
        CatalogLoginScreen(
            loginErrorMessage = state.loginErrorMessage,
            isLoginLoading = state.isLoginLoading,
            onLogin = { username, password -> viewModel.login(username, password) }
        )
        return
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // User info bar (compact)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = state.loggedInUsername ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    if (state.downloadRemaining != null && state.downloadLimit != null) {
                        Text(
                            text = "Download oggi: ${state.downloadRemaining} / ${state.downloadLimit}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                TextButton(onClick = { viewModel.logout() }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Logout,
                        contentDescription = "Logout",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Logout", style = MaterialTheme.typography.bodySmall)
                }
            }

            // Search Bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.updateSearchQuery(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                placeholder = { Text("Cerca canzoni o artisti...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true
            )

            // Filtro per autore, calcolato sul catalogo già in memoria
            if (state.artists.isNotEmpty()) {
                ArtistFilterBar(
                    selectedArtist = state.selectedArtist,
                    onOpenPicker = { showArtistPicker = true },
                    onClear = { viewModel.setSelectedArtist(null) }
                )
            }

            when {
                state.isLoading -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = state.loadingMessage ?: "Caricamento in corso...",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }

                state.errorMessage != null -> Text(
                    text = "Errore: ${state.errorMessage}",
                    modifier = Modifier
                        .padding(24.dp)
                        .align(Alignment.CenterHorizontally),
                    color = MaterialTheme.colorScheme.error
                )

                state.songs.isEmpty() -> Text(
                    text = if (state.searchQuery.isEmpty()) "Nessuna canzone nel catalogo." else "Nessun risultato per \"${state.searchQuery}\"",
                    modifier = Modifier
                        .padding(24.dp)
                        .align(Alignment.CenterHorizontally)
                )

                else -> LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(state.songs, key = { it.song.id }) { item ->
                        CatalogSongRow(
                            item = item,
                            onDownloadClick = { viewModel.downloadSong(item.song) }
                        )
                        HorizontalDivider()
                    }
                }
            }
        }

        if (showArtistPicker) {
            CatalogArtistPicker(
                state = state,
                onSelect = { artist ->
                    viewModel.setSelectedArtist(artist)
                    showArtistPicker = false
                },
                onDismiss = { showArtistPicker = false }
            )
        }
    }
}

@Composable
private fun CatalogArtistPicker(
    state: CatalogUiState,
    onSelect: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    ArtistPickerDialog(
        artists = state.artists,
        selectedArtist = state.selectedArtist,
        totalSongCount = state.totalSongCount,
        onSelect = onSelect,
        onDismiss = onDismiss
    )
}

@Composable
private fun CatalogLoginScreen(
    loginErrorMessage: String?,
    isLoginLoading: Boolean,
    onLogin: (username: String, password: String) -> Unit
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // App icon / title
        Icon(
            imageVector = Icons.Default.MusicNote,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Storage Online",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Accedi per sfogliare e scaricare canzoni dal catalogo.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Error message
        if (loginErrorMessage != null) {
            Text(
                text = loginErrorMessage,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                textAlign = TextAlign.Center
            )
        }

        // Username field
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            placeholder = { Text("Inserisci username") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null
                )
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoginLoading,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Text,
                imeAction = ImeAction.Next
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Password field
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            placeholder = { Text("Inserisci password") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = null
                )
            },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoginLoading,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = { onLogin(username, password) }
            )
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Login button
        Button(
            onClick = { onLogin(username, password) },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            enabled = !isLoginLoading
        ) {
            if (isLoginLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Accedi", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

@Composable
private fun CatalogSongRow(item: CatalogSongUi, onDownloadClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                Log.d("MusicAppDebug", "CatalogSongRow: Row clicked for ${item.song.title}")
            }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SongCover(localCoverPath = null)
        RowScopeSongInfo(
            title = item.song.title,
            artist = item.song.artist,
            duration = formatDuration(item.song.duration),
            modifier = Modifier.weight(1f)
        )
        val downloading = item.downloadState as? DownloadState.Downloading
        DownloadStatusIcon(
            isDownloaded = item.downloadState is DownloadState.Downloaded,
            isDownloading = downloading != null,
            progressPercent = downloading?.percent ?: 0,
            onDownloadClick = onDownloadClick
        )
    }
}