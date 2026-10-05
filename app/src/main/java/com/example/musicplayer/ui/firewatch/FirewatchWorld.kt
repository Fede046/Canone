package com.example.musicplayer.ui.firewatch

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

/** Cosa chiede la musica alla scena: nessuna musica, calma, intermedia, energica. */
internal enum class SceneMood { BASE, CALM, MIDDLE, ENERGETIC }

/**
 * Gli stormi della Firewatch Zone. Più la musica è energica, più stormi in cielo e più in fretta
 * volano. Nessuno compare o sparisce di colpo: i nuovi entrano da un lato, quelli in più volano via
 * verso l'alto, gli altri attraversano il cielo e ne escono dall'altra parte.
 */
internal class FirewatchWorld {
    private val random = Random(System.nanoTime())
    private val flocks = ArrayList<Flock>()
    private var started = false
    private var flockCooldown = 0f
    private val birdPath = Path()

    private class Bird(val dx: Float, val dy: Float, val phase: Float, val rate: Float, val span: Float)

    private class Flock(var x: Float, var y: Float, val direction: Float, val speed: Float, val birds: List<Bird>) {
        var age = 0f
        var leaving = false
    }

    /** Quanti stormi chiede la musica: da 3 senza musica fino a 11 nei momenti più energici. */
    private fun flockTarget(mood: SceneMood, energy: Float) = when (mood) {
        SceneMood.BASE -> 3
        SceneMood.CALM -> 4
        SceneMood.MIDDLE -> 6
        SceneMood.ENERGETIC -> 8 + (3f * ((energy - 0.66f) / 0.34f).coerceIn(0f, 1f)).roundToInt()
    }

    fun step(dt: Float, mood: SceneMood, energy: Float, placement: ScenePlacement) {
        val target = flockTarget(mood, energy)
        if (!started) {
            started = true
            // La scena è già viva all'apertura: stormi già in cielo
            repeat(target) { flocks += newFlock(placement, inView = true) }
        }
        var staying = flocks.count { !it.leaving }
        // Troppi stormi: i più vecchi volano via verso l'alto
        while (staying > target) {
            flocks.filter { !it.leaving }.maxByOrNull { it.age }?.leaving = true
            staying--
        }
        flockCooldown -= dt
        if (staying < target && flockCooldown <= 0f) {
            flocks += newFlock(placement, inView = false)
            // Con l'energia gli stormi arrivano più fitti
            flockCooldown = if (mood == SceneMood.ENERGETIC) 0.8f + random.nextFloat() else 2.5f + random.nextFloat() * 3f
        }
        // Più energia, volo più veloce
        val pace = when (mood) {
            SceneMood.ENERGETIC -> 1.6f + energy
            SceneMood.MIDDLE -> 1.3f
            else -> 1f
        }
        val iterator = flocks.iterator()
        while (iterator.hasNext()) {
            val flock = iterator.next()
            flock.age += dt * pace
            if (flock.leaving) {
                flock.x += flock.direction * flock.speed * 3f * dt
                flock.y -= placement.height * 0.08f * dt
            } else {
                flock.x += flock.direction * flock.speed * pace * dt
                flock.y += placement.height * 0.006f * sin(flock.age * 0.4f) * dt
            }
            val outside = flock.x < -placement.width * 0.35f || flock.x > placement.width * 1.35f ||
                flock.y < -placement.height * 0.15f
            if (outside) iterator.remove()
        }
    }

    private fun newFlock(placement: ScenePlacement, inView: Boolean): Flock {
        val direction = if (random.nextBoolean()) 1f else -1f
        val x = if (inView) placement.width * (0.1f + random.nextFloat() * 0.8f)
        else if (direction > 0) -placement.width * 0.25f else placement.width * 1.25f
        val y = placement.skyTop + random.nextFloat() * (placement.skyBottom - placement.skyTop)
        val count = 7 + random.nextInt(8)
        val unit = placement.unit
        val birds = List(count) {
            Bird(
                dx = (random.nextFloat() - 0.5f) * unit * 0.3f,
                dy = (random.nextFloat() - 0.5f) * unit * 0.1f,
                phase = random.nextFloat() * 6.3f,
                rate = 7f + random.nextFloat() * 4f,
                span = unit * (0.014f + random.nextFloat() * 0.008f)
            )
        }
        return Flock(x, y, direction, placement.width * (0.03f + random.nextFloat() * 0.025f), birds)
    }

    /** Tutti gli uccelli in un solo percorso: due archi per uccello, le ali che battono. */
    fun draw(scope: DrawScope, placement: ScenePlacement, color: Color): Unit = with(scope) {
        birdPath.reset()
        var width = 1f
        for (flock in flocks) {
            for (bird in flock.birds) {
                val x = flock.x + bird.dx
                val y = flock.y + bird.dy + sin(flock.age * 1.3f + bird.phase) * placement.unit * 0.006f
                val beat = sin(flock.age * bird.rate * (if (flock.leaving) 1.5f else 1f) + bird.phase)
                val s = bird.span
                val lift = s * (0.15f + 0.5f * beat)
                birdPath.moveTo(x - s, y - lift)
                birdPath.quadraticBezierTo(x - s * 0.45f, y - lift * 0.2f - s * 0.2f, x, y)
                birdPath.quadraticBezierTo(x + s * 0.45f, y - lift * 0.2f - s * 0.2f, x + s, y - lift)
                width = max(width, s * 0.28f)
            }
        }
        if (!birdPath.isEmpty) drawPath(birdPath, color, style = Stroke(width = width, cap = StrokeCap.Round))
    }
}
