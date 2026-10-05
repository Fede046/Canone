import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {Check, Moon, Pause, Play, Shuffle, Skip} from '../components/Icons';
import {Logo} from '../components/Logo';
import {MaskUp, Signal} from '../components/Stage';
import {colors, DISPLAY, EXPO_IN_OUT, lineGlow, MONO, springAt, tween, useLayout, useSceneTime} from '../theme';
import {beatToFrame, timeline} from '../timeline';

const {cues, scenes} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type FeatureScene = 'feature1' | 'feature2' | 'feature3';
const SCENE_LEN = beatToFrame(scenes.feature1.end) - beatToFrame(scenes.feature1.start);

/* ── Shared layout: giant outlined index, 2-line title, 3D demo ───────── */
const FeatureFrame: React.FC<{
  scene: FeatureScene;
  i: 0 | 1 | 2;
  children: (t: number, size: number) => React.ReactNode;
}> = ({scene, i, children}) => {
  const {since} = useSceneTime(scene);
  const {W, H, pick, vertical} = useLayout();
  const t = since(scenes[scene].start);
  const feature = content.features[i];
  const font = pick(140, 130);
  const size = pick(600, 700);

  const indexIn = tween(t, 14);
  const drift = interpolate(t, [0, SCENE_LEN], [1, -1]);

  return (
    <AbsoluteFill>
      {/* Back layer: outlined index number, slow parallax */}
      <div
        style={{
          position: 'absolute',
          left: vertical ? 0 : W * 0.38,
          right: 0,
          top: vertical ? H * 0.02 : 0,
          height: vertical ? H * 0.62 : H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: pick(860, 760),
          letterSpacing: '-0.06em',
          color: 'transparent',
          WebkitTextStroke: `3px rgba(29,185,84,${0.28 * indexIn})`,
          transform: `translateX(${drift * 70}px) scale(${interpolate(indexIn, [0, 1], [1.2, 1])})`,
        }}
      >
        {feature.index}
      </div>

      {/* Mid layer: the demo, in 3D */}
      <div
        style={{
          position: 'absolute',
          left: vertical ? 0 : W * 0.45,
          right: 0,
          top: vertical ? H * 0.07 : 0,
          height: vertical ? H * 0.55 : H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1600,
          transform: `translateX(${drift * -26}px)`,
        }}
      >
        {children(t, size)}
      </div>

      {/* Front layer: title */}
      <div
        style={{
          position: 'absolute',
          left: vertical ? 0 : pick(130, 0),
          right: vertical ? 0 : undefined,
          top: vertical ? H * 0.64 : 0,
          bottom: vertical ? undefined : 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: vertical ? 'center' : 'flex-start',
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: font,
          lineHeight: 0.92,
          letterSpacing: '-0.045em',
          transform: `translateX(${drift * 18}px)`,
        }}
      >
        <MaskUp t={t} duration={9}>
          <div style={{color: colors.white}}>{feature.lines[0]}</div>
        </MaskUp>
        <MaskUp t={t - 3} duration={9}>
          <div style={{color: colors.line}}>{feature.lines[1]}</div>
        </MaskUp>
      </div>
    </AbsoluteFill>
  );
};

/* ── 01 · Offline downloads: a cover falls onto the line, the line fills ── */
const DownloadDemo: React.FC<{t: number; size: number}> = ({t, size}) => {
  const {H} = useLayout();
  const f = content.features[0];
  const s = size * 0.62;
  const fall = springAt(t, {damping: 13, mass: 0.9});
  const progress = interpolate(t, [9, 36], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const land = Math.exp(-Math.max(0, t - 8) / 4) * (t >= 8 ? 1 : 0);
  const done = springAt(t - 37, {damping: 11});
  const barW = s * 1.25;

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transformStyle: 'preserve-3d'}}>
      <div
        style={{
          width: s,
          height: s,
          borderRadius: s * 0.06,
          background: `linear-gradient(140deg, ${colors.line} 0%, ${colors.deep} 75%)`,
          boxShadow: `0 ${50 * fall}px 90px rgba(0,0,0,0.6)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: `translateY(${(1 - fall) * -H * 0.75}px) rotateX(${interpolate(fall, [0, 1], [40, 8])}deg) rotateY(${interpolate(fall, [0, 1], [-50, -14])}deg)`,
        }}
      >
        <Logo size={s * 0.55} grooves spin={t * 4} />
        <div
          style={{
            position: 'absolute',
            right: -s * 0.07,
            top: -s * 0.07,
            width: s * 0.2,
            height: s * 0.2,
            borderRadius: '50%',
            background: colors.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${done})`,
          }}
        >
          <Check size={s * 0.12} color={colors.bg} strokeWidth={3.2} />
        </div>
      </div>
      <div style={{position: 'relative', width: barW, height: 8, marginTop: s * 0.16, borderRadius: 8, background: colors.faint}}>
        <Signal style={{left: 0, top: 1 - land * 3, width: barW * progress}} thickness={6 + land * 6} />
      </div>
      <div
        style={{
          width: barW,
          marginTop: 22,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: MONO,
          fontSize: size * 0.05,
          fontWeight: 700,
          color: progress >= 1 ? colors.line : colors.muted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{progress >= 1 ? f.status[1] : f.status[0]}</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
};

/* ── 02 · Background playback: a lock screen in 3D, play flips to pause on the beat ── */
const PlaybackDemo: React.FC<{t: number; size: number}> = ({t, size}) => {
  const {since} = useSceneTime('feature2');
  const f = content.features[1];
  const w = size * 0.6;
  const h = size * 1.12;
  const enter = springAt(t, {damping: 15, mass: 0.8});
  const toggle = since(cues.playToggle);
  const playing = toggle >= 0;
  const bump = playing ? 1 + 0.3 * Math.exp(-toggle / 3) : 1;
  const ripple = playing ? tween(toggle, 16) : 0;
  const seek = interpolate(t, [0, SCENE_LEN], [0.18, 0.62]);
  const u = w / 100;

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: u * 12,
        border: `3px solid rgba(255,255,255,0.16)`,
        background: `linear-gradient(170deg, #12241A 0%, #0A0E0C 60%)`,
        boxShadow: '0 60px 120px rgba(0,0,0,0.7)',
        position: 'relative',
        overflow: 'hidden',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 160}px) rotateY(${interpolate(enter, [0, 1], [-48, -16]) + t * 0.12}deg) rotateX(7deg)`,
        fontFamily: DISPLAY,
      }}
    >
      <div style={{position: 'absolute', top: u * 6, left: '50%', width: u * 26, height: u * 6, marginLeft: -u * 13, borderRadius: u * 3, background: '#000'}} />
      <div style={{marginTop: u * 24, textAlign: 'center', fontSize: u * 26, fontWeight: 500, color: colors.white, letterSpacing: '-0.03em'}}>
        {f.clock}
      </div>
      <div
        style={{
          position: 'absolute',
          left: u * 6,
          right: u * 6,
          top: h * 0.46,
          padding: u * 5,
          borderRadius: u * 6,
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: u * 4}}>
          <div style={{width: u * 20, height: u * 20, borderRadius: u * 3, background: `linear-gradient(140deg, ${colors.line}, ${colors.deep})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Logo size={u * 12} />
          </div>
          <div>
            <div style={{fontSize: u * 6.4, fontWeight: 800, color: colors.white, whiteSpace: 'nowrap'}}>{f.track}</div>
            <div style={{marginTop: u * 2, width: u * 30, height: u * 2.4, borderRadius: u, background: colors.muted, opacity: 0.45}} />
          </div>
        </div>
        <div style={{position: 'relative', marginTop: u * 6, height: u * 1.4, borderRadius: u, background: colors.faint}}>
          <Signal style={{left: 0, top: 0, width: `${seek * 100}%`}} thickness={u * 1.4} />
        </div>
        <div style={{marginTop: u * 5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: u * 10}}>
          <Skip back size={u * 9} color={colors.white} />
          <div style={{position: 'relative', width: u * 17, height: u * 17}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `${u * 0.8}px solid ${colors.line}`,
                transform: `scale(${1 + ripple * 1.2})`,
                opacity: playing ? 1 - ripple : 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: playing ? colors.line : colors.white,
                boxShadow: playing ? lineGlow(12) : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${bump})`,
              }}
            >
              {playing ? <Pause size={u * 9} color={colors.bg} /> : <Play size={u * 9} color={colors.bg} />}
            </div>
          </div>
          <Skip size={u * 9} color={colors.white} />
        </div>
      </div>
    </div>
  );
};

/* ── 03 · Playlists & shuffle: rows reshuffle on two beats, sleep timer counts down ── */
const ORDERS = [
  [0, 1, 2, 3, 4],
  [3, 0, 4, 1, 2],
  [1, 4, 2, 0, 3],
];
const COVER = ['#1DB954', '#7BE0A5', '#0F7A3A', '#3DDC84', '#145A32'];
const BAR = [0.62, 0.48, 0.7, 0.55, 0.66];
const DUR = ['3:24', '2:58', '4:11', '3:07', '3:45'];

const PlaylistDemo: React.FC<{t: number; size: number}> = ({t, size}) => {
  const {since} = useSceneTime('feature3');
  const f = content.features[2];
  const enter = springAt(t, {damping: 15, mass: 0.8});
  const s1 = springAt(since(cues.shuffles[0]), {damping: 16, mass: 0.7});
  const s2 = springAt(since(cues.shuffles[1]), {damping: 16, mass: 0.7});
  const w = size * 0.95;
  const u = w / 100;
  const rowH = u * 15;
  const gap = u * 3;

  const [mm, ss] = f.timer.split(':').map(Number);
  const left = Math.max(0, mm * 60 + ss - Math.floor(t / timeline.fps));
  const timer = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div
      style={{
        width: w,
        padding: u * 6,
        borderRadius: u * 6,
        background: colors.surface,
        border: '2px solid rgba(255,255,255,0.07)',
        boxShadow: '0 60px 120px rgba(0,0,0,0.65)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 160}px) rotateY(${interpolate(enter, [0, 1], [-40, -14])}deg) rotateX(10deg)`,
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: u * 5}}>
        <div style={{display: 'flex', alignItems: 'center', gap: u * 2.5, padding: `${u * 1.8}px ${u * 3.5}px`, borderRadius: 999, background: 'rgba(29,185,84,0.12)'}}>
          <Moon size={u * 5.5} color={colors.line} strokeWidth={2.4} />
          <span style={{fontFamily: MONO, fontSize: u * 5, fontWeight: 700, color: colors.line, fontVariantNumeric: 'tabular-nums'}}>{timer}</span>
        </div>
        <div
          style={{
            width: u * 12,
            height: u * 12,
            borderRadius: '50%',
            background: colors.line,
            boxShadow: lineGlow(10),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${(s1 + s2) * 180}deg)`,
          }}
        >
          <Shuffle size={u * 6.5} color={colors.bg} strokeWidth={2.6} />
        </div>
      </div>
      <div style={{position: 'relative', height: 5 * rowH + 4 * gap}}>
        {COVER.map((c, i) => {
          const p0 = ORDERS[0].indexOf(i);
          const p1 = ORDERS[1].indexOf(i);
          const p2 = ORDERS[2].indexOf(i);
          const pos = p0 + (p1 - p0) * s1 + (p2 - p1) * s2;
          const swing = Math.sin(Math.PI * Math.min(1, s1)) * (s2 < 0.01 ? 1 : 0) + Math.sin(Math.PI * Math.min(1, s2));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: pos * (rowH + gap),
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                transform: `translateX(${swing * u * 7 * (i % 2 ? 1 : -1)}px)`,
              }}
            >
              <div style={{width: rowH, height: rowH, borderRadius: u * 2.5, background: c, flexShrink: 0}} />
              <div style={{marginLeft: u * 4, flex: 1}}>
                <div style={{width: `${BAR[i] * 100}%`, height: u * 3, borderRadius: u, background: colors.white, opacity: 0.9}} />
                <div style={{marginTop: u * 2.4, width: `${BAR[i] * 55}%`, height: u * 2.4, borderRadius: u, background: colors.muted, opacity: 0.45}} />
              </div>
              <div style={{fontFamily: MONO, fontSize: u * 4.2, color: colors.muted, marginLeft: u * 3}}>{DUR[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Feature1: React.FC = () => (
  <FeatureFrame scene="feature1" i={0}>
    {(t, size) => <DownloadDemo t={t} size={size} />}
  </FeatureFrame>
);
export const Feature2: React.FC = () => (
  <FeatureFrame scene="feature2" i={1}>
    {(t, size) => <PlaybackDemo t={t} size={size} />}
  </FeatureFrame>
);
export const Feature3: React.FC = () => (
  <FeatureFrame scene="feature3" i={2}>
    {(t, size) => <PlaylistDemo t={t} size={size} />}
  </FeatureFrame>
);
