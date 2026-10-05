import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {DISPLAY, EXPO_IN, EXPO_IN_OUT, EXPO_OUT, tween, useLayout} from '../../theme';
import {content} from '../content';
import {clamp, DataPhoneIcon, pal, PlaneIcon, SignalBars, TrainIcon, useSceneTime, wave, Words} from '../kit';
import {beatToFrame, timeline} from '../timeline';

const {cues} = timeline;

/** Iris that closes the cold part to black right before the silence. */
const irisRadius = (frame: number, W: number, H: number) =>
  interpolate(frame, [beatToFrame(cues.iris), beatToFrame(timeline.audio.silence.start)], [Math.hypot(W, H) / 2, 0], {
    ...clamp,
    easing: EXPO_IN,
  });

/** Wraps the whole cold part (backdrop + scenes) so the iris closes on everything. */
export const ColdIris: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {W, H} = useLayout();
  return <AbsoluteFill style={{clipPath: `circle(${irisRadius(frame, W, H)}px at 50% 50%)`}}>{children}</AbsoluteFill>;
};

/* ── Backdrop for 0–15 s: cold, deep, slowly breathing ────────────────── */
export const ColdBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = 0.5 + 0.5 * Math.sin(frame / 40);
  return (
    <AbsoluteFill style={{background: pal.black}}>
      <AbsoluteFill
        style={{background: `radial-gradient(ellipse ${70 + breathe * 8}% 60% at 50% 45%, ${pal.cold.bg2} 0%, ${pal.cold.bg} 75%)`}}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};

/* ── 1 · Question: a tunnel, a waveform that dies on "stop" ───────────── */
const Tunnel: React.FC<{frame: number}> = ({frame}) => {
  const {W, H} = useLayout();
  const rings = 10;
  const speed = 0.012; // slow, controlled
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      {new Array(rings).fill(0).map((_, i) => {
        const z = (i + frame * speed * rings) % rings; // 0 far → rings near
        const s = 0.08 * 1.32 ** z;
        const o = interpolate(z, [0, 2, rings - 2, rings], [0, 0.8, 0.5, 0]);
        const w = Math.min(W, H) * 0.9 * s;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: w * 1.25,
              height: w,
              borderRadius: `${w * 0.6}px ${w * 0.6}px ${w * 0.08}px ${w * 0.08}px`,
              border: `${Math.max(1, s * 2.5)}px solid ${pal.cold.steel}`,
              opacity: o,
            }}
          >
            {[0.18, 0.82].map((x) => (
              <div
                key={x}
                style={{
                  position: 'absolute',
                  left: `${x * 100}%`,
                  top: '12%',
                  width: Math.max(2, s * 10),
                  height: Math.max(1, s * 4),
                  borderRadius: 4,
                  background: pal.cold.ice,
                  boxShadow: `0 0 ${s * 30}px ${pal.cold.ice}`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Question: React.FC = () => {
  const {frame, since} = useSceneTime('question');
  const {W, H, pick} = useLayout();
  const flat = since(cues.flatline);
  const life = interpolate(flat, [0, 10], [1, 0], {...clamp, easing: EXPO_OUT});
  const waveW = W * pick(0.6, 0.8);
  const font = pick(104, 96);

  return (
    <AbsoluteFill>
      <Tunnel frame={frame} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${(W - waveW) / 2} ${H * pick(0.74, 0.7)})`}>
          <path
            d={wave(waveW, pick(46, 60), frame * 0.12, life)}
            fill="none"
            stroke={flat >= 0 ? pal.cold.dim : pal.cold.ice}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={interpolate(frame, [0, 12], [0, 1], clamp)}
          />
        </g>
      </svg>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: H * 0.06}}>
        <div style={{maxWidth: pick(1500, 920), justifyContent: 'center', display: 'flex'}}>
          <Words
            text={content.question.text}
            t={since(cues.questionWords)}
            stagger={4}
            duration={16}
            color={pal.cold.text}
            style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: font, letterSpacing: '-0.035em', lineHeight: 1.08, justifyContent: 'center'}}
            wordStyle={(_, w) =>
              w === content.question.highlight
                ? {color: flat >= 0 ? pal.cold.ice : pal.cold.text, textDecoration: flat >= 0 ? 'line-through' : undefined, textDecorationThickness: '0.08em'}
                : {}
            }
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── 2 · Problem: bars switch off, then NO SIGNAL / NO MUSIC ──────────── */
export const Problem: React.FC = () => {
  const {frame, since} = useSceneTime('problem');
  const {pick} = useLayout();
  const p = content.problem;

  const partA = since(cues.noSignal) < 0;
  if (partA) {
    const on = 4 - cues.signalBarsOff.filter((b) => since(b) >= 0).length;
    const out = interpolate(since(cues.noSignal), [-8, 0], [1, 0], clamp);
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: pick(60, 80), opacity: out}}>
        <div style={{opacity: tween(since(timeline.scenes.problem.start), 14)}}>
          <SignalBars size={pick(200, 240)} color={pal.cold.ice} on={on} offColor={pal.cold.steel} />
        </div>
        <div style={{maxWidth: pick(1500, 940), display: 'flex', justifyContent: 'center'}}>
          <Words
            text={p.line}
            t={since(timeline.scenes.problem.start + 0.5)}
            stagger={4}
            duration={14}
            color={pal.cold.text}
            highlight={[p.highlight]}
            highlightColor={pal.cold.ice}
            style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(96, 92), letterSpacing: '-0.035em', lineHeight: 1.1, justifyContent: 'center'}}
          />
        </div>
      </AbsoluteFill>
    );
  }

  const tS = since(cues.noSignal);
  const tM = since(cues.noMusic);
  const stop = since(cues.spinnerStop);
  const spin = stop < 0 ? frame * 9 : beatToFrame(cues.spinnerStop) * 9;
  const nudge = (t: number) => (t >= 0 ? 1 + 0.03 * Math.exp(-t / 5) : 1);
  const big = pick(190, 170);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', transform: `scale(${nudge(tS) * nudge(tM)})`}}>
      <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: big, letterSpacing: '-0.045em', lineHeight: 0.98, textAlign: 'center'}}>
        <Words text={p.noSignal} t={tS} stagger={3} duration={10} color={pal.cold.text} style={{justifyContent: 'center'}} />
        <Words text={p.noMusic} t={tM} stagger={3} duration={10} color={pal.cold.ice} style={{justifyContent: 'center'}} />
      </div>
      <svg width={110} height={110} viewBox="0 0 50 50" style={{marginTop: pick(50, 80), opacity: interpolate(stop, [0, 20], [0.9, 0.25], clamp)}}>
        <circle cx="25" cy="25" r="20" fill="none" stroke={pal.cold.steel} strokeWidth="3" />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={pal.cold.ice}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="30 200"
          transform={`rotate(${spin} 25 25)`}
        />
      </svg>
    </AbsoluteFill>
  );
};

/* ── 3 · Consequences: who suffers, then the music "vanishes" ─────────── */
export const Consequences: React.FC = () => {
  const {frame, since} = useSceneTime('consequences');
  const {pick, vertical} = useLayout();
  const c = content.consequences;

  if (since(cues.vanishLine) < 0) {
    const out = interpolate(since(cues.vanishLine), [-8, 0], [1, 0], clamp);
    const icons = [
      (s: number) => <TrainIcon size={s} color={pal.cold.ice} strokeWidth={1.3} />,
      (s: number) => <PlaneIcon size={s} color={pal.cold.ice} strokeWidth={1.3} />,
      (s: number) => (
        <DataPhoneIcon size={s} color={pal.cold.ice} strokeWidth={1.3} level={interpolate(frame, [beatToFrame(4), beatToFrame(10)], [0.7, 0.06], clamp)} />
      ),
    ];
    return (
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: vertical ? 'column' : 'row',
          gap: pick(90, 70),
          opacity: out,
          padding: pick('0 120px', '0 60px'),
        }}
      >
        {c.people.map((label, i) => {
          const t = since(cues.people[i]);
          const pIn = interpolate(t, [0, 16], [0, 1], {...clamp, easing: EXPO_OUT});
          return (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: vertical ? 'row' : 'column',
                alignItems: 'center',
                gap: pick(28, 36),
                width: vertical ? 900 : i === 2 ? 560 : 400,
                opacity: pIn,
                transform: `translateY(${(1 - pIn) * 40}px)`,
              }}
            >
              <div style={{width: pick(150, 130), display: 'flex', justifyContent: 'center', flexShrink: 0}}>{icons[i](pick(150, 130))}</div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: pick(58, 66),
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  color: pal.cold.text,
                  textAlign: vertical ? 'left' : 'center',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  const tV = since(cues.vanish);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{maxWidth: pick(1500, 940), display: 'flex', justifyContent: 'center'}}>
        <Words
          text={c.line}
          t={since(cues.vanishLine)}
          stagger={3}
          duration={14}
          color={pal.cold.text}
          style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(104, 96), letterSpacing: '-0.035em', lineHeight: 1.1, justifyContent: 'center'}}
          wordStyle={(_, w) => {
            if (w !== c.vanishWord || tV < 0) return {};
            const p = interpolate(tV, [0, 16], [0, 1], {...clamp, easing: EXPO_IN_OUT});
            return {opacity: 1 - p, filter: `blur(${p * 14}px)`, transform: `translateY(${-p * 40}px) scale(${1 + p * 0.15})`, letterSpacing: `${p * 0.2}em`};
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
