import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {Signal} from '../components/Stage';
import {colors, DISPLAY, EXPO_IN, EXPO_OUT, MONO, tween, useLayout, useSceneTime} from '../theme';
import {beatToFrame, FRAMES_PER_BEAT, timeline} from '../timeline';
import {PLAYBAR_Y} from './Tagline';

const {cues, scenes} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Waveform path across the full width, tapered at both ends. */
const wavePath = (W: number, amp: number, phase: number, density: number) => {
  const N = 220;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const env = Math.sin(Math.PI * x) ** 1.4;
    const y =
      Math.sin(x * 9 * density + phase) * 0.55 +
      Math.sin(x * 23 * density - phase * 1.7) * 0.3 +
      Math.sin(x * 51 * density + phase * 0.6) * 0.15;
    d += `${i === 0 ? 'M' : 'L'}${(x * W).toFixed(1)},${(y * amp * env).toFixed(1)} `;
  }
  return d;
};

/**
 * 4–6 s: the play bar becomes a waveform that grows with the riser.
 * STREAM IT. / DOWNLOAD IT. / KEEP IT. slam in one per beat, the camera pushes,
 * then everything freezes for half a beat of silence before the drop.
 */
export const Build: React.FC = () => {
  const {frame, since} = useSceneTime('build');
  const {W, H, pick, vertical} = useLayout();
  const frozen = since(cues.freeze) >= 0;

  const beatFloat = scenes.build.start + frame / FRAMES_PER_BEAT;
  const pulse = Math.exp(-(frame % FRAMES_PER_BEAT) / 4);
  const amp = frozen
    ? 0
    : interpolate(beatFloat, [scenes.build.start, cues.freeze], [4, pick(120, 150)], {...clamp, easing: EXPO_IN}) *
      (1 + 0.3 * pulse);
  const density = interpolate(beatFloat, [scenes.build.start, cues.freeze], [0.6, 1.6], clamp);
  const phase = frame * interpolate(beatFloat, [scenes.build.start, cues.freeze], [0.18, 0.7], clamp);
  const y = H * PLAYBAR_Y;
  const inhale = 1 - 0.92 * tween(since(cues.freeze), beatToFrame(cues.drop) - beatToFrame(cues.freeze), EXPO_IN);

  const font = pick(150, 118);
  const indent = pick(110, 0);
  const left = pick(150, 0);

  return (
    <AbsoluteFill>
      {!frozen ? (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: vertical ? 'center' : 'flex-start',
            paddingLeft: left,
            paddingBottom: H * pick(0.2, 0.22),
          }}
        >
          {content.build.map((word, i) => {
            const t = since(cues.buildWords[i]);
            if (t < 0) return <div key={i} style={{height: font * 0.95}} />;
            const slam = interpolate(t, [0, 7], [0, 1], {...clamp, easing: EXPO_OUT});
            const next = cues.buildWords[i + 1];
            const dim = next !== undefined && since(next) >= 0 ? 0.28 : 1;
            const last = i === content.build.length - 1;
            return (
              <div
                key={i}
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: font,
                  lineHeight: 0.95,
                  letterSpacing: '-0.045em',
                  color: last ? colors.line : colors.white,
                  marginLeft: i * indent,
                  opacity: slam * dim,
                  filter: `blur(${(1 - slam) * 16}px)`,
                  transform: `scale(${interpolate(slam, [0, 1], [1.45, 1])}) translateX(${(1 - slam) * (i % 2 ? 80 : -80)}px)`,
                  transformOrigin: vertical ? 'center' : 'left center',
                }}
              >
                {word}
              </div>
            );
          })}
        </AbsoluteFill>
      ) : null}

      {/* The signal, now a waveform. Three copies at different phases give depth. */}
      {!frozen ? (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <g transform={`translate(0 ${y})`}>
          {[0.14, 0.32, 1].map((op, k) => (
            <path
              key={k}
              d={wavePath(W, amp * (1 - k * 0.18 + (2 - k) * 0.25), phase + k * 1.3, density * (1 + k * 0.08))}
              fill="none"
              stroke={colors.line}
              strokeOpacity={op}
              strokeWidth={k === 2 ? 6 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={k === 2 ? {filter: 'drop-shadow(0 0 10px rgba(29,185,84,0.6))'} : undefined}
            />
          ))}
        </g>
      </svg>
      ) : null}

      {/* Caption types on during the last beat */}
      {!frozen && since(cues.buildPush) >= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y + pick(150, 190),
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: pick(28, 30),
            letterSpacing: '0.12em',
            color: colors.muted,
          }}
        >
          {content.buildCaption.slice(0, Math.ceil(content.buildCaption.length * interpolate(since(cues.buildPush), [0, 6], [0, 1], clamp)))}
        </div>
      ) : null}

      {/* Half-beat freeze: the line inhales toward the centre, everything else is gone */}
      {frozen ? (
        <Signal
          style={{
            left: (W * (1 - inhale)) / 2,
            width: W * inhale,
            top: y - 2,
          }}
          thickness={4}
        />
      ) : null}
    </AbsoluteFill>
  );
};
