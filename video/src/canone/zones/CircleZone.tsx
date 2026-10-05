/**
 * The Circle Zone, redrawn on a canvas from the app's own code
 * (app/…/ui/circlezone/CircleWheel.kt, WheelLayout.kt, NoteSpeller.kt, CircleHud.kt).
 * Seven concentric heptagons, one per octave; each note sits on a corner: direction = its letter
 * (the key's tonic at the top), heptagon = its octave. The chord is a triangle of thirds, the three
 * voices travel from corner to corner, and the melody comes back 2, 4 and 6 bars later rotated by
 * 3/7, 6/7 and 2/7 of a turn, like the voices of a canon. Note names in English for the video.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import type {Song} from './data';

const TWO_PI = Math.PI * 2;
const WHEEL_RADIUS = 0.4;
const LABEL_RADIUS = 1.13;
const TRAIL_SEC = 2.6;
const MAX_SEGMENTS = 10;
const GLIDE_SEC = 0.14;
const MAX_REST_BRIDGE_SEC = 1.5;
const BOW = 0.55;
const RING_COUNT = 7;
const FIRST_OCTAVE = 1;
const CHORD_ALPHAS = [0.85, 0.3, 0.14, 0.06, 0];

export const CZ = {
  bg: '#090A12',
  centerGlow: 'rgba(30,33,80,0.2)',
  grid: '#2B2D4A',
  text: '#EEEBF7',
  text2: '#8E8BA8',
  gold: '#F2C46B',
  chords: '#C9C3FF',
  melody: '#FF8A5C',
  middle: '#3FD0D9',
  bass: '#5B7CFF',
  echoes: [
    {color: '#F6C453', rotation: 3, bars: 2},
    {color: '#A6D85B', rotation: 6, bars: 4},
    {color: '#EE6FA8', rotation: 2, bars: 6},
  ],
};

/* ── NoteSpeller (English letters) ── */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_FLAT_GAPS = new Set([1, 4, 5]);
const MAJOR_TONICS: [number, number][] = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const MINOR_TONICS: [number, number][] = [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [6, -1], [6, 0]];
const TRIADS = [[0, 4, 7], [0, 3, 7], [0, 3, 6]];
const mod = (a: number, n: number) => ((a % n) + n) % n;
// Unlike the app, double accidentals are written as their natural note (E♭♭ → D): on a 1-second
// glimpse in a video they read like a typo. Positions on the wheel do not change.
const spell = (letter: number, acc: number): string => {
  if (Math.abs(acc) === 2) {
    const next = (letter + 7 + Math.sign(acc)) % 7;
    return spell(next, mod(NATURAL[letter] + acc - NATURAL[next] + 6, 12) - 6);
  }
  return LETTERS[letter] + (({[-1]: '♭', 1: '♯'} as Record<number, string>)[acc] ?? '');
};

export class Speller {
  letters: number[] = [];
  accidentals: number[] = [];
  vertices: number[] = [];
  names: string[] = [];
  scale: number[];
  constructor(public key: {tonic: number; minor: boolean}) {
    this.scale = (key.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((s) => (key.tonic + s) % 12);
    const [tonicLetter] = (key.minor ? MINOR_TONICS : MAJOR_TONICS)[key.tonic];
    for (let d = 0; d < 7; d++) {
      const letter = (tonicLetter + d) % 7;
      this.letters[d] = letter;
      this.accidentals[d] = mod(this.scale[d] - NATURAL[letter] + 6, 12) - 6;
    }
    const degreeOf = (pc: number) => this.scale.indexOf(mod(pc, 12));
    for (let pc = 0; pc < 12; pc++) {
      const d = degreeOf(pc);
      if (d >= 0) {
        this.vertices[pc] = d;
        this.names[pc] = spell(this.letters[d], this.accidentals[d]);
        continue;
      }
      const below = degreeOf(pc - 1);
      const above = (below + 1) % 7;
      const raised = this.accidentals[below] + 1;
      const lowered = this.accidentals[above] - 1;
      const lower = Math.abs(lowered) < Math.abs(raised) || (Math.abs(lowered) === Math.abs(raised) && !key.minor && MAJOR_FLAT_GAPS.has(below));
      this.vertices[pc] = lower ? above : below;
      this.names[pc] = lower ? spell(this.letters[above], lowered) : spell(this.letters[below], raised);
    }
  }
  vertex = (pc: number) => this.vertices[mod(pc, 12)];
  name = (pc: number) => this.names[mod(pc, 12)];
  nameOn = (vertex: number, pc: number) => {
    const letter = this.letters[vertex];
    return spell(letter, mod(pc - NATURAL[letter] + 6, 12) - 6);
  };
  octaveOn = (vertex: number, midi: number) => {
    const letter = this.letters[vertex];
    const acc = mod((midi % 12) - NATURAL[letter] + 6, 12) - 6;
    return Math.floor((midi - acc) / 12) - 1;
  };
  scaleName = (vertex: number) => spell(this.letters[vertex], this.accidentals[vertex]);
  chordVertices = (root: number) => {
    const r = this.vertex(root);
    return [r, (r + 2) % 7, (r + 4) % 7];
  };
  get keyName() {
    return `${this.name(this.key.tonic)} ${this.key.minor ? 'minor' : 'major'}`;
  }
  chordName = (root: number, quality: number) => this.name(root) + (quality === 1 ? 'm' : quality === 2 ? '°' : '');
}

/* ── WheelLayout: where everything sits, computed once per song ── */
export const makeLayout = (song: Song) => {
  const speller = new Speller(song.key);
  const chordTones = (i: number) => TRIADS[song.chords[i].quality].map((s) => (song.chords[i].root + s) % 12);
  const chordVertices = song.chords.map((c) => (c.quality < 0 ? [] : speller.chordVertices(c.root)));
  const chordToneNames = song.chords.map((c, i) => (c.quality < 0 ? [] : chordTones(i).map((pc, k) => speller.nameOn(chordVertices[i][k], pc))));
  const vertexOf = (v: number, i: number) => {
    const n = song.voices[v][i];
    if (n.midi < 0) return -1;
    const pc = n.midi % 12;
    const c = song.chordIndexAt(n.start);
    if (c >= 0 && song.chords[c].quality >= 0) {
      const tones = chordTones(c);
      const k = tones.indexOf(pc);
      if (k >= 0) return chordVertices[c][k];
    }
    return speller.vertex(pc);
  };
  const voiceVertices = song.voices.map((track, v) => track.map((_, i) => vertexOf(v, i)));
  const voiceRings = song.voices.map((track, v) =>
    track.map((n, i) => (n.midi < 0 ? 0 : Math.max(0, Math.min(RING_COUNT - 1, speller.octaveOn(voiceVertices[v][i], n.midi) - FIRST_OCTAVE)))),
  );
  const voiceNames = song.voices.map((track, v) => track.map((n, i) => (n.midi < 0 ? '' : speller.nameOn(voiceVertices[v][i], n.midi % 12))));
  return {speller, chordVertices, chordToneNames, voiceVertices, voiceRings, voiceNames};
};
type Layout = ReturnType<typeof makeLayout>;

const angleOf = (pos: number) => -Math.PI / 2 + (pos * TWO_PI) / 7;
const ringFraction = (ring: number) => 0.16 + ring * (0.84 / (RING_COUNT - 1));
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);

export type CzOptions = {labels?: boolean; dim?: number; voices?: boolean; chords?: boolean; grid?: boolean};

export const drawWheel = (ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, R: number, t: number, song: Song, L: Layout, opt: CzOptions = {}) => {
  const dp = Math.min(w, h) / 393;
  const pt = (vertex: number, height = 1) => {
    const a = angleOf(vertex);
    return [cx + Math.cos(a) * R * height, cy + Math.sin(a) * R * height] as const;
  };
  const corner = (vertex: number, ring: number) => pt(vertex, ringFraction(ring));
  const control = (from: readonly [number, number], to: readonly [number, number]) =>
    [cx + ((from[0] + to[0]) / 2 - cx) * BOW, cy + ((from[1] + to[1]) / 2 - cy) * BOW] as const;

  // Grid
  if (opt.grid !== false) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    g.addColorStop(0, CZ.centerGlow);
    g.addColorStop(1, 'rgba(30,33,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 1.25, cy - R * 1.25, R * 2.5, R * 2.5);
    ctx.strokeStyle = CZ.grid;
    ctx.lineWidth = 1 * dp;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TWO_PI);
    ctx.stroke();
    for (let ring = 0; ring < RING_COUNT; ring++) {
      ctx.globalAlpha = ring === RING_COUNT - 1 ? 0.8 : 0.45;
      ctx.lineWidth = 0.8 * dp;
      ctx.beginPath();
      for (let v = 0; v <= 7; v++) {
        const [x, y] = corner(v % 7, ring);
        if (v === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    for (let v = 0; v < 7; v++) {
      const [x0, y0] = corner(v, 0);
      const [x1, y1] = corner(v, RING_COUNT - 1);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = CZ.grid;
    for (let v = 0; v < 7; v++) {
      for (let ring = 0; ring < RING_COUNT; ring++) {
        const [x, y] = corner(v, ring);
        ctx.beginPath();
        ctx.arc(x, y, (ring === RING_COUNT - 1 ? 2 : 1.4) * dp, 0, TWO_PI);
        ctx.fill();
      }
    }
  }

  const dim = opt.dim ?? 1;
  // Chords: the current one (fades in over 0.35 s) and the three before, fainter
  const ci = song.chordIndexAt(t);
  if (opt.chords !== false && ci >= 0) {
    const fadeIn = Math.max(0, Math.min(1, (t - song.chords[ci].start) / 0.35));
    for (let back = 0; back <= 3; back++) {
      const index = ci - back;
      if (index < 0) break;
      const vs = L.chordVertices[index];
      if (!vs.length) continue;
      const alpha = (back === 0 ? CHORD_ALPHAS[0] * fadeIn : CHORD_ALPHAS[back - 1] + (CHORD_ALPHAS[back] - CHORD_ALPHAS[back - 1]) * fadeIn) * dim;
      if (alpha <= 0.005) continue;
      ctx.strokeStyle = `rgba(201,195,255,${alpha})`;
      ctx.lineWidth = 1.3 * dp;
      ctx.beginPath();
      vs.forEach((v, i) => {
        const [x, y] = pt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      if (back === 0) {
        ctx.fillStyle = `rgba(255,255,255,${fadeIn * dim})`;
        for (const v of vs) {
          const [x, y] = pt(v);
          ctx.beginPath();
          ctx.arc(x, y, 3.5 * dp, 0, TWO_PI);
          ctx.fill();
        }
      }
    }
  }

  // Voices
  const drawVoice = (v: number, tt: number, rotation: number, color: string, strength: number, width: number) => {
    const track = song.voices[v];
    const vertices = L.voiceVertices[v];
    const rings = L.voiceRings[v];
    const current = song.voiceIndexAt(v, tt);
    if (current < 0 || strength <= 0) return;
    let last = current;
    while (last >= 0 && vertices[last] < 0) last--;
    if (last < 0) return;
    const prevSounding = (i: number) => {
      let p = i - 1;
      while (p >= 0 && vertices[p] < 0) p--;
      return p;
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    let segments = 0;
    let i = last;
    while (i >= 1 && segments < MAX_SEGMENTS) {
      const age = tt - track[i].start;
      if (age > TRAIL_SEC) break;
      const prev = prevSounding(i);
      if (prev < 0) break;
      const rest = track[i].start - track[prev + 1].start;
      if (rest > MAX_REST_BRIDGE_SEC) break;
      if (vertices[prev] !== vertices[i] || rings[prev] !== rings[i]) {
        const fade = 1 - age / TRAIL_SEC;
        const alpha = strength * fade * fade;
        const progress = i === last ? easeOut(Math.max(0, Math.min(1, age / GLIDE_SEC))) : 1;
        const from = corner(vertices[prev] + rotation, rings[prev]);
        const to = corner(vertices[i] + rotation, rings[i]);
        const c = control(from, to);
        const q0 = [from[0] + (c[0] - from[0]) * progress, from[1] + (c[1] - from[1]) * progress];
        const q1 = [c[0] + (to[0] - c[0]) * progress, c[1] + (to[1] - c[1]) * progress];
        const end = [q0[0] + (q1[0] - q0[0]) * progress, q0[1] + (q1[1] - q0[1]) * progress];
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(from[0], from[1]);
          ctx.quadraticCurveTo(q0[0], q0[1], end[0], end[1]);
        };
        if (segments < 3) {
          ctx.strokeStyle = hexA(color, alpha * 0.2);
          ctx.lineWidth = 9 * dp;
          path();
          ctx.stroke();
        }
        ctx.strokeStyle = hexA(color, alpha);
        ctx.lineWidth = width * dp;
        path();
        ctx.stroke();
        segments++;
      }
      i = prev;
    }
    const age = tt - track[last].start;
    const target = corner(vertices[last] + rotation, rings[last]);
    let head: readonly [number, number] = target;
    const prev = prevSounding(last);
    if (age < GLIDE_SEC && prev >= 0 && (vertices[prev] !== vertices[last] || rings[prev] !== rings[last])) {
      const from = corner(vertices[prev] + rotation, rings[prev]);
      const c = control(from, target);
      const p = easeOut(age / GLIDE_SEC);
      const a = [from[0] + (c[0] - from[0]) * p, from[1] + (c[1] - from[1]) * p];
      const b = [c[0] + (target[0] - c[0]) * p, c[1] + (target[1] - c[1]) * p];
      head = [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
    }
    const headAlpha = last === current ? strength : strength * Math.max(0, 1 - (tt - track[current].start) / 0.6);
    if (headAlpha > 0) {
      const attack = Math.exp(-age / 0.25);
      const gr = (11 + 10 * attack) * dp;
      const g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], gr);
      const ha = headAlpha * (0.5 + 0.5 * attack);
      g.addColorStop(0, hexA(color, ha));
      g.addColorStop(0.3, hexA(color, ha * 0.4));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(head[0] - gr, head[1] - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
      ctx.beginPath();
      ctx.arc(head[0], head[1], 2.4 * dp, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  };
  if (opt.voices !== false) {
    drawVoice(0, t, 0, CZ.bass, dim, 2.6);
    drawVoice(1, t, 0, CZ.middle, dim, 2.6);
    for (const e of CZ.echoes) {
      const src = t - e.bars * song.barSec;
      if (src <= 0) continue;
      drawVoice(2, src, e.rotation, e.color, 0.8 * Math.min(1, src / 1.5) * dim, 1.8);
    }
    drawVoice(2, t, 0, CZ.melody, dim, 2.6);
  }

  // Labels around the wheel
  if (opt.labels !== false) {
    ctx.font = `${17 * dp}px "Instrument Serif", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let vertex = 0; vertex < 7; vertex++) {
      const scaleName = L.speller.scaleName(vertex);
      let name = scaleName;
      let color = 'rgba(142,139,168,0.75)';
      for (let v = 0; v < song.voices.length; v++) {
        const idx = song.voiceIndexAt(v, t);
        if (idx >= 0 && L.voiceVertices[v][idx] === vertex) {
          name = L.voiceNames[v][idx];
          color = 'rgba(238,235,247,0.7)';
        }
      }
      if (ci >= 0) {
        L.chordVertices[ci].forEach((vv, k) => {
          if (vv === vertex) {
            name = L.chordToneNames[ci][k];
            color = CZ.text;
          }
        });
      }
      if (name !== scaleName) color = CZ.gold;
      const [x, y] = pt(vertex, LABEL_RADIUS);
      ctx.fillStyle = color;
      ctx.globalAlpha = dim;
      ctx.fillText(name, x, y);
      ctx.globalAlpha = 1;
    }
  }
  return {chordIndex: ci};
};

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
};

export const useWheelLayout = (song: Song) => useMemo(() => makeLayout(song), [song]);

/** Full Circle Zone panel: background, wheel, and a small HUD (key · chord · tempo). */
export const CircleZone: React.FC<{song: Song; t: number; width: number; height: number; opt?: CzOptions; hud?: boolean; radius?: number; cx?: number}> = ({
  song,
  t,
  width,
  height,
  opt,
  hud = true,
  radius,
  cx = 0.5,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = useWheelLayout(song);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = CZ.bg;
    ctx.fillRect(0, 0, width, height);
    const R = radius ?? Math.min(width, height) * WHEEL_RADIUS;
    const {chordIndex} = drawWheel(ctx, width, height, width * cx, height / 2, R, t, song, L, opt);
    if (hud) {
      const dp = Math.min(width, height) / 393;
      const c = chordIndex >= 0 ? song.chords[chordIndex] : null;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = CZ.text;
      ctx.font = `${20 * dp}px "Instrument Serif", serif`;
      ctx.fillText(L.speller.keyName, 18 * dp, 16 * dp);
      ctx.fillStyle = CZ.text2;
      ctx.font = `500 ${10.5 * dp}px Inter, sans-serif`;
      ctx.fillText(`${Math.round(song.bpm)} BPM${c && c.quality >= 0 ? '  ·  ' + L.speller.chordName(c.root, c.quality) : ''}`, 18 * dp, 42 * dp);
    }
  });
  return <canvas ref={ref} width={width} height={height} style={{width, height, display: 'block'}} />;
};
