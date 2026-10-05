/**
 * The Music Zone, redrawn on a canvas from the app's own algorithm
 * (app/…/ui/musiczone/CanonVisualizer.kt and NebulaBackground.kt):
 *   z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s)   — exact k-fold symmetry, k = 3 4 5 6 7 8 7 6 5 4
 *   a = mids, b = highs, radius breathes with the bass, six voices race on the curve
 *   (speed = accumulated energy), rings on strong hits, colours from the cover over a nebula.
 * Pure function of the song time `t`: any frame renders on its own.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {FIGURE_SEQUENCE, type Song} from './data';

const VOICES = 6;
const VOICE_DELAY_SEC = 0.6;
const GUIDE_POINTS = 180;
const TRAIL_POINTS = 32;
const TRAIL_CHUNKS = 3;
const BASE_SPEED = 0.35;
const ENERGY_SPEED = 0.9;
const GLOBAL_SPIN = 0.04;
const RIPPLE_LIFE_SEC = 1.4;
const TWO_PI = Math.PI * 2;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
};
const mixWhite = (hex: string, f: number) => {
  const [r, g, b] = hexToRgb(hex);
  return [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f].map(Math.round);
};

/** Points of the k-lobe figure, unit radius, from s0 with step ds (CanonVisualizer.sampleFigure). */
const sampleFigure = (k: number, a: number, b: number, s0: number, ds: number, count: number, outX: Float64Array, outY: Float64Array) => {
  const f2 = 1 + k;
  const f3 = 1 - 2 * k;
  const norm = 1 / (1 + a + b);
  for (let i = 0; i < count; i++) {
    const s = s0 + ds * i;
    outX[i] = (Math.cos(s) + a * Math.cos(f2 * s) + b * Math.cos(f3 * s)) * norm;
    outY[i] = (Math.sin(s) + a * Math.sin(f2 * s) + b * Math.sin(f3 * s)) * norm;
  }
};

type Shape = {fromK: number; toK: number; morph: number; a: number; b: number};
const bufA = {x: new Float64Array(GUIDE_POINTS + 1), y: new Float64Array(GUIDE_POINTS + 1)};
const bufB = {x: new Float64Array(GUIDE_POINTS + 1), y: new Float64Array(GUIDE_POINTS + 1)};
const sampleShape = (shape: Shape, s0: number, ds: number, count: number, outX: Float64Array, outY: Float64Array) => {
  sampleFigure(shape.toK, shape.a, shape.b, s0, ds, count, outX, outY);
  if (shape.morph >= 1 || shape.fromK === shape.toK) return;
  sampleFigure(shape.fromK, shape.a, shape.b, s0, ds, count, bufB.x, bufB.y);
  for (let i = 0; i < count; i++) {
    outX[i] = bufB.x[i] + (outX[i] - bufB.x[i]) * shape.morph;
    outY[i] = bufB.y[i] + (outY[i] - bufB.y[i]) * shape.morph;
  }
};

export type MzOptions = {
  /** Seconds since the Zone appeared on screen: voices enter one after the other. */
  intro?: number;
  /** Radius as a fraction of the short side (app: 0.44). */
  radius?: number;
  /** Overrides: freeze k (no morph) or force a/b (for the developer explanation). */
  forceK?: number;
  dimGuide?: number;
};

export const drawCanon = (ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, t: number, song: Song, colors: string[], opt: MzOptions = {}) => {
  const dp = Math.min(w, h) / 393;
  const bass = song.smoothed(0, 0, t);
  const mid = song.smoothed(1, 3, t);
  const high = song.smoothed(4, 5, t);
  const total = song.smoothed(0, 5, t);
  const s = song.shapeAt(t);
  const shape: Shape = {fromK: opt.forceK ?? s.fromK, toK: opt.forceK ?? s.toK, morph: opt.forceK ? 1 : s.morph, a: 0.16 + 0.3 * mid, b: 0.03 + 0.12 * high};
  const radius = Math.min(w, h) * (opt.radius ?? 0.44) * (0.86 + 0.14 * bass);
  const spin = t * GLOBAL_SPIN;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const X = (x: number, y: number) => cx + radius * (x * cs - y * sn);
  const Y = (x: number, y: number) => cy + radius * (x * sn + y * cs);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Axes of symmetry
  const axes = (k: number, alpha: number) => {
    if (alpha <= 0.001) return;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1 * dp;
    for (let i = 0; i < k; i++) {
      const ang = spin + (TWO_PI * i) / k;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * radius * 0.15, cy + Math.sin(ang) * radius * 0.15);
      ctx.lineTo(cx + Math.cos(ang) * radius * 1.12, cy + Math.sin(ang) * radius * 1.12);
      ctx.stroke();
    }
  };
  axes(shape.toK, 0.05 * shape.morph);
  if (shape.morph < 1) axes(shape.fromK, 0.05 * (1 - shape.morph));

  // Nucleus
  const gr = radius * (0.22 + 0.22 * bass);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
  const na = 0.35 + 0.5 * bass;
  g.addColorStop(0, rgba(colors[0], na));
  g.addColorStop(0.35, rgba(colors[0], na * 0.45));
  g.addColorStop(1, rgba(colors[0], 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

  // Ripples on strong hits
  const onsets = song.onsets();
  onsets.forEach(([frame, strength], index) => {
    const age = t - frame / 30;
    if (age < 0 || age > RIPPLE_LIFE_SEC) return;
    const progress = age / RIPPLE_LIFE_SEC;
    const fade = (1 - progress) ** 2;
    ctx.strokeStyle = rgba(colors[index % colors.length], 0.5 * fade * strength);
    ctx.lineWidth = [3, 2.2, 1.5, 1][Math.min(3, Math.floor(progress * 4))] * dp;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (0.15 + progress), 0, TWO_PI);
    ctx.stroke();
  });

  // The whole figure, faint: the "score" the voices run on
  sampleShape(shape, 0, TWO_PI / GUIDE_POINTS, GUIDE_POINTS + 1, bufA.x, bufA.y);
  ctx.strokeStyle = `rgba(255,255,255,${(0.07 + 0.08 * bass) * (opt.dimGuide ?? 1)})`;
  ctx.lineWidth = 1.2 * dp;
  ctx.beginPath();
  for (let i = 0; i <= GUIDE_POINTS; i++) {
    const x = X(bufA.x[i], bufA.y[i]);
    const y = Y(bufA.x[i], bufA.y[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Voices: equidistant, same direction, speed from the accumulated energy
  const phase = BASE_SPEED * t + ENERGY_SPEED * song.accumulatedEnergyAt(t);
  const trail = 0.7 + 0.9 * total;
  const tx = new Float64Array(TRAIL_POINTS + 1);
  const ty = new Float64Array(TRAIL_POINTS + 1);
  for (let v = 0; v < VOICES; v++) {
    const entry = Math.max(0, Math.min(1, ((opt.intro ?? 99) - v * 0.35) / 0.8));
    if (entry <= 0) continue;
    const head = phase + (TWO_PI * v) / VOICES;
    const band = v % 6;
    const echo = song.smoothed(band, band, t - v * VOICE_DELAY_SEC);
    const color = colors[v % colors.length];
    sampleShape(shape, head - trail, trail / TRAIL_POINTS, TRAIL_POINTS + 1, tx, ty);
    for (let c = 0; c < TRAIL_CHUNKS; c++) {
      const from = (TRAIL_POINTS * c) / TRAIL_CHUNKS;
      const to = (TRAIL_POINTS * (c + 1)) / TRAIL_CHUNKS;
      const strength = (c + 1) / TRAIL_CHUNKS;
      ctx.strokeStyle = rgba(color, entry * (0.15 + 0.8 * strength * strength));
      ctx.lineWidth = [1.6, 2.6, 3.6][c] * dp;
      ctx.beginPath();
      for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
        const x = X(tx[i], ty[i]);
        const y = Y(tx[i], ty[i]);
        if (i === Math.floor(from)) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const hx = X(tx[TRAIL_POINTS], ty[TRAIL_POINTS]);
    const hy = Y(tx[TRAIL_POINTS], ty[TRAIL_POINTS]);
    ctx.fillStyle = rgba(color, entry * (0.12 + 0.3 * echo));
    ctx.beginPath();
    ctx.arc(hx, hy, (7 + 16 * echo) * dp, 0, TWO_PI);
    ctx.fill();
    const [r, gg, b] = mixWhite(color, 0.55);
    ctx.fillStyle = `rgba(${r},${gg},${b},${entry})`;
    ctx.beginPath();
    ctx.arc(hx, hy, (2.5 + 3 * echo) * dp, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
  return {shape, bass, mid, high, total, radius};
};

/* ── Nebula: generated once per song from the cover colours (NebulaBackground.kt) ── */
const hash = (x: number, y: number, seed: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const valueNoise = (x: number, y: number, seed: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, seed: number) => {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < 5; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 13);
    amp *= 0.5;
    f *= 2.03;
  }
  return sum;
};

export const makeNebula = (colors: string[], aspect: number, seed: number) => {
  const W = 320;
  const H = Math.round(W / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const field = new Float64Array(W * H);
  const hue = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x / W) * 3.2 * aspect;
      const ny = (y / H) * 3.2;
      const warp = fbm(nx + 7, ny + 3, seed + 5);
      field[y * W + x] = fbm(nx + warp * 1.6, ny + warp * 1.2, seed);
      hue[y * W + x] = fbm(nx * 0.6 + 11, ny * 0.6, seed + 9);
    }
  }
  // Thresholds at percentiles, as in the app: the nebula covers about 40% of the sky
  const sorted = Float64Array.from(field).sort();
  const lo = sorted[Math.floor(sorted.length * 0.55)];
  const hi = sorted[Math.floor(sorted.length * 0.985)];
  const pal = colors.slice(0, 3).map(hexToRgb);
  for (let i = 0; i < W * H; i++) {
    const a = Math.max(0, Math.min(1, (field[i] - lo) / (hi - lo))) ** 1.4;
    const hh = Math.max(0, Math.min(1, (hue[i] - 0.3) / 0.4)) * 2;
    const k = Math.min(1, Math.floor(hh));
    const f = hh - k;
    const c0 = pal[k];
    const c1 = pal[Math.min(2, k + 1)];
    img.data[i * 4] = c0[0] + (c1[0] - c0[0]) * f;
    img.data[i * 4 + 1] = c0[1] + (c1[1] - c0[1]) * f;
    img.data[i * 4 + 2] = c0[2] + (c1[2] - c0[2]) * f;
    img.data[i * 4 + 3] = a * 150;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
};

const stars = Array.from({length: 160}, (_, i) => ({x: hash(i, 1, 3), y: hash(i, 2, 3), r: 0.4 + hash(i, 3, 3) * 1.2, tw: hash(i, 4, 3) * 6.28}));

/** Full Music Zone: black, nebula, stars and the Canone figure. */
export const MusicZone: React.FC<{song: Song; t: number; width: number; height: number; colors: string[]; opt?: MzOptions; nebula?: number; cx?: number}> = ({
  song,
  t,
  width,
  height,
  colors,
  opt,
  nebula = 1,
  cx = 0.5,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const neb = useMemo(() => (typeof document === 'undefined' ? null : makeNebula(colors, width / height, song.id === 'fast' ? 7 : 21)), [colors, width, height, song.id]);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05040A';
    ctx.fillRect(0, 0, width, height);
    if (neb && nebula > 0) {
      ctx.save();
      ctx.globalAlpha = nebula * (0.85 + 0.15 * song.smoothed(0, 1, t));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const drift = t * 0.6;
      ctx.drawImage(neb, -width * 0.03 + Math.sin(drift * 0.05) * width * 0.01, -height * 0.03, width * 1.06, height * 1.06);
      ctx.restore();
    }
    const dp = Math.min(width, height) / 393;
    for (const s of stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 1.3 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${a * nebula})`;
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.r * dp * 0.8, 0, TWO_PI);
      ctx.fill();
    }
    drawCanon(ctx, width, height, width * cx, height / 2, t, song, colors, opt);
  });
  return <canvas ref={ref} width={width} height={height} style={{width, height, display: 'block'}} />;
};

export {FIGURE_SEQUENCE};
