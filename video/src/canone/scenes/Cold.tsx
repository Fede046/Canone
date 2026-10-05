/**
 * 0–15 s of both videos: question → problem → consequences.
 * Cold: near-black, desaturated violet, slow and controlled moves. Closed by an iris on a purple dot.
 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {brand, devContent, publicContent} from '../content';
import {MicIcon, Words, sameWord, useBeat} from '../kit';
import {C, EXPO_IN_OUT, EXPO_OUT, SANS, clamp, useLayout} from '../theme';
import {beatToFrame, timelines} from '../timeline';

type SceneKey = 'question' | 'problemA' | 'problemB' | 'consA' | 'consB';

/** Fog: two slow violet clouds over near-black. */
export const ColdBackdrop: React.FC<{grid?: boolean}> = ({grid}) => {
  const {frame} = useBeat();
  const {W, H, u} = useLayout();
  const a = frame / 30;
  return (
    <AbsoluteFill style={{background: C.cold.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: W * (0.15 + 0.04 * Math.sin(a * 0.25)), top: H * 0.1, width: W * 0.8, height: H * 0.8, borderRadius: '50%', background: `radial-gradient(closest-side, ${C.cold.fog}, transparent)`, opacity: 0.9}} />
      <div style={{position: 'absolute', left: W * (0.45 - 0.05 * Math.sin(a * 0.2)), top: H * 0.35, width: W * 0.7, height: H * 0.7, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(59,30,102,0.35), transparent)'}} />
      {grid ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.35}}>
          {Array.from({length: Math.ceil(W / (u * 6))}, (_, i) => (
            <line key={`v${i}`} x1={i * u * 6} y1={0} x2={i * u * 6} y2={H} stroke={C.cold.line} strokeWidth={1} />
          ))}
          {Array.from({length: Math.ceil(H / (u * 6))}, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * u * 6} x2={W} y2={i * u * 6} stroke={C.cold.line} strokeWidth={1} />
          ))}
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/** A line of cold text: rises in slowly, fades before the next scene. */
const ColdText: React.FC<{scene: SceneKey; text: string; y: number; size: number; style?: (i: number, w: string) => React.CSSProperties; stagger?: number}> = ({
  scene,
  text,
  y,
  size,
  style,
  stagger = 5,
}) => {
  const {since, tl} = useBeat();
  const {W, vertical} = useLayout();
  const sc = tl.scenes[scene];
  const t = since(sc.start + 0.25);
  const out = interpolate(since(sc.end), [-8, 0], [1, 0], clamp);
  if (t < -2 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: W * (vertical ? 0.06 : 0.1), right: W * (vertical ? 0.06 : 0.1), top: y, display: 'flex', justifyContent: 'center', textAlign: 'center', opacity: out}}>
      <Words text={text} t={t} stagger={stagger} duration={22} color={C.cold.text} style={{fontFamily: SANS, fontSize: size, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, justifyContent: 'center'}} wordStyle={style} />
    </div>
  );
};

/** The iris that closes the cold part on a purple dot (the dot becomes the logo). */
export const ColdIris: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {since, tl} = useBeat();
  const {W, H, u} = useLayout();
  const iris = tl.cues.iris;
  const p = interpolate(since(iris), [0, beatToFrame(1.1)], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const r = (1 - p) * Math.hypot(W, H) * 0.6;
  const dot = interpolate(since(iris + 0.7), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{clipPath: p > 0 ? `circle(${r}px at 50% 50%)` : undefined}}>{children}</AbsoluteFill>
      {dot > 0 ? (
        <div style={{position: 'absolute', left: W / 2 - u * 1.2, top: H / 2 - u * 1.2, width: u * 2.4, height: u * 2.4, borderRadius: '50%', background: C.purple, transform: `scale(${dot})`, boxShadow: `0 0 ${u * 4}px ${C.purple}`}} />
      ) : null}
    </AbsoluteFill>
  );
};

/* ── A "dead" player screen: grey cover, grey text, a crawling bar ── */
const DimPhone: React.FC<{width: number; frame: number; label?: string; labelP?: number}> = ({width, frame, label, labelP = 0}) => {
  const u = width / 100;
  const prog = ((frame / 30) * 0.012 + 0.18) % 1;
  return (
    <div style={{position: 'relative', width}}>
      <div style={{width, height: width * 2.08, borderRadius: u * 13, padding: u * 2.6, background: '#16131D', boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(207,201,220,0.08)'}}>
        <div style={{width: '100%', height: '100%', borderRadius: u * 10.6, background: '#0D0B12', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: u * 24, left: u * 10, width: u * 80, height: u * 80, borderRadius: u * 3, background: '#24202D'}} />
          <div style={{position: 'absolute', top: u * 112, left: u * 10, width: u * 52, height: u * 5, borderRadius: u, background: '#2C2836'}} />
          <div style={{position: 'absolute', top: u * 121, left: u * 10, width: u * 32, height: u * 3.6, borderRadius: u, background: '#221F2A'}} />
          <div style={{position: 'absolute', top: u * 136, left: u * 10, width: u * 80, height: u * 1.2, borderRadius: u, background: '#24202D'}}>
            <div style={{width: `${prog * 100}%`, height: '100%', borderRadius: u, background: C.cold.dim}} />
          </div>
          <div style={{position: 'absolute', top: u * 150, left: u * 10, right: u * 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            {[7, 15, 7].map((s, i) => (
              <div key={i} style={{width: u * s, height: u * s, borderRadius: '50%', background: i === 1 ? '#2C2836' : '#221F2A'}} />
            ))}
          </div>
        </div>
      </div>
      {label ? (
        <div style={{position: 'absolute', top: width * 2.08 + u * 6, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontSize: u * 7, fontWeight: 650, color: C.cold.text, opacity: labelP, transform: `translateY(${(1 - labelP) * u * 4}px)`}}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

/** A moving waveform (SVG path). `wild` 0 = calm sine, 1 = jagged and busy. */
const wavePath = (w: number, amp: number, phase: number, wild: number, points = 140) => {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = i / points;
    const env = Math.sin(Math.PI * x) ** 1.1;
    const calm = Math.sin(x * 9 + phase * 0.6);
    const busy = Math.sin(x * 31 + phase * 2.2) * 0.55 + Math.sin(x * 73 - phase * 3.1) * 0.35 + Math.sign(Math.sin(x * 17 + phase * 1.7)) * 0.3;
    const y = (calm * (1 - wild) + busy * wild) * amp * env;
    d += `${i ? 'L' : 'M'}${(x * w).toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
};

/* ═══ PUBLIC ═══════════════════════════════════════════════════════════════ */
export const PublicCold: React.FC = () => {
  const {frame, since, tl} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = publicContent;
  const cues = timelines.public.cues;
  const sc = tl.scenes;
  const titleSize = vertical ? u * 8.6 : u * 8;
  const topY = vertical ? H * 0.1 : H * 0.09;

  // Phones: one dim phone in the question/problem, two from problem B
  const phoneW = vertical ? u * 38 : u * 28;
  const enter = interpolate(since(0), [0, beatToFrame(8)], [0, 1], {...clamp, easing: EXPO_OUT});
  const fwd = interpolate(since(sc.problemA.start), [0, 24], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const split = interpolate(since(cues.phones[0]), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});
  const second = interpolate(since(cues.phones[1]), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});
  const fade = interpolate(since(sc.consB.start), [0, 30], [1, 0.22], clamp);
  const phoneY = vertical ? H * 0.3 : H * 0.3 + (1 - fwd) * H * 0.05;
  const scale = (0.86 + 0.14 * fwd) * (0.96 + 0.04 * enter);
  const gap = vertical ? W * 0.22 : W * 0.15;
  const x1 = W / 2 - split * gap;
  const x2 = W / 2 + gap;
  const label = interpolate(since(cues.phones[1] + 0.5), [0, 12], [0, 1], clamp);

  // Waves (consequences A): fast over phone 1, calm over phone 2
  const waveP = (i: number) => interpolate(since(cues.waves[i]), [0, 18], [0, 1], {...clamp, easing: EXPO_OUT}) * interpolate(since(sc.consB.start + 1), [0, 20], [1, 0], clamp);
  const ph = frame / 30;

  // Callouts (problem A)
  const call = (i: number) => interpolate(since(cues.callouts[i]), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT}) * interpolate(since(sc.problemB.start), [-6, 4], [1, 0], clamp);

  const hear = interpolate(since(cues.hear), [0, 12], [0, 1], clamp);
  const see = interpolate(since(cues.see), [0, 20], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <ColdBackdrop />
      {/* Phones */}
      <div style={{position: 'absolute', left: x1 - phoneW / 2, top: phoneY, opacity: (0.25 + 0.75 * fwd) * enter * fade, transform: `scale(${scale})`, transformOrigin: 'center top'}}>
        <DimPhone width={phoneW} frame={frame} label={brand.songs.fast.tag} labelP={label} />
        {/* callouts */}
        {[0, 1].map((i) => {
          const p = call(i);
          if (p <= 0) return null;
          const pu = phoneW / 100;
          const y = i === 0 ? pu * 64 : pu * 139;
          const toRight = i === 0;
          const len = (vertical ? W * 0.18 : W * 0.12) * p;
          return (
            <div key={i} style={{position: 'absolute', top: y, [toRight ? 'left' : 'right']: phoneW * 0.88, display: 'flex', alignItems: 'center', flexDirection: toRight ? 'row' : 'row-reverse', gap: u * 1.2}}>
              <div style={{width: len, height: 2, background: C.cold.accent}} />
              <div style={{width: u * 1.2, height: u * 1.2, borderRadius: '50%', background: C.cold.accent}} />
              <div style={{fontFamily: SANS, fontSize: u * 3.4, fontWeight: 600, color: C.cold.text, opacity: p, whiteSpace: 'nowrap'}}>{c.problem.a.callouts[i]}</div>
            </div>
          );
        })}
        {/* fast wave */}
        <svg width={phoneW * 1.3} height={u * 14} style={{position: 'absolute', left: -phoneW * 0.15, top: -u * 12.5, opacity: waveP(0), overflow: 'visible'}}>
          <path d={wavePath(phoneW * 1.3, u * 4.2 * waveP(0), ph * 3, 1)} transform={`translate(0 ${u * 7})`} fill="none" stroke={C.cold.accent} strokeWidth={u * 0.45} strokeLinejoin="round" />
        </svg>
      </div>
      {second > 0 ? (
        <div style={{position: 'absolute', left: x2 - phoneW / 2, top: phoneY, opacity: second * fade, transform: `scale(${scale * (0.9 + 0.1 * second)})`, transformOrigin: 'center top'}}>
          <DimPhone width={phoneW} frame={frame + 40} label={brand.songs.calm.tag} labelP={label} />
          <svg width={phoneW * 1.3} height={u * 14} style={{position: 'absolute', left: -phoneW * 0.15, top: -u * 12.5, opacity: waveP(1), overflow: 'visible'}}>
            <path d={wavePath(phoneW * 1.3, u * 4.2 * waveP(1), ph * 0.9, 0)} transform={`translate(0 ${u * 7})`} fill="none" stroke={C.cold.accent} strokeWidth={u * 0.45} strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}

      {/* Words */}
      <ColdText scene="question" text={c.question.text} y={vertical ? H * 0.12 : H * 0.36} size={titleSize * 1.1} stagger={6} style={(i, w) => (sameWord(w, c.question.highlight) ? {color: C.purpleLight} : {})} />
      <ColdText scene="problemA" text={c.problem.a.text} y={topY} size={titleSize} />
      <ColdText scene="problemB" text={c.problem.b.text} y={topY} size={titleSize} />
      <ColdText scene="consA" text={c.consequences.a.text} y={topY} size={titleSize} stagger={8} />
      <ColdText
        scene="consB"
        text={c.consequences.b.text}
        y={vertical ? H * 0.36 : H * 0.38}
        size={titleSize * 1.05}
        style={(i, w) =>
          sameWord(w, c.consequences.b.bright)
            ? {color: `rgba(196,165,255,${0.4 + 0.6 * hear})`, textShadow: hear > 0 ? `0 0 ${u * 3 * hear}px ${C.purple}` : undefined}
            : sameWord(w, c.consequences.b.dim)
              ? {opacity: 1 - 0.8 * see, filter: `blur(${see * u * 0.35}px)`}
              : {}
        }
      />
    </AbsoluteFill>
  );
};

/* ═══ DEV ══════════════════════════════════════════════════════════════════ */
const Dialog: React.FC<{u: number; p: number; press?: number; hover?: number}> = ({u, p, press = 0, hover = 0}) => {
  const d = devContent.problem.dialog;
  return (
    <div
      style={{
        width: u * 52,
        borderRadius: u * 4,
        background: '#1B1823',
        padding: `${u * 4.5}px ${u * 4}px ${u * 3}px`,
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(207,201,220,0.1)',
        fontFamily: SANS,
        color: C.cold.text,
        opacity: p,
        transform: `scale(${0.92 + 0.08 * p})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: u * 2.6,
      }}
    >
      <div style={{width: u * 9, height: u * 9, borderRadius: '50%', background: '#2A2536', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <MicIcon size={u * 5} color={C.cold.text} />
      </div>
      <div style={{fontSize: u * 4, fontWeight: 650, textAlign: 'center', lineHeight: 1.25}}>{d.title}</div>
      <div style={{display: 'flex', gap: u * 2, width: '100%', marginTop: u * 1}}>
        {[d.deny, d.allow].map((b, i) => (
          <div
            key={b}
            style={{
              flex: 1,
              height: u * 7.5,
              borderRadius: u * 4,
              border: `1px solid ${C.cold.line}`,
              background: i === 0 && hover > 0 ? `rgba(125,108,158,${0.25 * hover + 0.25 * press})` : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: u * 3.3,
              fontWeight: 650,
              transform: i === 0 ? `scale(${1 - 0.05 * Math.sin(Math.PI * press)})` : undefined,
            }}
          >
            {b}
          </div>
        ))}
      </div>
    </div>
  );
};

/** A generic bar visualizer, reacting late and jittery (the "before"). */
const OldBars: React.FC<{w: number; h: number; frame: number; alpha: number}> = ({w, h, frame, alpha}) => {
  const n = 18;
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: w / n / 4, width: w, height: h, opacity: alpha}}>
      {Array.from({length: n}, (_, i) => {
        const lag = Math.floor((frame - 4) / 3) * 3; // steps and lags
        const v = 0.15 + 0.85 * Math.abs(Math.sin(lag * 0.11 + i * 0.7) * Math.sin(lag * 0.05 + i * 0.3));
        return <div key={i} style={{flex: 1, height: `${v * 100}%`, background: C.cold.dim, borderRadius: 3}} />;
      })}
    </div>
  );
};

export const DevCold: React.FC = () => {
  const {frame, since, tl} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = devContent;
  const cues = timelines.dev.cues;
  const sc = tl.scenes;
  const titleSize = vertical ? u * 8.2 : u * 7.6;
  const topY = vertical ? H * 0.1 : H * 0.09;

  const barsA = interpolate(since(0), [0, 40], [0, 0.55], clamp) * interpolate(since(sc.problemA.start), [-10, 6], [1, 0], clamp);
  const dialogP =
    interpolate(since(cues.dialog), [0, 16], [0, 1], {...clamp, easing: EXPO_OUT}) * interpolate(since(sc.problemB.start), [-6, 4], [1, 0], clamp) +
    interpolate(since(sc.consA.start), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT}) * interpolate(since(sc.consB.start), [-6, 4], [1, 0], clamp);
  const hover = interpolate(since(cues.denyHover), [0, 16], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const press = interpolate(since(cues.denyHover + 1.2), [0, 8], [0, 1], clamp);
  const inCons = frame >= beatToFrame(sc.consA.start);

  // Timeline with the future in the fog (problem B)
  const tlP = interpolate(since(sc.problemB.start), [0, 18], [0, 1], {...clamp, easing: EXPO_OUT}) * interpolate(since(sc.consA.start), [-6, 4], [1, 0], clamp);
  const fog = interpolate(since(cues.fog), [0, 24], [0, 1], {...clamp, easing: EXPO_OUT});
  const stripW = vertical ? W * 0.88 : W * 0.72;
  const stripH = vertical ? u * 26 : u * 24;
  const scroll = frame * 2.2;

  // Late beats (consequences B)
  const gridP = interpolate(since(sc.consB.start), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});

  const dialogY = vertical ? H * 0.42 : H * 0.36;
  return (
    <AbsoluteFill>
      <ColdBackdrop grid />
      {/* Question: old bars */}
      <div style={{position: 'absolute', left: (W - (vertical ? W * 0.8 : W * 0.5)) / 2, top: vertical ? H * 0.5 : H * 0.6}}>
        <OldBars w={vertical ? W * 0.8 : W * 0.5} h={vertical ? H * 0.16 : H * 0.22} frame={frame} alpha={barsA} />
      </div>
      {/* Dialog */}
      {dialogP > 0 ? (
        <div style={{position: 'absolute', left: W / 2 - u * 26, top: dialogY}}>
          <Dialog u={u} p={Math.min(1, dialogP)} hover={inCons ? hover : 0} press={inCons ? press : 0} />
          {inCons ? (
            <svg width={u * 6} height={u * 6} viewBox="0 0 24 24" style={{position: 'absolute', left: interpolate(hover, [0, 1], [u * 42, u * 12]), top: interpolate(hover, [0, 1], [u * 40, u * 27]), transform: `scale(${1 - 0.15 * Math.sin(Math.PI * press)})`}}>
              <path d="M5 3l14 8-6 1.5L10 19z" fill={C.white} stroke="#000" strokeWidth="1" />
            </svg>
          ) : null}
        </div>
      ) : null}
      {/* Timeline with fog */}
      {tlP > 0 ? (
        <div style={{position: 'absolute', left: (W - stripW) / 2, top: vertical ? H * 0.44 : H * 0.42, width: stripW, height: stripH, opacity: tlP}}>
          <svg width={stripW} height={stripH} style={{position: 'absolute', inset: 0}}>
            <path
              d={(() => {
                let d = '';
                for (let x = 0; x <= stripW; x += 3) {
                  const s = (x + scroll) * 0.045;
                  const a = (Math.sin(s) * 0.5 + Math.sin(s * 2.7) * 0.3 + Math.sin(s * 7.1) * 0.2) * (0.5 + 0.5 * Math.abs(Math.sin(s * 0.21)));
                  d += `M${x},${stripH / 2 - a * stripH * 0.42} L${x},${stripH / 2 + a * stripH * 0.42} `;
                }
                return d;
              })()}
              stroke={C.cold.accent}
              strokeWidth={1.6}
            />
          </svg>
          <div style={{position: 'absolute', left: stripW / 2, top: 0, width: stripW / 2, height: stripH, background: `linear-gradient(90deg, rgba(7,6,11,${0.75 * fog}) 0%, rgba(7,6,11,${0.98 * fog}) 30%)`, backdropFilter: `blur(${6 * fog}px)`}} />
          <div style={{position: 'absolute', left: stripW / 2 - 1.5, top: -u * 3, width: 3, height: stripH + u * 6, background: C.purpleLight}} />
          <div style={{position: 'absolute', left: stripW / 2, top: stripH + u * 3.5, transform: 'translateX(-50%)', fontFamily: SANS, fontSize: u * 3.2, fontWeight: 650, color: C.purpleLight}}>now</div>
          <div style={{position: 'absolute', left: stripW * 0.75, top: stripH / 2, transform: 'translate(-50%,-50%)', fontFamily: SANS, fontSize: u * 9, fontWeight: 800, color: C.cold.dim, opacity: fog}}>?</div>
        </div>
      ) : null}
      {/* Late beats */}
      {gridP > 0 ? (
        <div style={{position: 'absolute', left: (W - stripW) / 2, top: vertical ? H * 0.46 : H * 0.44, width: stripW, height: stripH, opacity: gridP * interpolate(since(cues.iris), [0, 10], [1, 0.6], clamp)}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: stripH * 0.62, height: 2, background: C.cold.line}} />
          {[0, 1, 2, 3, 4].map((i) => {
            const x = stripW * (0.1 + i * 0.2);
            const mark = i < 3 ? interpolate(since(cues.lateMarks[i]), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT}) : 0;
            const late = u * 5.5;
            return (
              <React.Fragment key={i}>
                <div style={{position: 'absolute', left: x - 1.5, top: stripH * 0.3, width: 3, height: stripH * 0.32, background: C.cold.text}} />
                <div style={{position: 'absolute', left: x - u * 3, top: stripH * 0.68, fontFamily: SANS, fontSize: u * 3.2, color: C.cold.dim, width: u * 6, textAlign: 'center'}}>beat</div>
                {mark > 0 ? (
                  <>
                    <div style={{position: 'absolute', left: x + late - u * 0.8, top: stripH * 0.62 - stripH * 0.5 * mark, width: u * 2.2, height: stripH * 0.5 * mark, background: C.purple, borderRadius: u * 0.5}} />
                    <div style={{position: 'absolute', left: x + 2, top: stripH * 0.14, width: late - 2, height: 2, background: C.magenta, opacity: mark}} />
                    <div style={{position: 'absolute', left: x, top: -u * 0.5, width: late, textAlign: 'center', fontFamily: SANS, fontSize: u * 3.2, fontWeight: 700, color: C.magenta, opacity: mark}}>{c.consequences.lateLabel}</div>
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      <ColdText scene="question" text={c.question.text} y={vertical ? H * 0.22 : H * 0.3} size={titleSize * 1.12} stagger={6} style={(i, w) => (sameWord(w, c.question.highlight) ? {color: C.purpleLight} : {})} />
      <ColdText scene="problemA" text={c.problem.a.text} y={topY} size={titleSize} style={(i, w) => (sameWord(w, c.problem.a.highlight) ? {color: C.purpleLight} : {})} />
      <ColdText scene="problemB" text={c.problem.b.text} y={topY} size={titleSize} style={(i, w) => (sameWord(w, c.problem.b.highlight) ? {color: C.purpleLight} : {})} />
      <ColdText scene="consA" text={c.consequences.a.text} y={topY} size={titleSize} />
      <ColdText scene="consB" text={c.consequences.b.text} y={topY} size={titleSize} style={(i, w) => (sameWord(w, c.consequences.b.highlight) ? {color: C.magenta} : {})} />
    </AbsoluteFill>
  );
};
