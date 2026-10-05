package com.example.musicplayer.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.musicplayer.ui.catalog.CatalogScreen
import com.example.musicplayer.ui.help.HelpDialog
import com.example.musicplayer.ui.library.LibraryScreen
import com.example.musicplayer.ui.circlezone.CircleZoneScreen
import com.example.musicplayer.ui.firewatch.FirewatchScreen
import com.example.musicplayer.ui.musiczone.MusicZoneScreen
import com.example.musicplayer.ui.player.ExpandedPlayerScreen
import com.example.musicplayer.ui.player.MiniPlayerBar
import com.example.musicplayer.ui.playlist.PlaylistDetailScreen
import com.example.musicplayer.ui.playlist.PlaylistScreen
import com.example.musicplayer.ui.settings.SettingsDialog
import com.example.musicplayer.ui.zone.Zone
import com.example.musicplayer.ui.zone.ZoneMode
import com.example.musicplayer.ui.zone.ZoneSettings

sealed class Screen(val route: String, val label: String) {
    object Catalog : Screen("catalog", "Sfoglia")
    object Library : Screen("library", "Libreria")
    object MyPlaylist : Screen("myplaylist", "Playlist")
    object Player : Screen("player", "Player")
    object MusicZone : Screen("music_zone", "Music Zone")
    object CircleZone : Screen("circle_zone", "Circle Zone")
    object FirewatchZone : Screen("firewatch_zone", "Firewatch Zone")
    object PlaylistDetail : Screen("playlist_detail/{playlistId}", "Dettaglio Playlist") {
        fun createRoute(playlistId: Long) = "playlist_detail/$playlistId"
    }
}

private val bottomBarScreens = listOf(Screen.Library, Screen.MyPlaylist, Screen.Catalog)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicAppNavGraph(zoneMode: ZoneMode, zoneSettings: ZoneSettings) {
    val navController = rememberNavController()
    val activeZone by zoneMode.active.collectAsStateWithLifecycle()
    // Schermate a schermo intero, senza barre
    val fullScreenRoutes = setOf(Screen.Player.route, Screen.MusicZone.route, Screen.CircleZone.route, Screen.FirewatchZone.route)

    Scaffold(
        topBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination?.route
            val isPlayerScreen = currentRoute in fullScreenRoutes
            val isDetailScreen = currentRoute?.startsWith("playlist_detail") == true

            if (!isPlayerScreen && !isDetailScreen) {
                TopAppBar(
                    title = {
                        val label = when (currentRoute) {
                            Screen.Library.route -> "La Mia Musica"
                            Screen.MyPlaylist.route -> "Le Mie Playlist"
                            Screen.Catalog.route -> "Catalogo Online"
                            else -> "Canone"
                        }
                        Text(label)
                    },
                    actions = {
                        var showInfoDialog by remember { mutableStateOf(false) }
                        var showHelpDialog by remember { mutableStateOf(false) }
                        var showSettingsDialog by remember { mutableStateOf(false) }

                        // Impostazioni a sinistra della guida
                        IconButton(onClick = { showSettingsDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "Impostazioni"
                            )
                        }

                        // Tasto "?" a sinistra di Informazioni. Il tasto Cambia tema non c'è più: il tema è sempre scuro.
                        IconButton(onClick = { showHelpDialog = true }) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Outlined.HelpOutline,
                                contentDescription = "Guida"
                            )
                        }

                        IconButton(onClick = { showInfoDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Informazioni"
                            )
                        }

                        if (showHelpDialog) {
                            HelpDialog(onDismiss = { showHelpDialog = false })
                        }

                        if (showSettingsDialog) {
                            val screenOn by zoneSettings.screenOn.collectAsStateWithLifecycle()
                            SettingsDialog(
                                screenOn = screenOn,
                                onScreenOnChange = zoneSettings::setScreenOn,
                                onDismiss = { showSettingsDialog = false }
                            )
                        }

                        if (showInfoDialog) {
                            AlertDialog(
                                onDismissRequest = { showInfoDialog = false },
                                title = { Text("Canone") },
                                text = {
                                    Column {
                                        Text("Versione: 1.0.0")
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "Canone ti permette di ascoltare e gestire la tua " +
                                                    "musica offline. Puoi scaricare canzoni dal catalogo " +
                                                    "online, creare playlist personalizzate e riprodurre " +
                                                    "la tua libreria musicale direttamente dal dispositivo."
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "Sviluppata con Jetpack Compose e Material 3.",
                                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall
                                        )
                                    }
                                },
                                confirmButton = {
                                    TextButton(onClick = { showInfoDialog = false }) {
                                        Text("Chiudi")
                                    }
                                }
                            )
                        }
                    }
                )
            }
        },
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = backStackEntry?.destination
            val isPlayerScreen = currentDestination?.route in fullScreenRoutes

            if (!isPlayerScreen) {
                Column {
                    // Con una modalità attiva (MZ o CZ), aprire il player porta direttamente lì
                    MiniPlayerBar(onExpandClick = {
                        navController.navigate(
                            when (activeZone) {
                                Zone.MUSIC -> Screen.MusicZone.route
                                Zone.CIRCLE -> Screen.CircleZone.route
                                Zone.FIRE -> Screen.FirewatchZone.route
                                null -> Screen.Player.route
                            }
                        )
                    })
                    NavigationBar {
                        bottomBarScreens.forEach { screen ->
                            NavigationBarItem(
                                selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    val icon = when (screen) {
                                        Screen.Catalog -> Icons.Default.CloudDownload
                                        Screen.Library -> Icons.Default.LibraryMusic
                                        Screen.MyPlaylist -> Icons.AutoMirrored.Filled.PlaylistPlay
                                        else -> Icons.Default.LibraryMusic
                                    }
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = screen.label
                                    )
                                },
                                label = { Text(screen.label) }
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Library.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Catalog.route) { CatalogScreen() }
            composable(Screen.Library.route) { LibraryScreen() }
            composable(Screen.MyPlaylist.route) {
                PlaylistScreen(onPlaylistClick = { id ->
                    navController.navigate(Screen.PlaylistDetail.createRoute(id))
                })
            }
            composable(
                route = Screen.PlaylistDetail.route,
                arguments = listOf(navArgument("playlistId") { type = NavType.LongType })
            ) { backStackEntry ->
                val playlistId = backStackEntry.arguments?.getLong("playlistId") ?: 0L
                PlaylistDetailScreen(
                    playlistId = playlistId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Player.route) {
                ExpandedPlayerScreen(
                    onBackClick = { navController.popBackStack() },
                    activeZone = activeZone,
                    onOpenZone = { zone ->
                        zoneMode.enable(zone)
                        // Il player esce dalla pila: dalla zona, Indietro torna alla schermata di prima
                        navController.navigate(
                            when (zone) {
                                Zone.MUSIC -> Screen.MusicZone.route
                                Zone.CIRCLE -> Screen.CircleZone.route
                                Zone.FIRE -> Screen.FirewatchZone.route
                            }
                        ) {
                            popUpTo(Screen.Player.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(
                route = Screen.MusicZone.route,
                enterTransition = {
                    fadeIn(tween(600)) + scaleIn(initialScale = 0.85f, animationSpec = tween(600))
                },
                exitTransition = { fadeOut(tween(300)) },
                popExitTransition = {
                    fadeOut(tween(300)) + scaleOut(targetScale = 0.9f, animationSpec = tween(300))
                }
            ) {
                MusicZoneScreen(
                    onClose = { navController.popBackStack() },
                    onDisable = {
                        navController.navigate(Screen.Player.route) {
                            popUpTo(Screen.MusicZone.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(
                route = Screen.CircleZone.route,
                enterTransition = {
                    fadeIn(tween(600)) + scaleIn(initialScale = 0.85f, animationSpec = tween(600))
                },
                exitTransition = { fadeOut(tween(300)) },
                popExitTransition = {
                    fadeOut(tween(300)) + scaleOut(targetScale = 0.9f, animationSpec = tween(300))
                }
            ) {
                CircleZoneScreen(
                    onClose = { navController.popBackStack() },
                    onDisable = {
                        navController.navigate(Screen.Player.route) {
                            popUpTo(Screen.CircleZone.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(
                route = Screen.FirewatchZone.route,
                enterTransition = {
                    fadeIn(tween(600)) + scaleIn(initialScale = 0.85f, animationSpec = tween(600))
                },
                exitTransition = { fadeOut(tween(300)) },
                popExitTransition = {
                    fadeOut(tween(300)) + scaleOut(targetScale = 0.9f, animationSpec = tween(300))
                }
            ) {
                FirewatchScreen(
                    onClose = { navController.popBackStack() },
                    onDisable = {
                        navController.navigate(Screen.Player.route) {
                            popUpTo(Screen.FirewatchZone.route) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
