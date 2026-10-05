package com.example.musicplayer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import java.io.File
import java.util.concurrent.TimeUnit

fun formatDuration(durationMs: Long): String {
    val minutes = TimeUnit.MILLISECONDS.toMinutes(durationMs)
    val seconds = TimeUnit.MILLISECONDS.toSeconds(durationMs) % 60
    return String.format("%d:%02d", minutes, seconds)
}

@Composable
fun SongCover(
    localCoverPath: String?,
    remoteCoverUrl: String? = null,
    modifier: Modifier = Modifier
) {
    // Nessun controllo File.exists() qui: girerebbe sul main thread a ogni composizione
    // della riga. Coil legge il file in background; se il file locale manca o non si
    // decodifica, onError passa all'URL remoto.
    var localFailed by remember(localCoverPath) { mutableStateOf(false) }
    val imageModel: Any? = when {
        !localCoverPath.isNullOrBlank() && !localFailed -> File(localCoverPath)
        !remoteCoverUrl.isNullOrBlank() -> remoteCoverUrl
        else -> null
    }

    Box(
        modifier = modifier
            .size(52.dp)
            .clip(RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (imageModel != null) {
            AsyncImage(
                model = imageModel,
                contentDescription = null,
                modifier = Modifier.fillMaxWidth(),
                contentScale = ContentScale.Crop,
                onError = {
                    if (imageModel is File) localFailed = true
                }
            )
        } else {
            Icon(
                imageVector = Icons.Default.MusicNote,
                contentDescription = null,
                tint = Color.Gray
            )
        }
    }
}

@Composable
fun RowScopeSongInfo(title: String, artist: String, duration: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(start = 12.dp)) {
        Text(text = title, style = MaterialTheme.typography.bodyLarge, maxLines = 1)
        Text(
            text = "$artist  •  $duration",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

/** Trailing icon per lo stato di download nel catalogo. */
@Composable
fun DownloadStatusIcon(
    isDownloaded: Boolean,
    isDownloading: Boolean,
    progressPercent: Int,
    onDownloadClick: () -> Unit
) {
    when {
        isDownloaded -> Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "Scaricata",
            tint = MaterialTheme.colorScheme.primary
        )
        isDownloading -> Box(contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                progress = { progressPercent / 100f },
                modifier = Modifier.size(28.dp)
            )
        }
        else -> IconButton(onClick = onDownloadClick) {
            Icon(imageVector = Icons.Default.Download, contentDescription = "Scarica")
        }
    }
}
