import React, {createContext, useContext} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import type {Audience} from './content';
import {C, EXPO_OUT, MONO, SANS, SERIF_ITALIC, clamp} from './theme';
import {beatToFrame, timelines} from './timeline';

/* ── Timeline context: every scene knows its audience and its absolute start frame ── */
type Ctx = {audience: Audience; sceneStart: number};
const TimelineCtx = createContext<Ctx>({audience: 'public', sceneStart: 0});
export const TimelineProvider: React.FC<{audience: Audience; sceneStart: number; children: React.ReactNode}> = ({audience, sceneStart, children}) => (
  <TimelineCtx.Provider value={{audience, sceneStart}}>{children}</TimelineCtx.Provider>
);

/** Absolute frame (whole video) and `since(beat)` = frames elapsed since an absolute beat. */
export const useBeat = () => {
  const {audience, sceneStart} = useContext(TimelineCtx);
  const frame = useCurrentFrame() + sceneStart;
  return {
    frame,
    audience,
    tl: timelines[audience],
    since: (beat: number) => frame - beatToFrame(beat),
    /** 0→1 over `dur` frames from `beat` (expo out by default). */
    p: (beat: number, dur = 14, easing = EXPO_OUT) => interpolate(frame - beatToFrame(beat), [0, dur], [0, 1], {...clamp, easing}),
  };
};

/* ── Kinetic words: each word rises out of its own mask ─────────────────── */
export const Words: React.FC<{
  text: string;
  t: number; // frames since the first word should start
  stagger?: number;
  duration?: number;
  color?: string;
  style?: React.CSSProperties;
  wordStyle?: (i: number, word: string) => React.CSSProperties;
}> = ({text, t, stagger = 3, duration = 14, color, style, wordStyle}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'inherit', columnGap: '0.25em', ...style}}>
    {text.split(' ').map((w, i) => {
      const p = interpolate(t - i * stagger, [0, duration], [0, 1], {...clamp, easing: EXPO_OUT});
      return (
        <span key={i} style={{display: 'inline-block', overflow: p < 1 ? 'hidden' : 'visible', paddingBottom: '0.1em', marginBottom: '-0.1em'}}>
          <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, color, ...wordStyle?.(i, w)}}>{w}</span>
        </span>
      );
    })}
  </div>
);

/** A word matches a highlight ignoring punctuation. */
export const sameWord = (w: string, h: string) => w.replace(/[.,?!’']/g, '') === h.replace(/[.,?!’']/g, '');

/* ── Step caption: numbered dot + words ──────────────────────────────────── */
export const StepCaption: React.FC<{step?: string; text: string; t: number; size: number; color?: string; align?: 'left' | 'center'}> = ({
  step,
  text,
  t,
  size,
  color = C.white,
  align = 'left',
}) => {
  const p = interpolate(t, [0, 12], [0, 1], {...clamp, easing: EXPO_OUT});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: size * 0.5, justifyContent: align === 'center' ? 'center' : 'flex-start', fontFamily: SANS}}>
      {step ? (
        <div
          style={{
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: '50%',
            background: C.purple,
            color: C.black,
            fontWeight: 800,
            fontSize: size * 0.7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: `scale(${p})`,
            boxShadow: `0 0 ${size}px ${C.purple}88`,
          }}
        >
          {step}
        </div>
      ) : null}
      <Words text={text} t={t - 2} stagger={2} color={color} style={{fontSize: size, fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.12, justifyContent: align === 'center' ? 'center' : 'flex-start'}} />
    </div>
  );
};

/* ── Code window (editor or terminal) with typing and line highlight ─────── */
const KW = /^(val|var|fun|private|const|suspend|class|object|return|if|else|apply)$/;
const tokenColor = (tok: string, kind: 'str' | 'num' | 'call' | 'word' | 'other') => {
  if (kind === 'str') return C.code.str;
  if (kind === 'num') return C.code.num;
  if (KW.test(tok)) return C.code.kw;
  if (kind === 'call') return C.code.fn;
  if (/^[A-Z]/.test(tok) && kind === 'word') return '#E9D5FF';
  return C.code.text;
};
export const Highlighted: React.FC<{text: string; plain?: boolean}> = ({text, plain}) => {
  if (plain) return <span style={{color: C.code.text}}>{text}</span>;
  const parts: React.ReactNode[] = [];
  const re = /("[^"]*"?|'[^']*'?)|(\b\d[\d.]*f?\b)|(\w+(?=\())|(\w+)|(\s+)|([^\w\s"']+)/g;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    const kind = m[1] ? 'str' : m[2] ? 'num' : m[3] ? 'call' : m[4] ? 'word' : 'other';
    parts.push(
      <span key={k++} style={{color: tokenColor(m[0], kind), fontWeight: kind === 'call' ? 700 : undefined}}>
        {m[0]}
      </span>,
    );
  }
  return <>{parts}</>;
};

export const CodeWindow: React.FC<{
  kind: 'terminal' | 'editor';
  title: string;
  lines: readonly string[];
  typed: number; // characters typed, counted across lines
  fontSize: number;
  width: number | string;
  prompt?: string;
  firstLine?: number;
  lineNumbers?: readonly (number | null)[];
  output?: readonly {text: string; p: number; color?: string}[];
  highlight?: readonly {line: number; p: number}[];
  cursor?: boolean;
  /** Soft-wrap long lines (like an editor), instead of one row per line. */
  wrap?: boolean;
  style?: React.CSSProperties;
}> = ({kind, title, lines, typed, fontSize, width, prompt, firstLine = 1, lineNumbers, output = [], highlight = [], cursor = true, wrap, style}) => {
  let left = typed;
  const ns = lines.map((l) => {
    const n = Math.max(0, Math.min(l.length, left));
    left -= l.length;
    return n;
  });
  const total = lines.reduce((a, l) => a + l.length, 0);
  const cursorLine = typed < total ? ns.findIndex((n, i) => n < lines[i].length) : cursor ? lines.length - 1 : -1;
  const anyHot = highlight.some((h) => h.p > 0);
  return (
    <div
      style={{
        width,
        borderRadius: fontSize * 0.6,
        background: C.code.bg,
        boxShadow: `0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(196,165,255,0.12), 0 0 80px ${C.purple}1c`,
        overflow: 'hidden',
        fontFamily: MONO,
        ...style,
      }}
    >
      <div style={{height: fontSize * 1.9, display: 'flex', alignItems: 'center', gap: fontSize * 0.34, padding: `0 ${fontSize * 0.75}px`, background: C.code.bar, position: 'relative'}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <div key={c} style={{width: fontSize * 0.44, height: fontSize * 0.44, borderRadius: '50%', background: c, opacity: 0.9}} />
        ))}
        <div
          style={{
            position: 'absolute',
            left: kind === 'editor' ? fontSize * 3.8 : 0,
            right: kind === 'editor' ? undefined : 0,
            textAlign: 'center',
            fontSize: fontSize * 0.72,
            color: kind === 'editor' ? C.code.text : C.code.dim,
            ...(kind === 'editor'
              ? {top: fontSize * 0.38, bottom: 0, padding: `${fontSize * 0.32}px ${fontSize * 0.8}px 0`, background: C.code.bg, borderRadius: `${fontSize * 0.3}px ${fontSize * 0.3}px 0 0`}
              : {}),
          }}
        >
          {title}
        </div>
      </div>
      <div style={{padding: `${fontSize * 0.85}px ${fontSize * 1}px ${fontSize * 0.95}px`, fontSize, lineHeight: 1.7}}>
        {lines.map((line, i) => {
          const n = ns[i];
          const visible = n > 0 || i === cursorLine;
          const hp = highlight.find((h) => h.line === i)?.p ?? 0;
          const num = lineNumbers ? lineNumbers[i] : firstLine + i;
          return (
            <div key={i} style={{position: 'relative', display: 'flex', whiteSpace: wrap ? 'pre-wrap' : 'pre', opacity: visible ? 1 : 0, marginBottom: wrap ? fontSize * 0.35 : 0}}>
              {hp > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: -fontSize * 1,
                    right: -fontSize * 1,
                    top: 0,
                    bottom: 0,
                    background: `${C.purple}2e`,
                    borderLeft: `${fontSize * 0.16}px solid ${C.purple}`,
                    transformOrigin: 'left',
                    transform: `scaleX(${hp})`,
                  }}
                />
              ) : null}
              {kind === 'editor' ? (
                <span style={{color: C.code.dim, width: fontSize * 2.6, flexShrink: 0, position: 'relative', textAlign: 'right', paddingRight: fontSize * 0.9}}>{num ?? ''}</span>
              ) : null}
              <span style={{position: 'relative', opacity: anyHot && hp === 0 ? 0.45 : 1, flex: wrap ? 1 : undefined, minWidth: 0, overflowWrap: wrap ? 'anywhere' : undefined}}>
                {prompt ? <span style={{color: C.purple, fontWeight: 700}}>{prompt} </span> : null}
                <Highlighted text={line.slice(0, n)} plain={kind === 'terminal'} />
                {i === cursorLine ? <span style={{display: 'inline-block', width: '0.55em', height: '1.1em', verticalAlign: 'text-bottom', background: C.purple}} /> : null}
              </span>
            </div>
          );
        })}
        {output.map((o, i) =>
          o.p > 0 ? (
            <div key={i} style={{color: o.color ?? C.code.dim, opacity: o.p, transform: `translateY(${(1 - o.p) * 8}px)`, whiteSpace: 'pre'}}>
              {o.text}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
};

/* ── Chip ────────────────────────────────────────────────────────────────── */
export const Chip: React.FC<{children: React.ReactNode; size: number; p?: number; color?: string; solid?: boolean; style?: React.CSSProperties}> = ({
  children,
  size,
  p = 1,
  color = C.purple,
  solid,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.4,
      padding: `${size * 0.35}px ${size * 0.8}px`,
      borderRadius: size * 2,
      background: solid ? color : `${color}22`,
      border: `${Math.max(1, size * 0.06)}px solid ${color}${solid ? '' : '66'}`,
      color: solid ? C.black : C.white,
      fontFamily: SANS,
      fontWeight: 650,
      fontSize: size,
      whiteSpace: 'nowrap',
      opacity: p,
      transform: `translateY(${(1 - p) * size * 0.6}px) scale(${0.9 + 0.1 * p})`,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ── Logo: the app's icon (treble clef in a thin purple ring, on a dark radial glow) ── */
// Treble clef: "music-clef-treble" from Material Design Icons (Apache 2.0), as in ic_launcher_foreground.xml
const CLEF =
  'M13 11V7.5L15.2 5.29C16 4.5 16.15 3.24 15.59 2.26C15.14 1.47 14.32 1 13.45 1C13.24 1 13 1.03 12.81 1.09C11.73 1.38 11 2.38 11 3.5V6.74L7.86 9.91C6.2 11.6 5.7 14.13 6.61 16.34C7.38 18.24 9.06 19.55 11 19.89V20.5C11 20.76 10.77 21 10.5 21H9V23H10.5C11.85 23 13 21.89 13 20.5V20C15.03 20 17.16 18.08 17.16 15.25C17.16 12.95 15.24 11 13 11M13 3.5C13 3.27 13.11 3.09 13.32 3.03C13.54 2.97 13.77 3.06 13.88 3.26C14 3.46 13.96 3.71 13.8 3.87L13 4.73V3.5M11 11.5C10.03 12.14 9.3 13.24 9.04 14.26L11 14.78V17.83C9.87 17.53 8.9 16.71 8.43 15.57C7.84 14.11 8.16 12.45 9.26 11.33L11 9.5V11.5M13 18V12.94C14.17 12.94 15.18 14.04 15.18 15.25C15.18 17 13.91 18 13 18Z';

export const Logo: React.FC<{size: number; p?: number; ring?: number; style?: React.CSSProperties}> = ({size, p = 1, ring = 1, style}) => (
  <svg width={size} height={size} viewBox="0 0 108 108" style={{overflow: 'visible', ...style}}>
    <defs>
      <radialGradient id="cn-bg" cx="54" cy="50" r="70" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3A1468" />
        <stop offset="0.55" stopColor="#190A2E" />
        <stop offset="1" stopColor="#0B0A10" />
      </radialGradient>
      <linearGradient id="cn-clef" x1="11.6" y1="1" x2="11.6" y2="23" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#F3E8FF" />
        <stop offset="1" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="108" height="108" rx="26" fill="url(#cn-bg)" opacity={p} />
    <circle cx="54" cy="54" r="31" fill="none" stroke="#A855F7" strokeOpacity={0.5 * p} strokeWidth="1.5" strokeDasharray={`${195 * ring} 195`} transform="rotate(-90 54 54)" />
    <g transform="translate(27.37 26.4) scale(2.3)" opacity={p}>
      <path d={CLEF} fill="url(#cn-clef)" />
    </g>
  </svg>
);

export const Wordmark: React.FC<{size: number; color?: string; style?: React.CSSProperties}> = ({size, color = C.white, style}) => (
  <div style={{fontFamily: SERIF_ITALIC, fontSize: size, color, letterSpacing: '-0.01em', lineHeight: 1, ...style}}>Canone</div>
);

/* ── Abstract cover art (placeholder, generated: no real artwork) ────────── */
export const Cover: React.FC<{seed: number; size: number; radius?: number; style?: React.CSSProperties}> = ({seed, size, radius = 0.12, style}) => {
  const hues = [
    ['#A855F7', '#E879F9', '#3B1E66'],
    ['#7C3AED', '#60A5FA', '#1E1B4B'],
    ['#E879F9', '#F2C46B', '#4A1653'],
    ['#C4A5FF', '#A855F7', '#2E1F47'],
    ['#F472B6', '#A855F7', '#1F1036'],
  ][seed % 5];
  const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * radius,
        flexShrink: 0,
        background: `radial-gradient(circle at ${20 + r(1) * 60}% ${20 + r(2) * 60}%, ${hues[0]} 0%, transparent 60%), radial-gradient(circle at ${20 + r(3) * 60}% ${30 + r(4) * 50}%, ${hues[1]} 0%, transparent 55%), ${hues[2]}`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        ...style,
      }}
    />
  );
};

/* ── Phone frame (dark) ──────────────────────────────────────────────────── */
export const Phone: React.FC<{width: number; children: React.ReactNode; style?: React.CSSProperties; screen?: string; statusIcons?: React.ReactNode}> = ({
  width,
  children,
  style,
  screen = C.black,
  statusIcons,
}) => {
  const u = width / 100;
  return (
    <div
      style={{
        width,
        height: width * 2.08,
        borderRadius: u * 13,
        padding: u * 2.6,
        background: 'linear-gradient(160deg, #2A2536, #0E0C14 40%, #1B1724)',
        boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,165,255,0.18), 0 0 120px ${C.purple}22`,
        flexShrink: 0,
        position: 'relative',
        ...style,
      }}
    >
      <div style={{width: '100%', height: '100%', borderRadius: u * 10.6, background: screen, overflow: 'hidden', position: 'relative', fontFamily: SANS, color: C.white}}>
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: u * 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${u * 8}px`, fontSize: u * 4.6, fontWeight: 700, zIndex: 5}}>
          <span>9:41</span>
          <span style={{display: 'flex', alignItems: 'center', gap: u * 1.6}}>{statusIcons}</span>
        </div>
        <div style={{position: 'absolute', top: u * 3.2, left: '50%', width: u * 24, height: u * 6.6, marginLeft: -u * 12, borderRadius: u * 4, background: '#000', zIndex: 6}} />
        {children}
      </div>
    </div>
  );
};

/* ── Icons ───────────────────────────────────────────────────────────────── */
type IconP = {size: number; color: string; strokeWidth?: number; style?: React.CSSProperties};
const Line: React.FC<IconP & {children: React.ReactNode}> = ({size, color, strokeWidth = 1.8, style, children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
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
export const SkipIcon: React.FC<{size: number; color: string; back?: boolean}> = ({size, color, back}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{transform: back ? 'scaleX(-1)' : undefined}}>
    <path d="M6 6.5v11a.8.8 0 0 0 1.2.7l8.3-5.5a.8.8 0 0 0 0-1.4L7.2 5.8A.8.8 0 0 0 6 6.5z" fill={color} />
    <rect x="16.5" y="6" width="2.2" height="12" rx="1" fill={color} />
  </svg>
);
export const ShuffleIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5" />
  </Line>
);
export const RepeatIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />
  </Line>
);
export const TimerIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Line>
);
export const AirplaneIcon: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={color} />
  </svg>
);
export const LockIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Line>
);
export const LibraryIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M4 4v16M8 4v16M12 5l5 15M18 8v0" />
  </Line>
);
export const PlaylistIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M3 6h12M3 12h12M3 18h7M17 17V9l4-1" />
    <circle cx="15" cy="17" r="2" />
  </Line>
);
export const CloudIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 17.5 18zM12 11v6M9.5 14.5L12 17l2.5-2.5" />
  </Line>
);
export const FileIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Line>
);
export const FolderIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Line>
);
export const MicOffIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.8M19 11a7 7 0 0 1-1.1 3.8M5 11a7 7 0 0 0 11.4 5.4M12 18v3M3 3l18 18" />
  </Line>
);
export const MicIcon: React.FC<IconP> = (p) => (
  <Line {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Line>
);

/** Small "now playing" bars, like NowPlayingBars in the app. */
export const PlayingBars: React.FC<{size: number; color: string; frame: number}> = ({size, color, frame}) => (
  <div style={{display: 'flex', alignItems: 'flex-end', gap: size * 0.12, height: size, width: size}}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{flex: 1, borderRadius: size * 0.1, background: color, height: `${30 + 70 * Math.abs(Math.sin(frame * 0.21 + i * 1.7))}%`}} />
    ))}
  </div>
);

/** A tap: expanding ring + dot, at (x, y) inside a positioned parent. */
export const Tap: React.FC<{x: number; y: number; t: number; size: number}> = ({x, y, t, size}) => {
  if (t < -6 || t > 24) return null;
  const pre = interpolate(t, [-6, 0], [0, 1], clamp);
  const ring = interpolate(t, [0, 18], [0, 1], {...clamp, easing: EXPO_OUT});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 20, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: '50%', background: `rgba(255,255,255,${0.35 * pre * (1 - ring)})`, transform: `scale(${t < 0 ? 1.3 - 0.3 * pre : 1 - 0.15 * ring})`}} />
      <div style={{position: 'absolute', left: -size, top: -size, width: size * 2, height: size * 2, borderRadius: '50%', border: `${size * 0.08}px solid rgba(232,121,249,${(1 - ring) * 0.9})`, transform: `scale(${0.3 + ring})`, opacity: t >= 0 ? 1 : 0}} />
    </div>
  );
};

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
