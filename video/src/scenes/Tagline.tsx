import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {Letters, Signal} from '../components/Stage';
import {colors, DISPLAY, EXPO_IN, MONO, springAt, tween, useLayout, useSceneTime} from '../theme';
import {beatToFrame, timeline} from '../timeline';

const {cues, scenes} = timeline;
const [B_YOUR, B_OFFLINE, B_ALWAYS, B_PLAYING] = cues.taglineWords;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Y of the play bar; the build scene's waveform sits on the same line (match cut). */
export const PLAYBAR_Y = 0.72;

/**
 * 2–4 s: tagline as hard kinetic cuts, one per beat.
 * YOUR MUSIC. (slot) → OFFLINE. (letters drop, line underlines it) → ALWAYS PLAYING. (line = play bar).
 */
export const Tagline: React.FC = () => {
  const {since} = useSceneTime('tagline');
  const {W, H, pick, vertical} = useLayout();
  const [your, offline, always, playing] = content.tagline;

  // ── Beat 4: YOUR MUSIC. revealed in a slot opening from the centre line
  if (since(B_OFFLINE) < 0) {
    const font = pick(210, 140);
    const lineH = font * 0.95;
    const open = springAt(since(B_YOUR), {damping: 18, mass: 0.6});
    const gap = open * lineH;
    const cy = H / 2;
    return (
      <AbsoluteFill>
        <AbsoluteFill
          style={{
            clipPath: `inset(${cy - gap / 2}px 0 ${H - cy - gap / 2}px 0)`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: font,
              letterSpacing: '-0.04em',
              lineHeight: `${lineH}px`,
              color: your.accent ? colors.line : colors.white,
              transform: `scale(${interpolate(open, [0, 1], [1.25, 1])})`,
            }}
          >
            {your.text}
          </div>
        </AbsoluteFill>
        <Signal style={{left: 0, width: W, top: cy - gap / 2 - 3}} />
        <Signal style={{left: 0, width: W, top: cy + gap / 2 - 3}} />
      </AbsoluteFill>
    );
  }

  // ── Beat 5: OFFLINE. huge, letters drop in, the line draws under it
  if (since(B_ALWAYS) < 0) {
    const t = since(B_OFFLINE);
    const font = pick(400, 205);
    const underline = tween(t - 3, 9);
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'relative'}}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: font,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              transform: `scale(${interpolate(t, [0, 15], [1.04, 1], clamp)})`,
            }}
          >
            <Letters text={offline.text} t={t} from="above" stagger={1} duration={8} color={offline.accent ? colors.line : colors.white} />
          </div>
          <Signal style={{left: 0, width: `${underline * 100}%`, bottom: -font * 0.12}} thickness={pick(10, 8)} />
        </div>
      </AbsoluteFill>
    );
  }

  // ── Beats 6–8: ALWAYS PLAYING. + the line becomes a play bar that fills to the end of the scene
  const t6 = since(B_ALWAYS);
  const t7 = since(B_PLAYING);
  const font = pick(176, 200);
  const exit = interpolate(since(scenes.tagline.end), [-6, 0], [0, 1], {...clamp, easing: EXPO_IN});
  const progress = interpolate(t6, [0, beatToFrame(scenes.tagline.end) - beatToFrame(B_ALWAYS)], [0, 1], clamp);
  const margin = pick(0.1, 0.08) * W;
  const left = margin * (1 - exit);
  const right = W - margin * (1 - exit);
  const barY = H * PLAYBAR_Y;
  const barIn = tween(t6, 8);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: pick(H * 0.12, H * 0.16),
          opacity: 1 - exit,
          transform: `translateY(${-exit * 60}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            gap: vertical ? 0 : font * 0.28,
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: font,
            letterSpacing: '-0.045em',
            lineHeight: 0.92,
          }}
        >
          <Letters text={always.text} t={t6} stagger={1} duration={8} />
          {t7 >= 0 ? <Letters text={playing.text} t={t7} stagger={1} duration={8} color={playing.accent ? colors.line : colors.white} /> : null}
        </div>
      </AbsoluteFill>

      {/* Play bar: faint track + green progress + knob */}
      <div
        style={{
          position: 'absolute',
          left: left + ((right - left) * (1 - barIn)) / 2,
          width: (right - left) * barIn,
          top: barY - 2,
          height: 4,
          background: colors.faint,
          borderRadius: 4,
        }}
      />
      <Signal style={{left, width: (right - left) * progress, top: barY - 3}} />
      <div
        style={{
          position: 'absolute',
          left: left + (right - left) * progress - 13,
          top: barY - 13,
          width: 26,
          height: 26,
          borderRadius: 13,
          background: colors.white,
          opacity: barIn * (1 - exit),
          transform: `scale(${1 + 0.35 * Math.exp(-Math.max(0, t7) / 3) * (t7 >= 0 ? 1 : 0)})`,
        }}
      />
      {(['left', 'right'] as const).map((side, i) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            [side]: margin,
            top: barY + 26,
            fontFamily: MONO,
            fontSize: pick(26, 30),
            color: colors.muted,
            opacity: barIn * (1 - exit),
          }}
        >
          {content.playbarTimes[i]}
        </div>
      ))}
    </AbsoluteFill>
  );
};
