import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {DISPLAY, EXPO_OUT, MONO} from '../theme';
import {beatToFrame, timeline, type SceneName} from './timeline';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Palettes follow the emotional arc: cold → project green → clean paper → warm sunrise. */
export const pal = {
  cold: {bg: '#091017', bg2: '#14222D', text: '#DCE6EE', dim: '#556B7C', steel: '#2E4556', ice: '#8FB3CC'},
  green: '#1DB954',
  black: '#050706',
  paper: {bg: '#F1F3EF', card: '#FFFFFF', ink: '#0B100D', dim: '#66706A', line: '#DDE2DC'},
  code: {bg: '#0E1411', bar: '#161E19', text: '#E6EDE8', dim: '#5E6B63', kw: '#C792EA', str: '#9BE59E', ann: '#FFCB6B', fn: '#82AAFF'},
  warm: {top: '#2A2046', mid: '#A9497A', low: '#F28C5A', horizon: '#FFC36E', sun: '#FFE7A8', plum: '#22132A', text: '#FFF8EE'},
} as const;

/** Time helpers inside the Sequence of `scene`: `since(beat)` = frames since an absolute beat. */
export const useSceneTime = (scene: SceneName, lead = 0) => {
  const frame = useCurrentFrame();
  const sceneStart = beatToFrame(timeline.scenes[scene].start) - lead;
  const since = (beat: number) => frame + sceneStart - beatToFrame(beat);
  return {frame, since, global: frame + sceneStart};
};

/* ── Kinetic words: each word rises out of its own mask ───────────────── */
export const Words: React.FC<{
  text: string;
  t: number; // frames since the first word should start
  stagger?: number;
  duration?: number;
  highlight?: readonly string[];
  highlightColor?: string;
  color?: string;
  style?: React.CSSProperties;
  wordStyle?: (i: number, word: string) => React.CSSProperties;
}> = ({text, t, stagger = 3, duration = 12, highlight = [], highlightColor, color, style, wordStyle}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'inherit', columnGap: '0.26em', ...style}}>
    {text.split(' ').map((w, i) => {
      const p = interpolate(t - i * stagger, [0, duration], [0, 1], {...clamp, easing: EXPO_OUT});
      const hot = highlight.some((h) => w.replace(/[.,?!—]/g, '') === h);
      return (
        <span key={i} style={{display: 'inline-block', overflow: p < 1 ? 'hidden' : 'visible', paddingBottom: '0.08em', marginBottom: '-0.08em'}}>
          <span
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - p) * 105}%)`,
              color: hot && highlightColor ? highlightColor : color,
              ...wordStyle?.(i, w),
            }}
          >
            {w}
          </span>
        </span>
      );
    })}
  </div>
);

/* ── Code window (terminal or editor) with typing + line highlight ────── */
const KW = /\b(suspend|fun|val|Boolean|SELECT|FROM|ORDER|BY|DESC)\b/;
const tokenColor = (tok: string, inString: boolean) => {
  if (inString) return pal.code.str;
  if (tok.startsWith('@')) return pal.code.ann;
  if (KW.test(tok)) return pal.code.kw;
  if (/^[a-z]\w*(?=\()/.test(tok)) return pal.code.fn;
  return pal.code.text;
};
/** Very small highlighter: strings, annotations, keywords, calls. */
const Highlighted: React.FC<{text: string; token?: string; tokenP?: number}> = ({text, token, tokenP = 0}) => {
  const parts: React.ReactNode[] = [];
  const re = /("[^"]*"?)|(@\w+)|(\w+(?=\())|(\w+)|(\s+)|([^\w\s"]+)/g;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    const tok = m[0];
    const isStr = Boolean(m[1]);
    if (isStr && token && tok.includes(token)) {
      const [a, b] = tok.split(token);
      parts.push(
        <span key={k++} style={{color: pal.code.str}}>
          {a}
          <span
            style={{
              color: tokenP > 0.5 ? pal.code.bg : pal.code.str,
              background: `linear-gradient(90deg, ${pal.green} ${tokenP * 100}%, transparent ${tokenP * 100}%)`,
              borderRadius: 6,
              padding: '0 0.1em',
              margin: '0 -0.1em',
            }}
          >
            {token}
          </span>
          {b}
        </span>,
      );
      continue;
    }
    parts.push(
      <span key={k++} style={{color: tokenColor(tok, isStr), fontWeight: m[3] ? 700 : undefined}}>
        {tok}
      </span>,
    );
  }
  return <>{parts}</>;
};

export const CodeWindow: React.FC<{
  kind: 'terminal' | 'editor';
  title: string;
  lines: readonly string[];
  typed: number; // characters typed so far, counted across lines
  fontSize: number;
  width: number;
  prompt?: string;
  done?: {text: string; p: number};
  highlightLines?: readonly number[];
  highlightP?: number;
  token?: string;
  cursorBlink?: boolean;
  style?: React.CSSProperties;
}> = ({kind, title, lines, typed, fontSize, width, prompt, done, highlightLines = [], highlightP = 0, token, cursorBlink, style}) => {
  // Characters visible on each line, filling lines in order.
  let left = typed;
  const ns = lines.map((l) => {
    const n = Math.max(0, Math.min(l.length, left));
    left -= l.length;
    return n;
  });
  const total = lines.reduce((a, l) => a + l.length, 0);
  const cursorLine = typed < total ? ns.findIndex((n, i) => n < lines[i].length) : cursorBlink ? lines.length - 1 : -1;
  return (
    <div
      style={{
        width,
        borderRadius: fontSize * 0.55,
        background: pal.code.bg,
        boxShadow: '0 40px 90px rgba(10,20,15,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        fontFamily: MONO,
        ...style,
      }}
    >
      <div
        style={{
          height: fontSize * 1.8,
          display: 'flex',
          alignItems: 'center',
          gap: fontSize * 0.32,
          padding: `0 ${fontSize * 0.7}px`,
          background: pal.code.bar,
          position: 'relative',
        }}
      >
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <div key={c} style={{width: fontSize * 0.42, height: fontSize * 0.42, borderRadius: '50%', background: c}} />
        ))}
        <div
          style={{
            position: 'absolute',
            left: kind === 'editor' ? fontSize * 3.6 : 0,
            right: kind === 'editor' ? undefined : 0,
            textAlign: 'center',
            fontSize: fontSize * 0.7,
            color: kind === 'editor' ? pal.code.text : pal.code.dim,
            ...(kind === 'editor'
              ? {top: fontSize * 0.35, bottom: 0, padding: `${fontSize * 0.3}px ${fontSize * 0.7}px 0`, background: pal.code.bg, borderRadius: `${fontSize * 0.3}px ${fontSize * 0.3}px 0 0`}
              : {}),
          }}
        >
          {title}
        </div>
      </div>
      <div style={{padding: `${fontSize * 0.8}px ${fontSize * 0.9}px ${fontSize * 0.9}px`, fontSize, lineHeight: 1.65}}>
        {lines.map((line, i) => {
          const n = ns[i];
          const visible = n > 0 || i === cursorLine;
          const hot = highlightLines.includes(i);
          return (
            <div key={i} style={{position: 'relative', display: 'flex', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', opacity: visible ? 1 : 0}}>
              {hot && highlightP > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: -fontSize * 0.5,
                    right: -fontSize * 0.5,
                    top: 0,
                    bottom: 0,
                    background: 'rgba(29,185,84,0.20)',
                    borderLeft: `${fontSize * 0.14}px solid ${pal.green}`,
                    transformOrigin: 'left',
                    transform: `scaleX(${highlightP})`,
                  }}
                />
              ) : null}
              {kind === 'editor' ? (
                <span style={{color: pal.code.dim, width: fontSize * 1.6, flexShrink: 0, position: 'relative'}}>{i + 1}</span>
              ) : null}
              <span style={{position: 'relative', opacity: highlightP > 0 && highlightLines.length && !hot ? 1 - 0.55 * highlightP : 1}}>
                {prompt ? <span style={{color: pal.green, fontWeight: 700}}>{prompt} </span> : null}
                <Highlighted text={line.slice(0, n)} token={hot ? token : undefined} tokenP={highlightP} />
                {i === cursorLine ? (
                  <span style={{display: 'inline-block', width: '0.55em', height: '1.1em', verticalAlign: 'text-bottom', background: pal.green}} />
                ) : null}
              </span>
            </div>
          );
        })}
        {done && done.p > 0 ? (
          <div style={{color: pal.green, fontWeight: 700, opacity: done.p, transform: `translateY(${(1 - done.p) * 10}px)`}}>{done.text}</div>
        ) : null}
      </div>
    </div>
  );
};

/* ── Phone mock ───────────────────────────────────────────────────────── */
export const Phone: React.FC<{
  width: number;
  airplane?: number; // 0..1 airplane-mode progress
  dark?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({width, airplane = 0, dark = false, children, style}) => {
  const u = width / 100;
  const fg = dark ? '#FFFFFF' : pal.paper.ink;
  return (
    <div
      style={{
        width,
        height: width * 2.05,
        borderRadius: u * 13,
        padding: u * 3,
        background: '#0C0F0D',
        boxShadow: '0 50px 100px rgba(10,20,15,0.35)',
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: u * 10.5,
          background: dark ? '#0E1311' : pal.paper.card,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: DISPLAY,
          color: fg,
        }}
      >
        <div style={{height: u * 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${u * 8}px`, fontSize: u * 5, fontWeight: 700}}>
          <span>9:41</span>
          <span style={{display: 'flex', alignItems: 'center', gap: u * 2}}>
            {airplane > 0.5 ? <AirplaneIcon size={u * 6} color={pal.green} /> : null}
            <SignalBars size={u * 6} color={fg} on={airplane > 0.5 ? 0 : 4} />
          </span>
        </div>
        <div style={{position: 'absolute', top: u * 3, left: '50%', width: u * 26, height: u * 7, marginLeft: -u * 13, borderRadius: u * 4, background: '#0C0F0D'}} />
        {children}
      </div>
    </div>
  );
};

/* ── Icons (line style) ───────────────────────────────────────────────── */
type IconP = {size: number; color: string; strokeWidth?: number; style?: React.CSSProperties};
const Line: React.FC<IconP & {children: React.ReactNode; vb?: string}> = ({size, color, strokeWidth = 1.6, style, children, vb = '0 0 24 24'}) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

export const SignalBars: React.FC<{size: number; color: string; on: number; offColor?: string}> = ({size, color, on, offColor}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={2 + i * 5.5} y={18 - i * 5} width={4} height={4 + i * 5} rx={1} fill={i < on ? color : offColor ?? color} opacity={i < on ? 1 : offColor ? 1 : 0.25} />
    ))}
  </svg>
);

export const AirplaneIcon: React.FC<IconP> = ({size, color, style}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={color} />
  </svg>
);

export const TrainIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <rect x="5" y="3" width="14" height="14" rx="3" />
    <path d="M5 10h14" />
    <circle cx="9" cy="13.5" r="0.8" fill={p.color} />
    <circle cx="15" cy="13.5" r="0.8" fill={p.color} />
    <path d="M8 17l-2.5 4M16 17l2.5 4" />
  </Line>
);

export const PlaneIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </Line>
);

export const DataPhoneIcon: React.FC<IconP & {level: number}> = ({level, ...p}) => (
  <Line {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <rect x="9" y="7" width="6" height="10" rx="1" />
    <rect x="9.6" y={7.6 + 8.8 * (1 - level)} width="4.8" height={8.8 * level} rx="0.6" fill={p.color} stroke="none" />
  </Line>
);

export const DownloadIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Line>
);
export const CheckIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Line>
);
export const PlayIcon: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill={color} />
  </svg>
);
export const PauseIcon: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="6" y="5" width="4" height="14" rx="1.2" fill={color} />
    <rect x="14" y="5" width="4" height="14" rx="1.2" fill={color} />
  </svg>
);

/** A horizontal waveform path; `life` 0 = flat line, 1 = full motion. */
export const wave = (w: number, amp: number, phase: number, life: number, points = 160) => {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = i / points;
    const env = Math.sin(Math.PI * x) ** 1.2;
    const y = (Math.sin(x * 14 + phase) * 0.6 + Math.sin(x * 37 - phase * 1.6) * 0.3 + Math.sin(x * 71 + phase * 0.7) * 0.1) * amp * env * life;
    d += `${i ? 'L' : 'M'}${(x * w).toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
};
