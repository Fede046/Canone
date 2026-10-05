package com.example.musicplayer.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import kotlin.math.roundToInt

/**
 * A text component that scrolls its content horizontally (marquee) if the text is wider
 * than the available space. If the text fits within the bounds, it displays normally.
 *
 * @param text The text to display.
 * @param modifier Modifier for the composable.
 * @param style Text styling.
 * @param speedMsPerChar Milliseconds per character for the scroll speed.
 * @param pauseMs Pause duration in milliseconds at each end before reversing.
 */
@Composable
fun MarqueeText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = LocalTextStyle.current,
    speedMsPerChar: Int = 80,
    pauseMs: Int = 1000
) {
    if (text.isEmpty()) return

    val textMeasurer = rememberTextMeasurer()

    // Measure text width using TextMeasurer
    val textWidthPx = remember(text, style.fontSize, style.fontWeight, style.fontFamily) {
        val result = textMeasurer.measure(
            text = text,
            style = style,
            constraints = Constraints(
                maxWidth = Constraints.Infinity,
                maxHeight = Constraints.Infinity
            )
        )
        result.size.width.toFloat()
    }

    if (textWidthPx <= 0f) {
        Text(text = text, style = style, modifier = modifier)
        return
    }

    // Use Box to get available width via onSizeChanged
    var boxWidthPx by remember { mutableFloatStateOf(0f) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .onSizeChanged { size ->
                boxWidthPx = size.width.toFloat()
            }
    ) {
        val needsScroll = boxWidthPx > 0f && textWidthPx > boxWidthPx

        if (!needsScroll && boxWidthPx > 0f) {
            // Text fits - show normally
            Text(
                text = text,
                style = style,
                softWrap = false,
                maxLines = 1
            )
        } else if (needsScroll) {
            // Text overflows - animate scrolling
            val scrollDistance = textWidthPx - boxWidthPx
            val durationMs = ((text.length) * speedMsPerChar).coerceAtLeast(3000) + pauseMs * 2

            val infiniteTransition = rememberInfiniteTransition(label = "marquee_$text")

            val offsetX by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = -scrollDistance,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = durationMs, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse,
                    initialStartOffset = StartOffset(pauseMs)
                ),
                label = "marqueeOffset_$text"
            )

            Text(
                text = text,
                style = style,
                softWrap = false,
                maxLines = 1,
                modifier = Modifier
                    .offset { IntOffset(offsetX.roundToInt(), 0) }
            )
        }
    }
}