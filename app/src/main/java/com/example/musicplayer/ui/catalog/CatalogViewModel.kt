package com.example.musicplayer.ui.catalog

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicplayer.data.remote.RemoteSong
import com.example.musicplayer.data.repository.DownloadLimitResult
import com.example.musicplayer.data.repository.DownloadState
import com.example.musicplayer.data.repository.LoginResult
import com.example.musicplayer.data.repository.SongRepository
import com.example.musicplayer.data.repository.UserRepository
import com.example.musicplayer.ui.components.ArtistFilterOption
import com.example.musicplayer.ui.components.buildArtistOptions
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CatalogSongUi(
    val song: RemoteSong,
    val downloadState: DownloadState
)

data class CatalogUiState(
    val isLoading: Boolean = false,
    val loadingMessage: String? = null,
    val songs: List<CatalogSongUi> = emptyList(),
    val searchQuery: String = "",
    /** Autori del catalogo dell'utente, ricavati dall'elenco già in memoria. */
    val artists: List<ArtistFilterOption> = emptyList(),
    /** Autore scelto nel filtro; null = tutto il catalogo. */
    val selectedArtist: String? = null,
    /** Numero totale di brani del catalogo, senza filtri. */
    val totalSongCount: Int = 0,
    val errorMessage: String? = null,
    // Login / User state
    val isLoggedIn: Boolean = false,
    val loggedInUsername: String? = null,
    val loginErrorMessage: String? = null,
    val isLoginLoading: Boolean = false,
    // Download limit info
    val downloadRemaining: Int? = null,
    val downloadLimit: Int? = null,
    val limitMessage: String? = null
)

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val repository: SongRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _selectedArtist = MutableStateFlow<String?>(null)
    private val _artistOptions = MutableStateFlow<List<ArtistFilterOption>>(emptyList())
    private val _searchResults = MutableStateFlow<List<RemoteSong>>(emptyList())
    private val _loadingState = MutableStateFlow(false)
    private val _loadingMessage = MutableStateFlow<String?>(null)

    private val _isLoggedIn = MutableStateFlow(userRepository.isLoggedIn())
    private val _loggedInUsername = MutableStateFlow(userRepository.getLoggedInUsername())
    private val _loginErrorMessage = MutableStateFlow<String?>(null)
    private val _isLoginLoading = MutableStateFlow(false)
    private val _downloadRemaining = MutableStateFlow<Int?>(null)
    private val _downloadLimit = MutableStateFlow<Int?>(null)
    private val _limitMessage = MutableStateFlow<String?>(null)

    // Flow combinato per tutte le info relative ai download (stati, id scaricati, limiti)
    private val downloadInfoFlow = combine(
        repository.downloadStates,
        repository.observeDownloadedIds(),
        _downloadRemaining,
        _downloadLimit,
        _limitMessage
    ) { states, ids, remaining, limit, msg ->
        DownloadInfo(states, ids, remaining, limit, msg)
    }

    // Stato dei filtri (ricerca e autore) raggruppato per restare nel limite di 5 flussi di combine
    private val filterInfoFlow = combine(
        _searchQuery,
        _selectedArtist,
        _artistOptions
    ) { query, artist, options ->
        FilterInfo(query, artist, options)
    }

    private data class FilterInfo(
        val query: String,
        val selectedArtist: String?,
        val artistOptions: List<ArtistFilterOption>
    )

    private data class DownloadInfo(
        val downloadStates: Map<String, DownloadState>,
        val downloadedIds: List<String>,
        val remaining: Int?,
        val limit: Int?,
        val limitMessage: String?
    )

    val uiState: StateFlow<CatalogUiState> = combine(
        _loadingState,
        _loadingMessage,
        filterInfoFlow,
        _searchResults,
        downloadInfoFlow
    ) { loading: Boolean, loadingMessage: String?, filters: FilterInfo, songs: List<RemoteSong>, info: DownloadInfo ->
        val query = filters.query

        if (loading) {
            return@combine CatalogUiState(
                isLoading = true, loadingMessage = loadingMessage, searchQuery = query,
                isLoggedIn = _isLoggedIn.value,
                loggedInUsername = _loggedInUsername.value,
                loginErrorMessage = _loginErrorMessage.value,
                isLoginLoading = _isLoginLoading.value,
                downloadRemaining = info.remaining,
                downloadLimit = info.limit,
                limitMessage = info.limitMessage
            )
        }

        val downloadedSet = info.downloadedIds.toSet()
        val songsUi = songs.map { song ->
            val state = info.downloadStates[song.id]
                ?: if (song.id in downloadedSet) DownloadState.Downloaded else DownloadState.NotDownloaded
            CatalogSongUi(song, state)
        }

        CatalogUiState(
            isLoading = false, songs = songsUi,
            searchQuery = query,
            artists = filters.artistOptions,
            selectedArtist = filters.selectedArtist,
            totalSongCount = allSongs.size,
            isLoggedIn = _isLoggedIn.value,
            loggedInUsername = _loggedInUsername.value,
            loginErrorMessage = _loginErrorMessage.value,
            isLoginLoading = _isLoginLoading.value,
            downloadRemaining = info.remaining,
            downloadLimit = info.limit,
            limitMessage = info.limitMessage
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(0), CatalogUiState())

    init {
        if (_isLoggedIn.value) {
            // Ripristina sessione: imposta l'utente per il catalogo e carica i limiti
            val username = _loggedInUsername.value
            if (username != null) {
                repository.setCatalogUser(username)
                observeCatalogForUser()
            }
            refreshDownloadLimitInfo()
        } else {
            // Nessun utente loggato: nessuna canzone visibile (filtro vuoto)
            repository.setCatalogUser(null)
            _loadingState.value = false
        }
    }

    /**
     * Osserva il catalogo filtrato per l'utente loggato.
     * Quando la cache Room emette dati, disattiva il caricamento.
     */
    private fun observeCatalogForUser() {
        viewModelScope.launch {
            repository.observeCachedCatalog().collect { songs ->
                // Appena arrivano dati dalla cache (anche vuoti), disattiva il caricamento
                _loadingState.value = false
                allSongs = songs
                _artistOptions.value = buildArtistOptions(songs.map { it.artist })
                applySearchFilter()
            }
        }
    }

    // Cache locale di tutte le canzoni dell'utente (backing field)
    private var allSongs: List<RemoteSong> = emptyList()

    /**
     * Filtra la lista locale [allSongs] in base ad autore e query correnti.
     * Lavora solo in memoria: nessuna lettura da Room o Firestore.
     */
    private fun applySearchFilter() {
        val query = _searchQuery.value
        // Se l'autore scelto non è più nel catalogo (aggiornato dal pannello) il filtro decade
        val artist = _selectedArtist.value?.takeIf { name -> _artistOptions.value.any { it.name == name } }
        if (artist != _selectedArtist.value) _selectedArtist.value = artist
        val byArtist = if (artist == null) allSongs else allSongs.filter { it.artist == artist }
        val filtered = if (query.isBlank()) {
            byArtist
        } else {
            byArtist.filter {
                it.title.contains(query, ignoreCase = true) ||
                it.artist.contains(query, ignoreCase = true)
            }
        }
        _searchResults.value = filtered.sortedBy { it.title.lowercase() }
    }

    /** Mostra solo i brani dell'autore indicato; null torna a tutto il catalogo. */
    fun setSelectedArtist(artist: String?) {
        _selectedArtist.value = artist
        applySearchFilter()
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
        // Filtra dai dati già in cache (nessuna lettura DB/Firestore)
        applySearchFilter()
    }

    // ---------- Login / Logout ----------

    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _loginErrorMessage.value = "Inserisci username e password"
            return
        }
        _isLoginLoading.value = true
        _loginErrorMessage.value = null
        viewModelScope.launch {
            val result = userRepository.login(username, password)
            when (result) {
                is LoginResult.Success -> {
                    _isLoggedIn.value = true
                    _loggedInUsername.value = result.user.username
                    _loginErrorMessage.value = null
                    _isLoginLoading.value = false

                    // Imposta l'utente per il catalogo filtrato
                    repository.setCatalogUser(result.user.username)

                    // Mostra caricamento mentre si sincronizza il catalogo
                    _loadingState.value = true
                    _loadingMessage.value = "Accesso effettuato. Caricamento catalogo in corso..."

                    // Avvia osservazione della cache filtrata
                    observeCatalogForUser()

                    // Refresh del catalogo da Firestore
                    viewModelScope.launch {
                        repository.refreshCatalogCache()
                    }

                    refreshDownloadLimitInfo()
                }
                is LoginResult.Error -> {
                    _loginErrorMessage.value = result.message
                    _isLoginLoading.value = false
                }
            }
        }
    }

    fun logout() {
        // Resetta l'utente nel repository (catalogo vuoto)
        repository.setCatalogUser(null)
        userRepository.logout()

        _isLoggedIn.value = false
        _loggedInUsername.value = null
        _loginErrorMessage.value = null
        _isLoginLoading.value = false
        _downloadRemaining.value = null
        _downloadLimit.value = null
        _limitMessage.value = null
        _loadingState.value = false
        _searchResults.value = emptyList()
        allSongs = emptyList()
        _artistOptions.value = emptyList()
        _selectedArtist.value = null
    }

    // ---------- Download Limit ----------

    private fun refreshDownloadLimitInfo() {
        viewModelScope.launch {
            when (val result = userRepository.checkDownloadLimit()) {
                is DownloadLimitResult.CanDownload -> {
                    _downloadRemaining.value = result.remaining
                    _downloadLimit.value = result.limit
                    _limitMessage.value = null
                    Log.d("MusicAppDebug", "Download limit: ${result.remaining}/${result.limit} remaining")
                }
                is DownloadLimitResult.LimitReached -> {
                    _downloadRemaining.value = 0
                    _downloadLimit.value = result.limit
                    _limitMessage.value = "Hai raggiunto il limite giornaliero di ${result.limit} download."
                    Log.d("MusicAppDebug", "Download limit: REACHED (${result.limit})")
                }
                is DownloadLimitResult.NotLoggedIn -> {
                    _downloadRemaining.value = null
                    _downloadLimit.value = null
                    _limitMessage.value = null
                }
            }
        }
    }

    fun downloadSong(song: RemoteSong) {
        Log.d("MusicAppDebug", "CatalogViewModel: Clicked download for song ${song.title} (ID: ${song.id})")
        viewModelScope.launch {
            when (val limitResult = userRepository.checkDownloadLimit()) {
                is DownloadLimitResult.LimitReached -> {
                    val limit = limitResult.limit
                    _limitMessage.value = "Limite giornaliero raggiunto ($limit download). Torna domani o contatta l'amministratore."
                    Log.w("MusicAppDebug", "Download blocked: daily limit of $limit reached for user")
                    return@launch
                }
                is DownloadLimitResult.NotLoggedIn -> {
                    _limitMessage.value = "Devi effettuare il login per scaricare canzoni."
                    Log.w("MusicAppDebug", "Download blocked: user not logged in")
                    return@launch
                }
                is DownloadLimitResult.CanDownload -> {
                    _limitMessage.value = null
                }
            }

            repository.downloadSong(song)
            refreshDownloadLimitInfo()
        }
    }
}