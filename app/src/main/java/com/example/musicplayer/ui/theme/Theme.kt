package com.example.musicplayer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight

// Palette nero e viola, ispirata al layout di Spotify (nero profondo, superfici grigio scuro,
// un solo colore d'accento acceso).
val Purple = Color(0xFFA855F7)
val PurpleLight = Color(0xFFC4A5FF)
val PurpleDeep = Color(0xFF3B1E66)
val Black = Color(0xFF0B0A10)
private val TextSecondary = Color(0xFFB3B0BB)

private val PurpleBlackColorScheme = darkColorScheme(
    primary = Purple,
    onPrimary = Color(0xFF12081F),
    primaryContainer = PurpleDeep,
    onPrimaryContainer = Color(0xFFEBDCFF),
    inversePrimary = Color(0xFF7E3FD1),
    secondary = PurpleLight,
    onSecondary = Color(0xFF1E0F3A),
    secondaryContainer = Color(0xFF2E1F47),
    onSecondaryContainer = Color(0xFFE7DAFF),
    tertiary = Color(0xFFE879F9),
    onTertiary = Color(0xFF2B0631),
    tertiaryContainer = Color(0xFF4A1653),
    onTertiaryContainer = Color(0xFFFBD7FF),
    background = Black,
    onBackground = Color.White,
    surface = Black,
    onSurface = Color.White,
    surfaceVariant = Color(0xFF24202E),
    onSurfaceVariant = TextSecondary,
    surfaceTint = Purple,
    inverseSurface = Color(0xFFE8E4F0),
    inverseOnSurface = Color(0xFF1A1722),
    error = Color(0xFFFF5C7A),
    onError = Color(0xFF3A0010),
    errorContainer = Color(0xFF5C1426),
    onErrorContainer = Color(0xFFFFD9DF),
    outline = Color(0xFF4A4458),
    outlineVariant = Color(0xFF2E2A38),
    scrim = Color.Black,
    surfaceBright = Color(0xFF2A2536),
    surfaceDim = Black,
    surfaceContainerLowest = Color(0xFF07060A),
    surfaceContainerLow = Color(0xFF121019),
    surfaceContainer = Color(0xFF17141F),
    surfaceContainerHigh = Color(0xFF1F1B29),
    surfaceContainerHighest = Color(0xFF2A2536)
)

// Titoli in grassetto come nell'interfaccia di Spotify; il resto resta quello di Material 3.
private val AppTypography = Typography().let { base ->
    base.copy(
        headlineLarge = base.headlineLarge.copy(fontWeight = FontWeight.Bold),
        headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.Bold),
        headlineSmall = base.headlineSmall.copy(fontWeight = FontWeight.Bold),
        titleLarge = base.titleLarge.copy(fontWeight = FontWeight.Bold),
        titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold)
    )
}

/**
 * Tema dell'app: sempre scuro, nero e viola. Niente colori dinamici di Android 12+,
 * che sostituirebbero il viola con i colori dello sfondo del telefono.
 */
@Composable
fun MusicPlayerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PurpleBlackColorScheme,
        typography = AppTypography,
        content = content
    )
}
