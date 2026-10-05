package com.example.musicplayer.ui.circlezone

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.FloatState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.example.musicplayer.playback.analysis.ChordTrack
import com.example.musicplayer.playback.analysis.HarmonyResult
import com.example.musicplayer.playback.analysis.NoteTrack
import com.example.musicplayer.playback.analysis.SectionTrack
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Colori della Circle Zone: blu notte, testi lavanda, come il video a cui si ispira. */
internal object CzColors {
    val Background = Color(0xFF090A12)
    val CenterGlow = Color(0x331E2150)
    val Grid = Color(0xFF2B2D4A)
    val TextPrimary = Color(0xFFEEEBF7)
    val TextSecondary = Color(0xFF8E8BA8)
    val TextDim = Color(0xFF46445E)
    val Accidental = Color(0xFFF2C46B)
    val Chords = Color(0xFFC9C3FF)
}

/**
 * Le voci della Circle Zone, nell'ordine della legenda. Melodia, voce di mezzo e basso sono
 * la nota più forte di tre registri; gli echi sono la melodia ripresa [delayBars] battute dopo
 * e ruotata di [rotation]/7 (le stesse rotazioni del video: 3, 6 e 2 settimi).
 */
internal enum class CzVoice(
    val label: String,
    val role: String,
    val color: Color,
    val rotation: Int = 0,
    val delayBars: Int = 0
) {
    MELODY("melodia", "la guida", Color(0xFFFF8A5C)),
    ECHO_ONE("eco I", "ruotata 3/7 · 2 battute dopo", Color(0xFFF6C453), rotation = 3, delayBars = 2),
    MIDDLE("voce di mezzo", "l'interno", Color(0xFF3FD0D9)),
    ECHO_TWO("eco II", "ruotata 6/7 · 4 battute dopo", Color(0xFFA6D85B), rotation = 6, delayBars = 4),
    ECHO_THREE("eco III", "ruotata 2/7 · 6 battute dopo", Color(0xFFEE6FA8), rotation = 2, delayBars = 6),
    BASS("basso", "il fondamento", Color(0xFF5B7CFF)),
    CHORDS("accordi", "l'armonia", CzColors.Chords);

    companion object {
        val echoes = entries.filter { it.delayBars > 0 }
    }
}

private val SECTION_NAMES = arrayOf("Apertura", "Sviluppo", "Quiete", "Culmine", "Ripresa", "Congedo")
private val NUMERALS = arrayOf("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII")
private val DELAY_WORDS = mapOf(2 to "due", 4 to "quattro", 6 to "sei")
private const val CAPTION_SEC = 6f

/** Ciò che l'interfaccia mostra all'istante: cambia qualche volta al secondo, non a ogni fotogramma. */
internal data class CircleHud(
    val sectionNumeral: String,
    val sectionName: String,
    val barText: String,
    val caption: String,
    val captionColor: Color,
    /** Per ogni voce di [CzVoice], se sta suonando. */
    val active: List<Boolean>
)

/** Stato dell'interfaccia all'istante [t] (secondi). */
internal fun circleHud(layout: WheelLayout, t: Float): CircleHud {
    val result = layout.result
    val speller = layout.speller
    val sectionIndex = result.sections.indexAt(t)
    val chordIndex = result.chords.indexAt(t)
    val chordName = if (chordIndex >= 0 && result.chords.quality[chordIndex] != ChordTrack.NONE) {
        speller.chordName(result.chords.root[chordIndex], result.chords.quality[chordIndex])
    } else null
    val bar = result.barAt(t)
    val barText = listOfNotNull(bar?.let { "BATTUTA ${it.first}.${it.second}" }, chordName).joinToString("  ·  ")

    val melody = result.voices[HarmonyResult.MELODY]
    fun sounding(track: NoteTrack, time: Float): Boolean {
        if (time < 0f) return false
        val index = track.indexAt(time)
        return index >= 0 && track.midi[index] != NoteTrack.REST
    }
    val active = CzVoice.entries.map { voice ->
        when (voice) {
            CzVoice.MELODY -> sounding(melody, t)
            CzVoice.MIDDLE -> sounding(result.voices[HarmonyResult.MIDDLE], t)
            CzVoice.BASS -> sounding(result.voices[HarmonyResult.BASS], t)
            CzVoice.CHORDS -> chordName != null
            else -> sounding(melody, t - voice.delayBars * result.barSec)
        }
    }

    val (caption, color) = caption(layout, t, chordIndex, active)
    val kind = result.sections.kind[sectionIndex]
    return CircleHud(
        sectionNumeral = NUMERALS[sectionIndex.coerceAtMost(NUMERALS.size - 1)],
        sectionName = SECTION_NAMES[kind.coerceIn(0, SECTION_NAMES.size - 1)],
        barText = barText,
        caption = caption,
        captionColor = color,
        active = active
    )
}

/**
 * Didascalia: ogni [CAPTION_SEC] secondi racconta un aspetto diverso (gli accordi, il basso,
 * la melodia, un eco), con i nomi delle ultime note o degli ultimi accordi.
 */
private fun caption(
    layout: WheelLayout,
    t: Float,
    chordIndex: Int,
    active: List<Boolean>
): Pair<String, Color> {
    val result = layout.result
    val speller = layout.speller
    fun chords(): Pair<String, Color>? {
        val names = ArrayList<String>()
        var index = chordIndex
        while (index >= 0 && names.size < 5) {
            if (result.chords.quality[index] != ChordTrack.NONE) {
                val name = speller.chordName(result.chords.root[index], result.chords.quality[index])
                if (names.lastOrNull() != name) names += name
            }
            index--
        }
        return if (names.isEmpty()) null else Pair("gli accordi · " + names.reversed().joinToString("  "), CzColors.Chords)
    }
    fun notes(voice: Int, prefix: String, color: Color): Pair<String, Color>? {
        val names = ArrayList<String>()
        var index = result.voices[voice].indexAt(t)
        while (index >= 0 && names.size < 4) {
            val name = layout.voiceNames[voice][index]
            if (name.isNotEmpty() && names.lastOrNull() != name) names += name
            index--
        }
        return if (names.size < 2) null else Pair(prefix + names.reversed().joinToString("  "), color)
    }
    fun echo(): Pair<String, Color>? =
        CzVoice.echoes.lastOrNull { active[it.ordinal] }?.let { voice ->
            Pair(
                "la melodia ritorna ruotata di ${voice.rotation}/7, ${DELAY_WORDS[voice.delayBars]} battute dopo",
                voice.color
            )
        }
    val choice = when ((t / CAPTION_SEC).toInt().coerceAtLeast(0) % 4) {
        0 -> chords()
        // Una voce si racconta solo mentre suona
        1 -> if (active[CzVoice.BASS.ordinal]) notes(HarmonyResult.BASS, "il basso · ", CzVoice.BASS.color) else null
        2 -> if (active[CzVoice.MELODY.ordinal]) notes(HarmonyResult.MELODY, "la melodia · ", CzVoice.MELODY.color) else null
        else -> echo()
    }
    return choice ?: chords() ?: Pair("", CzColors.TextSecondary)
}

private val serif = FontFamily.Serif
private val mono = FontFamily.Monospace

/**
 * Titolo e sottotitolo. Il titolo sta fermo (al massimo due righe): un titolo che scorre
 * animerebbe tutta la finestra a 60 fotogrammi al secondo, il doppio della ruota.
 */
@Composable
internal fun CzTitleBlock(title: String, subtitle: String, titleSize: TextUnit, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(
            text = title.ifEmpty { "Circle Zone" },
            style = TextStyle(fontFamily = serif, fontSize = titleSize, lineHeight = titleSize * 1.1f, color = CzColors.TextPrimary),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = subtitle,
            style = TextStyle(fontFamily = mono, fontSize = 10.sp, letterSpacing = 0.18.em, color = CzColors.TextSecondary),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
internal fun CzSectionBlock(hud: CircleHud?, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.End) {
        Text(
            text = hud?.sectionNumeral ?: "",
            style = TextStyle(fontFamily = serif, fontSize = 34.sp, color = CzColors.TextPrimary)
        )
        Text(
            text = hud?.sectionName ?: "",
            style = TextStyle(fontFamily = serif, fontStyle = FontStyle.Italic, fontSize = 16.sp, color = CzColors.TextPrimary)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = hud?.barText ?: "",
            style = TextStyle(fontFamily = mono, fontSize = 10.sp, letterSpacing = 0.15.em, color = CzColors.TextSecondary),
            maxLines = 1
        )
    }
}

/** Legenda: le voci che suonano in questo momento sono accese, le altre spente. */
@Composable
internal fun CzLegend(hud: CircleHud?, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        for (voice in CzVoice.entries) {
            val on = hud?.active?.get(voice.ordinal) == true
            Row(verticalAlignment = Alignment.CenterVertically) {
                Canvas(modifier = Modifier.size(7.dp)) {
                    drawCircle(if (on) voice.color else voice.color.copy(alpha = 0.3f))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = voice.label,
                    style = TextStyle(fontFamily = mono, fontSize = 11.sp, color = if (on) CzColors.TextPrimary else CzColors.TextDim),
                    modifier = Modifier.width(104.dp),
                    maxLines = 1
                )
                Text(
                    text = voice.role,
                    style = TextStyle(
                        fontFamily = mono,
                        fontSize = 10.sp,
                        color = when {
                            !on -> CzColors.TextDim
                            voice.delayBars > 0 -> voice.color
                            else -> CzColors.TextSecondary
                        }
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/** Orologio delle rotazioni: la melodia a 0, ogni eco attivo con la sua lancetta verso k/7. */
@Composable
internal fun CzRotationClock(hud: CircleHud?, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(modifier = Modifier.size(76.dp)) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val radius = size.minDimension * 0.42f
            fun vertex(k: Int): Offset {
                val angle = -PI.toFloat() / 2f + k * 2f * PI.toFloat() / 7f
                return Offset(center.x + cos(angle) * radius, center.y + sin(angle) * radius)
            }
            val outline = Path().apply {
                for (k in 0..7) vertex(k).let { if (k == 0) moveTo(it.x, it.y) else lineTo(it.x, it.y) }
            }
            drawPath(outline, CzColors.Grid, style = Stroke(width = 1.dp.toPx()))
            for (voice in CzVoice.echoes) {
                if (hud?.active?.get(voice.ordinal) != true) continue
                val end = vertex(voice.rotation)
                drawLine(voice.color, center, end, strokeWidth = 1.6.dp.toPx())
                drawCircle(voice.color, radius = 3.dp.toPx(), center = end)
            }
            drawCircle(CzVoice.MELODY.color, radius = 3.dp.toPx(), center = vertex(0))
            drawCircle(CzColors.TextPrimary, radius = 2.dp.toPx(), center = center)
        }
        Text(
            text = "ROTAZIONI",
            style = TextStyle(fontFamily = mono, fontSize = 9.sp, letterSpacing = 0.2.em, color = CzColors.TextSecondary)
        )
    }
}

@Composable
internal fun CzCaption(hud: CircleHud?, fallback: String, modifier: Modifier = Modifier) {
    Text(
        text = hud?.caption?.ifEmpty { null } ?: fallback,
        style = TextStyle(
            fontFamily = serif,
            fontStyle = FontStyle.Italic,
            fontSize = 17.sp,
            color = hud?.captionColor ?: CzColors.TextSecondary,
            textAlign = TextAlign.Center
        ),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier.fillMaxWidth()
    )
}

/**
 * Barra in fondo: il tratto già ascoltato nel colore della melodia, le tacche all'inizio di ogni
 * sezione. La posizione si legge solo nel disegno: si ridisegna senza ricomporre.
 */
@Composable
internal fun CzProgressBar(positionSec: FloatState, durationSec: Float, sections: SectionTrack?, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.height(10.dp)) {
        val y = size.height / 2f
        val width = size.width
        drawLine(CzColors.Grid, Offset(0f, y), Offset(width, y), strokeWidth = 1.dp.toPx())
        if (durationSec > 0f) {
            sections?.let {
                for (i in 1 until it.size) {
                    val x = width * (it.startSec[i] / durationSec).coerceIn(0f, 1f)
                    drawLine(CzColors.TextDim, Offset(x, y - 4.dp.toPx()), Offset(x, y + 4.dp.toPx()), strokeWidth = 1.dp.toPx())
                }
            }
            val played = width * (positionSec.floatValue / durationSec).coerceIn(0f, 1f)
            drawLine(CzVoice.MELODY.color.copy(alpha = 0.8f), Offset(0f, y), Offset(played, y), strokeWidth = 1.5.dp.toPx())
        }
    }
}
