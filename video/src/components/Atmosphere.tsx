import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {content} from '../content';
import {colors, EXPO_OUT, MONO, useLayout} from '../theme';
import {beatToFrame, FRAMES_PER_BEAT, timeline, type SceneName} from '../timeline';

const {scenes, cues} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const beatOf = (frame: number) => frame / FRAMES_PER_BEAT;

/* ── Background: near-black with a slow deep-green glow ───────────────── */
export const Backdrop: React.FC<{still?: boolean}> = ({still = false}) => {
  const frame = useCurrentFrame();
  const t = still ? 0 : frame;
  const x = 50 + Math.sin(t / 55) * 14;
  const y = 42 + Math.cos(t / 70) * 10;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 55% at ${x}% ${y}%, ${colors.deep}88 0%, ${colors.bg} 72%)`,
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)'}}
  />
);

/* ── Film grain (disabled for the GIF) ────────────────────────────────── */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/* ── Drifting wall of real project code, three depth layers ───────────── */
// Scroll speed (px/frame) as a function of beat: accelerates into the drop, freezes in the silence.
const speedAt = (beat: number) => {
  if (beat >= cues.freeze && beat < cues.drop) return 0;
  if (beat >= scenes.build.start && beat < cues.freeze)
    return interpolate(beat, [scenes.build.start, cues.freeze], [2, 14], clamp);
  if (beat >= cues.drop && beat < scenes.terminal.start) return 3;
  return 1.6;
};
const OFFSETS: number[] = (() => {
  const out = [0];
  for (let f = 1; f <= beatToFrame(timeline.totalBeats); f++) out.push(out[f - 1] + speedAt(beatOf(f)));
  return out;
})();

const codeOpacityAt = (beat: number) => {
  if (beat >= cues.freeze && beat < cues.drop) return 0;
  return interpolate(
    beat,
    [0, 2, scenes.build.start, cues.freeze - 0.25, cues.drop, scenes.terminal.start, scenes.terminal.start + 1, cues.logoImpact - 0.5, cues.logoImpact],
    [0, 0.55, 0.55, 1, 0.5, 0.5, 1, 1, 0],
    clamp,
  );
};

const LAYERS = [
  {size: 46, blur: 5, alpha: 0.05, speed: 0.45, shift: 0, x: -6},
  {size: 30, blur: 1.2, alpha: 0.085, speed: 1, shift: 5, x: 4},
  {size: 22, blur: 0, alpha: 0.12, speed: 1.7, shift: 9, x: -2},
];

export const CodeField: React.FC = () => {
  const frame = useCurrentFrame();
  const {W, H} = useLayout();
  const lines = content.codeTexture;
  const opacity = codeOpacityAt(beatOf(frame));
  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{perspective: 1400, overflow: 'hidden', opacity}}>
      <AbsoluteFill style={{transform: 'rotateX(28deg) rotateZ(-9deg) scale(1.35)', transformStyle: 'preserve-3d'}}>
        {LAYERS.map((layer, li) => {
          const rowH = layer.size * 2;
          // Row content repeats every `lines.length` rows → wrap the scroll on that period (seamless).
          const period = lines.length * rowH;
          const rows = Math.ceil((H * 2.4) / rowH) + lines.length;
          const y = -(((OFFSETS[frame] ?? 0) * layer.speed) % period);
          return (
            <div
              key={li}
              style={{
                position: 'absolute',
                left: `${layer.x - 30}%`,
                top: -H * 0.4,
                width: W * 1.8,
                transform: `translateY(${y}px)`,
                filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
                fontFamily: MONO,
                fontSize: layer.size,
                lineHeight: `${rowH}px`,
                whiteSpace: 'pre',
              }}
            >
              {new Array(rows).fill(0).map((_, r) => {
                const idx = (r * 3 + layer.shift) % lines.length;
                const hot = (r + li) % 7 === 0;
                return (
                  <div key={r} style={{color: hot ? colors.line : colors.white, opacity: hot ? layer.alpha * 2.4 : layer.alpha}}>
                    {lines[idx]}
                    {'        '}
                    {lines[(idx + 1) % lines.length]}
                    {'        '}
                    {lines[(idx + 2) % lines.length]}
                  </div>
                );
              })}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── Corner HUD: timecode, scene, beat counter ────────────────────────── */
const sceneAt = (beat: number): SceneName => {
  if (beat >= cues.logoImpact) return 'outro';
  const names = Object.keys(scenes) as SceneName[];
  return names.find((n) => beat >= scenes[n].start && beat < scenes[n].end) ?? 'outro';
};

export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const {pick} = useLayout();
  const beat = beatOf(frame);
  const visible =
    interpolate(beat, [0.5, 1], [0, 1], clamp) *
    interpolate(beat, [cues.logoImpact, cues.logoImpact + 0.5], [1, 0], clamp) *
    (beat >= cues.freeze && beat < cues.drop ? 0 : 1);
  if (visible <= 0) return null;

  const secs = Math.floor(frame / timeline.fps);
  const ff = String(frame % timeline.fps).padStart(2, '0');
  const timecode = `00:00:${String(secs).padStart(2, '0')}:${ff}`;
  const scene = sceneAt(beat);
  const sceneIndex = (Object.keys(scenes) as SceneName[]).indexOf(scene) + 1;
  const beatInt = Math.floor(beat);
  const pulse = 1 - (frame % FRAMES_PER_BEAT) / FRAMES_PER_BEAT;

  const pad = pick(54, 64);
  const style: React.CSSProperties = {
    position: 'absolute',
    fontFamily: MONO,
    fontSize: pick(19, 24),
    letterSpacing: '0.08em',
    color: colors.muted,
    opacity: visible * 0.85,
  };

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{...style, left: pad, top: pad}}>
        <span style={{color: colors.line}}>●</span> {content.hud.topLeft}
      </div>
      <div style={{...style, right: pad, top: pad, fontVariantNumeric: 'tabular-nums'}}>{timecode}</div>
      <div style={{...style, left: pad, bottom: pad}}>
        SC {String(sceneIndex).padStart(2, '0')} / {content.hud.sceneLabels[scene]}
      </div>
      <div style={{...style, right: pad, bottom: pad, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontVariantNumeric: 'tabular-nums'}}>
          {timeline.bpm} BPM · {String(Math.min(beatInt + 1, timeline.totalBeats)).padStart(2, '0')}/{timeline.totalBeats}
        </span>
        <span style={{display: 'flex', gap: 6}}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: pick(10, 12),
                height: pick(10, 12),
                background: i === beatInt % 4 ? colors.line : colors.faint,
                opacity: i === beatInt % 4 ? 0.5 + pulse * 0.5 : 1,
              }}
            />
          ))}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ── Flash frames on the drop and on the logo impact ──────────────────── */
export const Flashes: React.FC = () => {
  const frame = useCurrentFrame();
  let white = 0;
  let green = 0;
  for (const b of timeline.audio.impacts) {
    const t = frame - beatToFrame(b);
    if (t < 0 || t > 10) continue;
    white = Math.max(white, interpolate(t, [0, 3], [0.8, 0], {...clamp, easing: EXPO_OUT}));
    green = Math.max(green, interpolate(t, [0, 10], [0.35, 0], {...clamp, easing: EXPO_OUT}));
  }
  if (white + green <= 0) return null;
  return (
    <>
      <AbsoluteFill style={{background: colors.line, opacity: green, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: colors.white, opacity: white}} />
    </>
  );
};
