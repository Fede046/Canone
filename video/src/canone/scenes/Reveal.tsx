/**
 * 15–20 s: the name explodes out of the purple dot, then the value phrase lands on the drop —
 * the strongest moment of the video. Public: the real Music Zone figure blooms behind the words,
 * driven by the analysis of this very soundtrack. Dev: the soundtrack's own strong hits light up
 * AHEAD of the playhead.
 */
import React from 'react';
import {AbsoluteFill, interpolate, spring} from 'remotion';
import {devContent, publicContent} from '../content';
import {Logo, Wordmark, useBeat} from '../kit';
import {C, EXPO_OUT, SANS, clamp, useLayout} from '../theme';
import {FPS, beatToFrame, timelines} from '../timeline';
import {PALETTES, soundtracks} from '../zones/data';
import {MusicZone} from '../zones/MusicZone';

const NameBurst: React.FC = () => {
  const {since, tl} = useBeat();
  const {W, H, u} = useLayout();
  const t = since(tl.cues.nameImpact);
  const s = spring({frame: t, fps: FPS, config: {damping: 13, stiffness: 140, mass: 0.8}});
  const out = interpolate(since(tl.scenes.value.start), [-3, 6], [1, 0], clamp);
  const flash = interpolate(t, [0, 2, 8], [0, 0.32, 0], clamp);
  const rings = [0, 4, 8].map((d) => interpolate(t - d, [0, 26], [0, 1], {...clamp, easing: EXPO_OUT}));
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${C.purpleDeep} 0%, #0A0612 45%, #000 80%)`, opacity: out}}>
      {rings.map((r, i) =>
        r > 0 && r < 1 ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: W / 2,
              top: H / 2,
              width: 0,
              height: 0,
            }}
          >
            <div style={{position: 'absolute', left: -r * W * 0.55, top: -r * W * 0.55, width: r * W * 1.1, height: r * W * 1.1, borderRadius: '50%', border: `${u * (1.2 - r)}px solid ${i === 1 ? C.magenta : C.purple}`, opacity: 1 - r}} />
          </div>
        ) : null,
      )}
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u * 2}}>
        <div style={{transform: `scale(${s})`, filter: `drop-shadow(0 0 ${u * 5}px ${C.purple})`}}>
          <Logo size={u * 26} />
        </div>
        <div style={{transform: `translateY(${(1 - s) * u * 6}px)`, opacity: Math.min(1, s * 1.4)}}>
          <Wordmark size={u * 16} style={{textShadow: `0 0 ${u * 4}px ${C.purple}`}} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.purpleLight, opacity: flash, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

/** Words that slam in one per cue: big, sharp, with a purple halo. */
const Slam: React.FC<{words: readonly string[]; cues: readonly number[]; lines: number[][]; size: number}> = ({words, cues, lines, size}) => {
  const {since, tl} = useBeat();
  const pulse = interpolate(since(tl.cues.valuePulse), [0, 4, 20], [0, 1, 0], clamp);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.02, transform: `scale(${1 + 0.035 * pulse})`}}>
      {lines.map((ln, li) => (
        <div key={li} style={{display: 'flex', gap: size * 0.26, justifyContent: 'center'}}>
          {ln.map((i) => {
            const t = since(cues[i]);
            const p = interpolate(t, [0, 7], [0, 1], {...clamp, easing: EXPO_OUT});
            const hit = interpolate(t, [0, 2, 12], [0, 1, 0], clamp);
            return (
              <span
                key={i}
                style={{
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: size,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                  color: C.white,
                  opacity: p,
                  display: 'inline-block',
                  transform: `scale(${1.5 - 0.5 * p}) translateY(${(1 - p) * -size * 0.08}px)`,
                  filter: `blur(${(1 - p) * size * 0.06}px)`,
                  textShadow: `0 0 ${size * (0.18 + 0.25 * hit + 0.2 * pulse)}px ${C.purple}, 0 0 ${size * 0.6}px ${C.purple}88`,
                }}
              >
                {words[i]}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const PublicValue: React.FC = () => {
  const {frame, since, tl} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const t = frame / FPS;
  const bloom = interpolate(since(tl.scenes.value.start), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
  const words = publicContent.value;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: bloom, transform: `scale(${1.25 - 0.25 * bloom})`}}>
        <MusicZone song={soundtracks.public} t={t} width={W} height={H} colors={PALETTES.fast} opt={{intro: since(tl.scenes.value.start) / FPS * 2, radius: vertical ? 0.46 : 0.47}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(0,0,0,0.55), transparent 75%)'}} />
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Slam words={words} cues={timelines.public.cues.valueWords} lines={vertical ? [[0, 1], [2, 3]] : [[0, 1, 2, 3]]} size={vertical ? u * 19 : u * 17} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const DevValue: React.FC = () => {
  const {frame, since, tl} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const song = soundtracks.dev;
  const t = frame / FPS;
  const bloom = interpolate(since(tl.scenes.value.start), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
  // Strip: 6 s of the soundtrack, the playhead at 30%: everything to its right is already known
  const span = 6;
  const stripW = W * (vertical ? 0.94 : 0.86);
  const stripH = vertical ? u * 22 : u * 16;
  const headX = stripW * 0.3;
  const x0 = t - span * 0.3;
  const bars = 150;
  const onsets = song.onsets().filter(([f]) => f / FPS > x0 && f / FPS < x0 + span);
  const words = devContent.value;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 60% at 50% 55%, #1A0B33 0%, #000 75%)`}}>
      <div style={{position: 'absolute', left: (W - stripW) / 2, top: vertical ? H * 0.66 : H * 0.7, width: stripW, height: stripH, opacity: bloom}}>
        <svg width={stripW} height={stripH} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {Array.from({length: bars}, (_, i) => {
            const tt = x0 + (i / bars) * span;
            const e = song.smoothed(0, 3, tt);
            const x = (i / bars) * stripW;
            const ahead = x > headX;
            const h = (0.12 + 0.88 * e) * stripH * 0.5;
            return <rect key={i} x={x} y={stripH / 2 - h} width={(stripW / bars) * 0.6} height={h * 2} rx={1} fill={ahead ? C.purple : C.purpleLight} opacity={ahead ? 0.85 : 0.35} />;
          })}
          {onsets.map(([f, s]) => {
            const ot = f / FPS;
            const x = ((ot - x0) / span) * stripW;
            const lead = ot - t; // seconds until the playhead gets there
            const lit = lead > 0 ? interpolate(lead, [0, 2], [1, 0.45], clamp) : interpolate(-lead, [0, 0.5], [1, 0], clamp);
            return (
              <g key={f}>
                <circle cx={x} cy={-u * 2.6} r={u * (0.6 + 0.5 * s)} fill={C.magenta} opacity={lit} />
                <line x1={x} y1={-u * 1.6} x2={x} y2={stripH} stroke={C.magenta} strokeWidth={1.5} opacity={lit * 0.5} />
              </g>
            );
          })}
          <line x1={headX} y1={-u * 5} x2={headX} y2={stripH + u * 2} stroke={C.white} strokeWidth={3} />
        </svg>
        <div style={{position: 'absolute', left: headX + u * 1.5, top: stripH + u * 1.4, fontFamily: SANS, fontSize: u * 2.8, fontWeight: 700, color: C.magenta}}>known ahead →</div>
      </div>
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: vertical ? H * 0.12 : H * 0.18}}>
        <Slam words={words} cues={timelines.dev.cues.valueWords} lines={vertical ? [[0, 1], [2, 3], [4, 5]] : [[0, 1, 2], [3, 4, 5]]} size={vertical ? u * 15.5 : u * 13.5} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Reveal: React.FC = () => {
  const {audience, frame, tl} = useBeat();
  const valueStarted = frame >= beatToFrame(tl.scenes.value.start) - 3;
  return (
    <AbsoluteFill>
      {valueStarted ? audience === 'public' ? <PublicValue /> : <DevValue /> : null}
      <NameBurst />
    </AbsoluteFill>
  );
};
