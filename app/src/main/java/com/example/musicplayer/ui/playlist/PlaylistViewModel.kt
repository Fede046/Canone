package com.example.musicplayer.ui.playlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.local.PlaylistDao
import com.example.musicplayer.data.local.PlaylistEntity
import com.example.musicplayer.data.local.PlaylistSongCrossRef
import com.example.musicplayer.data.local.SongEntity
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.playback.controller.PlayerController
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlaylistUiState(
    val playlists: List<PlaylistEntity> = emptyList(),
    val selectedPlaylist: PlaylistEntity? = null,
    val songsInSelectedPlaylist: List<SongEntity> = emptyList(),
    val playingSongId: String? = null
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class PlaylistViewModel @Inject constructor(
    private val playlistDao: PlaylistDao,
    private val repository: SongRepository,
    private val playerController: PlayerController
) : ViewModel() {

    private val _selectedPlaylistId = MutableStateFlow<Long?>(null)

    val uiState: StateFlow<PlaylistUiState> = combine(
        playlistDao.observeAll(),
        _selectedPlaylistId.flatMapLatest { id ->
            if (id != null) playlistDao.observeSongsInPlaylist(id)
            else kotlinx.coroutines.flow.flowOf(emptyList())
        },
        _selectedPlaylistId,
        // Solo l'id del brano corrente: posizione e sleep timer non ricalcolano lo stato
        playerController.uiState.map { it.currentSongId }.distinctUntilChanged()
    ) { playlists, songsInPlaylist, selectedId, currentSongId ->
        PlaylistUiState(
            playlists = playlists,
            selectedPlaylist = playlists.find { it.id == selectedId },
            songsInSelectedPlaylist = songsInPlaylist,
            playingSongId = currentSongId
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(0), PlaylistUiState())

    /** Id delle playlist che contengono già il brano. */
    fun observePlaylistIdsForSong(songId: String): Flow<List<Long>> =
        playlistDao.observePlaylistIdsForSong(songId)

    /** Crea una playlist e ci aggiunge subito il brano. */
    fun createPlaylistWithSong(name: String, color: Long, songId: String) {
        viewModelScope.launch {
            val playlistId = playlistDao.insert(PlaylistEntity(name = name, color = color))
            playlistDao.addSongToPlaylist(PlaylistSongCrossRef(playlistId, songId))
        }
    }

    /** Salva titolo e artista modificati di un brano, solo sul telefono (come nella Libreria). */
    fun updateSongInfo(song: SongEntity, title: String, artist: String) {
        val newTitle = title.trim()
        val newArtist = artist.trim()
        if (newTitle.isEmpty() || newArtist.isEmpty()) return
        if (newTitle == song.title && newArtist == song.artist) return
        viewModelScope.launch {
            repository.updateLocalSongInfo(song.id, newTitle, newArtist)
            playerController.updateQueuedSongInfo(song.id, newTitle, newArtist)
        }
    }

    fun createPlaylist(name: String, color: Long = 0xFF8B5CF6.toLong()) {
        viewModelScope.launch {
            playlistDao.insert(PlaylistEntity(name = name, color = color))
        }
    }

    fun deletePlaylist(playlist: PlaylistEntity) {
        viewModelScope.launch {
            playlistDao.delete(playlist)
            if (_selectedPlaylistId.value == playlist.id) {
                _selectedPlaylistId.value = null
            }
        }
    }

    fun selectPlaylist(id: Long?) {
        _selectedPlaylistId.value = id
    }

    fun addSongToPlaylist(playlistId: Long, songId: String) {
        viewModelScope.launch {
            playlistDao.addSongToPlaylist(PlaylistSongCrossRef(playlistId, songId))
        }
    }

    fun removeSongFromPlaylist(playlistId: Long, songId: String) {
        viewModelScope.launch {
            playlistDao.removeSongFromPlaylist(PlaylistSongCrossRef(playlistId, songId))
        }
    }

    fun deleteSongLocally(song: SongEntity) {
        viewModelScope.launch {
            repository.deleteDownloadedSong(song)
        }
    }

    fun playSongFromPlaylist(song: SongEntity) {
        val songs = uiState.value.songsInSelectedPlaylist
        val index = songs.indexOf(song).coerceAtLeast(0)
        playerController.connect {
            playerController.playQueue(songs, index)
        }
    }
}
