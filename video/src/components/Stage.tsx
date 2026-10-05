import React from 'react';
import {AbsoluteFill, interpolate, random, Sequence, useCurrentFrame} from 'remotion';
import {colors, EXPO_IN, EXPO_OUT, lineGlow, useLayout} from '../theme';
import {beatToFrame, timeline, type SceneName} from '../timeline';

const {cues} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ── Camera: beat punches, the push into the drop, impact shake, slow handheld drift ── */
/** `handheld` adds a slow rotation drift (off for the GIF: it changes every pixel of every frame). */
export const Camera: React.FC<{handheld?: boolean; children: React.ReactNode}> = ({handheld = true, children}) => {
  const frame = useCurrentFrame();
  let scale = 1;
  for (const b of cues.punches) {
    const t = frame - beatToFrame(b);
    if (t >= 0 && t < 14) scale += 0.028 * Math.exp(-t / 3.2);
  }
  // Push in during the last beat of the build, released by the freeze.
  const pushT = frame - beatToFrame(cues.buildPush);
  if (pushT >= 0 && frame < beatToFrame(cues.freeze)) {
    scale += interpolate(pushT, [0, beatToFrame(cues.freeze) - beatToFrame(cues.buildPush)], [0, 0.14], {
      ...clamp,
      easing: EXPO_IN,
    });
  }
  let sx = 0;
  let sy = 0;
  let rot = handheld ? Math.sin(frame / 47) * 0.25 : 0;
  for (const b of timeline.audio.impacts) {
    const t = frame - beatToFrame(b);
    if (t >= 0 && t < 14) {
      const k = (1 - t / 14) ** 2;
      sx += (random(`sx${b}-${t}`) - 0.5) * 46 * k;
      sy += (random(`sy${b}-${t}`) - 0.5) * 46 * k;
      rot += (random(`r${b}-${t}`) - 0.5) * 1.6 * k;
      scale += 0.06 * Math.exp(-t / 4);
    }
  }
  return (
    <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${scale}) rotate(${rot}deg)`}}>
      {children}
    </AbsoluteFill>
  );
};

/* ── Slit transitions: the outgoing scene is squeezed between two green lines that meet
      in the middle, then the same line splits open on the next scene. ─────────────── */
const CLOSE = 6;
const OPEN = 8;

/** Half-height of the visible slit at a global frame (null = no slit active). */
const slitHalf = (frame: number, H: number): number | null => {
  for (const b of cues.slits) {
    const f = beatToFrame(b);
    if (frame >= f - CLOSE && frame < f) return interpolate(frame, [f - CLOSE, f], [H / 2, 0], {...clamp, easing: EXPO_IN});
    if (frame >= f && frame < f + OPEN) return interpolate(frame, [f, f + OPEN], [0, H / 2], {...clamp, easing: EXPO_OUT});
  }
  return null;
};

export const SlitLines: React.FC = () => {
  const frame = useCurrentFrame();
  const {W, H} = useLayout();
  const half = slitHalf(frame, H);
  if (half === null || half >= H / 2 - 1) return null;
  const line = (y: number) => (
    <div
      style={{position: 'absolute', left: 0, width: W, top: y - 3, height: 6, background: colors.line, boxShadow: lineGlow(14)}}
    />
  );
  return (
    <AbsoluteFill>
      {line(H / 2 - half)}
      {line(H / 2 + half)}
    </AbsoluteFill>
  );
};

/** A scene = a Sequence over its beat window, clipped by the slit transitions. */
export const Scene: React.FC<{name: SceneName; children: React.ReactNode}> = ({name, children}) => {
  const {start, end} = timeline.scenes[name];
  const from = beatToFrame(start);
  return (
    <Sequence from={from} durationInFrames={beatToFrame(end) - from} name={name}>
      <SlitClip from={from}>{children}</SlitClip>
    </Sequence>
  );
};

const SlitClip: React.FC<{from: number; children: React.ReactNode}> = ({from, children}) => {
  const frame = useCurrentFrame() + from;
  const {H} = useLayout();
  const half = slitHalf(frame, H);
  const clip = half === null ? undefined : `inset(${H / 2 - half}px 0 ${H / 2 - half}px 0)`;
  return <AbsoluteFill style={{clipPath: clip}}>{children}</AbsoluteFill>;
};

/* ── Kinetic type primitives ───────────────────────────────────────────── */

/** Text that slides into view inside its own mask. `t` = frames since it should start. */
export const MaskUp: React.FC<{
  t: number;
  duration?: number;
  from?: 'below' | 'above';
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({t, duration = 10, from = 'below', children, style}) => {
  const p = interpolate(t, [0, duration], [1, 0], {...clamp, easing: EXPO_OUT});
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.06em', marginBottom: '-0.06em', ...style}}>
      <div style={{transform: `translateY(${(from === 'below' ? 1 : -1) * p * 110}%)`}}>{children}</div>
    </div>
  );
};

/** Per-letter masked drop with a stagger: the classic motion-designer type-on. */
export const Letters: React.FC<{
  text: string;
  t: number;
  stagger?: number;
  duration?: number;
  from?: 'below' | 'above';
  color?: string;
}> = ({text, t, stagger = 1.2, duration = 9, from = 'below', color = colors.white}) => (
  <span style={{display: 'inline-flex', whiteSpace: 'pre', color}}>
    {text.split('').map((ch, i) => {
      const p = interpolate(t - i * stagger, [0, duration], [1, 0], {...clamp, easing: EXPO_OUT});
      return (
        <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: '0.04em'}}>
          <span style={{display: 'inline-block', transform: `translateY(${(from === 'below' ? 1 : -1) * p * 105}%)`}}>
            {ch}
          </span>
        </span>
      );
    })}
  </span>
);

/** The "signal": a glowing green bar. */
export const Signal: React.FC<{style: React.CSSProperties; thickness?: number}> = ({style, thickness = 6}) => (
  <div
    style={{
      position: 'absolute',
      height: thickness,
      background: colors.line,
      borderRadius: thickness,
      boxShadow: lineGlow(thickness * 2.2),
      ...style,
    }}
  />
);
