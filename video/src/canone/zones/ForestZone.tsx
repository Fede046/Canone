/**
 * The Firewatch Zone for the videos. The landscape is ORIGINAL vector art drawn here (layered
 * mountains, pines, a lookout tower): the app's reference picture belongs to someone else and is
 * not used. Sky colours (app/…/ui/firewatch/FirewatchSky.kt) and the flocks
 * (app/…/ui/firewatch/FirewatchWorld.kt: 3 to 11 flocks with the energy, read 2 s ahead) follow the app.
 * Deterministic: the flocks are simulated from the scene start with a seeded random generator.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {CALM, ENERGETIC, MIDDLE, type Song} from './data';

type Rgb = readonly [number, number, number];
type Palette = {top: Rgb; horizon: Rgb; amount: number; shadows: Rgb; lights: Rgb; body: Rgb; bird: Rgb; night: number};
// FirewatchSky.kt palettes
export const SKIES: Record<string, Palette> = {
  night: {top: [6, 10, 24], horizon: [22, 36, 70], amount: 0.9, shadows: [4, 7, 16], lights: [62, 84, 132], body: [238, 236, 222], bird: [132, 148, 186], night: 1},
  dusk: {top: [26, 26, 62], horizon: [150, 92, 122], amount: 0.82, shadows: [12, 10, 30], lights: [130, 104, 168], body: [255, 176, 96], bird: [40, 26, 52], night: 0.6},
  sunset: {top: [64, 72, 140], horizon: [247, 152, 92], amount: 0.7, shadows: [30, 14, 40], lights: [250, 172, 120], body: [255, 176, 96], bird: [42, 22, 40], night: 0.15},
  dawn: {top: [72, 92, 162], horizon: [250, 190, 162], amount: 0.65, shadows: [30, 18, 48], lights: [250, 184, 172], body: [255, 186, 120], bird: [42, 26, 52], night: 0.1},
  golden: {top: [150, 182, 232], horizon: [250, 226, 192], amount: 0.35, shadows: [30, 22, 52], lights: [255, 228, 192], body: [255, 236, 200], bird: [23, 37, 68], night: 0},
};
// The video's purple version of the night: same structure, pushed toward violet
SKIES.violet = {top: [12, 6, 30], horizon: [70, 34, 110], amount: 0.9, shadows: [6, 4, 14], lights: [110, 80, 170], body: [240, 232, 255], bird: [190, 170, 235], night: 0.9};

const mix = (a: Rgb, b: Rgb, f: number): Rgb => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const css = (c: Rgb, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const mixPal = (a: Palette, b: Palette, f: number): Palette => ({
  top: mix(a.top, b.top, f),
  horizon: mix(a.horizon, b.horizon, f),
  amount: a.amount + (b.amount - a.amount) * f,
  shadows: mix(a.shadows, b.shadows, f),
  lights: mix(a.lights, b.lights, f),
  body: mix(a.body, b.body, f),
  bird: mix(a.bird, b.bird, f),
  night: a.night + (b.night - a.night) * f,
});

const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ── Flocks (FirewatchWorld.kt) ── */
type Bird = {dx: number; dy: number; phase: number; rate: number; span: number};
type Flock = {x: number; y: number; dir: number; speed: number; birds: Bird[]; age: number; leaving: boolean};
type Mood = 'base' | 'calm' | 'middle' | 'energetic';
const target = (mood: Mood, energy: number) =>
  mood === 'base' ? 3 : mood === 'calm' ? 4 : mood === 'middle' ? 6 : 8 + Math.round(3 * Math.max(0, Math.min(1, (energy - 0.66) / 0.34)));

export type Placement = {width: number; height: number; horizonY: number; skyTop: number; skyBottom: number; unit: number};

export const simulateFlocks = (steps: number, moodAt: (step: number) => {mood: Mood; energy: number}, P: Placement, seed: number, birdScale = 1) => {
  const rnd = mulberry(seed);
  const flocks: Flock[] = [];
  let cooldown = 0;
  const dt = 1 / 30;
  const newFlock = (inView: boolean): Flock => {
    const dir = rnd() < 0.5 ? 1 : -1;
    const x = inView ? P.width * (0.1 + rnd() * 0.8) : dir > 0 ? -P.width * 0.25 : P.width * 1.25;
    const y = P.skyTop + rnd() * (P.skyBottom - P.skyTop);
    const count = 7 + Math.floor(rnd() * 8);
    const birds = Array.from({length: count}, () => ({
      dx: (rnd() - 0.5) * P.unit * 0.3,
      dy: (rnd() - 0.5) * P.unit * 0.1,
      phase: rnd() * 6.3,
      rate: 7 + rnd() * 4,
      span: P.unit * (0.014 + rnd() * 0.008) * birdScale,
    }));
    return {x, y, dir, speed: P.width * (0.03 + rnd() * 0.025), birds, age: 0, leaving: false};
  };
  for (let s = 0; s <= steps; s++) {
    const {mood, energy} = moodAt(s);
    const want = target(mood, energy);
    if (s === 0) for (let i = 0; i < want; i++) flocks.push(newFlock(true));
    let staying = flocks.filter((f) => !f.leaving).length;
    while (staying > want) {
      const oldest = flocks.filter((f) => !f.leaving).sort((a, b) => b.age - a.age)[0];
      if (!oldest) break;
      oldest.leaving = true;
      staying--;
    }
    cooldown -= dt;
    if (staying < want && cooldown <= 0) {
      flocks.push(newFlock(false));
      cooldown = mood === 'energetic' ? 0.8 + rnd() : 2.5 + rnd() * 3;
    }
    const pace = mood === 'energetic' ? 1.6 + energy : mood === 'middle' ? 1.3 : 1;
    for (let i = flocks.length - 1; i >= 0; i--) {
      const f = flocks[i];
      f.age += dt * pace;
      if (f.leaving) {
        f.x += f.dir * f.speed * 3 * dt;
        f.y -= P.height * 0.08 * dt;
      } else {
        f.x += f.dir * f.speed * pace * dt;
        f.y += P.height * 0.006 * Math.sin(f.age * 0.4) * dt;
      }
      if (f.x < -P.width * 0.35 || f.x > P.width * 1.35 || f.y < -P.height * 0.15) flocks.splice(i, 1);
    }
  }
  return flocks;
};

export const drawBirds = (ctx: CanvasRenderingContext2D, flocks: Flock[], P: Placement, color: string) => {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  let width = 1;
  ctx.beginPath();
  for (const f of flocks) {
    for (const b of f.birds) {
      const x = f.x + b.dx;
      const y = f.y + b.dy + Math.sin(f.age * 1.3 + b.phase) * P.unit * 0.006;
      const beat = Math.sin(f.age * b.rate * (f.leaving ? 1.5 : 1) + b.phase);
      const s = b.span;
      const lift = s * (0.15 + 0.5 * beat);
      ctx.moveTo(x - s, y - lift);
      ctx.quadraticCurveTo(x - s * 0.45, y - lift * 0.2 - s * 0.2, x, y);
      ctx.quadraticCurveTo(x + s * 0.45, y - lift * 0.2 - s * 0.2, x + s, y - lift);
      width = Math.max(width, s * 0.28);
    }
  }
  ctx.lineWidth = width;
  ctx.stroke();
};

/* ── Landscape (original art) ── */
const ridge = (seed: number, x: number, amp: number, freq: number) => {
  let y = 0;
  const r = mulberry(seed);
  for (let o = 0; o < 5; o++) {
    const ph = r() * 6.28;
    const f = freq * (1 + o * 1.7 + r());
    y += (Math.sin(x * f + ph) * amp) / (1 + o * 0.9);
  }
  // sharper peaks
  return y + Math.abs(Math.sin(x * freq * 3.3 + seed)) * amp * 0.25;
};

const drawLandscape = (ctx: CanvasRenderingContext2D, W: number, H: number, P: Placement, pal: Palette, sunArc: number, isSun: boolean, t: number) => {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, P.horizonY);
  sky.addColorStop(0, css(pal.top));
  sky.addColorStop(1, css(pal.horizon));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Stars
  if (pal.night > 0.02) {
    const r = mulberry(99);
    for (let i = 0; i < 220; i++) {
      const x = r() * W;
      const y = r() * P.horizonY * 0.9;
      const tw = 0.6 + 0.4 * Math.sin(t * (0.8 + r()) + i);
      ctx.fillStyle = `rgba(255,255,255,${pal.night * tw * (0.25 + r() * 0.6) * (1 - y / P.horizonY)})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.6 + r() * 1.3) * (P.unit / 1080), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sun or moon on its arc, behind the mountains
  const bx = W * (0.08 + 0.84 * sunArc);
  const by = P.horizonY + 0.06 * H - Math.sin(Math.PI * sunArc) * (P.horizonY * 0.75);
  const br = P.unit * (isSun ? 0.045 : 0.032);
  const halo = ctx.createRadialGradient(bx, by, 0, bx, by, br * 7);
  halo.addColorStop(0, css(pal.body, 0.45));
  halo.addColorStop(1, css(pal.body, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(bx - br * 7, by - br * 7, br * 14, br * 14);
  ctx.fillStyle = css(pal.body);
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  if (!isSun) {
    ctx.fillStyle = css(pal.top, 0.9);
    ctx.beginPath();
    ctx.arc(bx + br * 0.45, by - br * 0.2, br * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountain layers, far to near
  const layers = [
    {seed: 3, base: -0.1, amp: 0.09, freq: 4.2, tone: 0.3},
    {seed: 11, base: -0.02, amp: 0.07, freq: 5.6, tone: 0.5},
    {seed: 23, base: 0.08, amp: 0.055, freq: 3.1, tone: 0.72, pines: 0.5},
    {seed: 41, base: 0.2, amp: 0.05, freq: 2.2, tone: 0.92, pines: 1},
  ];
  const hazeLight = mix(pal.horizon, pal.lights, 0.35);
  const towerX = W * 0.74;
  let towerGround = 0;
  layers.forEach((L, li) => {
    const yAt = (x: number) => P.horizonY + (L.base - ridge(L.seed, x / W, L.amp, L.freq)) * P.unit * (li < 2 ? 1.6 : 1.3);
    const col = mix(hazeLight, pal.shadows, L.tone);
    ctx.fillStyle = css(col);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 240) ctx.lineTo(x, yAt(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    // Mist above the layer
    const mist = ctx.createLinearGradient(0, yAt(W / 2) - P.unit * 0.12, 0, yAt(W / 2) + P.unit * 0.05);
    mist.addColorStop(0, css(pal.horizon, 0));
    mist.addColorStop(1, css(pal.horizon, 0.12 * (1 - L.tone)));
    ctx.fillStyle = mist;
    ctx.fillRect(0, yAt(W / 2) - P.unit * 0.12, W, P.unit * 0.17);
    if (L.pines) {
      const r = mulberry(L.seed * 7);
      ctx.fillStyle = css(mix(col, pal.shadows, 0.35));
      for (let x = -20; x < W + 20; x += P.unit * (0.012 + r() * 0.03) / L.pines) {
        if (li === 3 && Math.abs(x - towerX) < P.unit * 0.06) continue;
        const h = P.unit * (0.04 + r() * 0.07) * (li === 3 ? 1.3 : 0.75);
        const w = h * 0.32;
        const g = yAt(x) + P.unit * 0.012;
        ctx.beginPath();
        ctx.moveTo(x, g - h);
        for (let k = 0; k < 4; k++) {
          const yy = g - h + ((k + 1) * h * 0.8) / 4;
          const ww = (w * (k + 1.3)) / 4.3;
          ctx.lineTo(x + ww, yy);
          ctx.lineTo(x + ww * 0.45, yy - h * 0.035);
        }
        ctx.lineTo(x + w * 0.12, g);
        ctx.lineTo(x - w * 0.12, g);
        for (let k = 3; k >= 0; k--) {
          const yy = g - h + ((k + 1) * h * 0.8) / 4;
          const ww = (w * (k + 1.3)) / 4.3;
          ctx.lineTo(x - ww * 0.45, yy - h * 0.035);
          ctx.lineTo(x - ww, yy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    if (li === 3) towerGround = yAt(towerX);
  });

  // Lookout tower on the nearest ridge
  const u = P.unit;
  const tw = u * 0.06;
  const legH = u * 0.13;
  const baseY = towerGround + u * 0.01;
  const cabinY = baseY - legH;
  const dark = css(mix(pal.shadows, [0, 0, 0], 0.3));
  ctx.strokeStyle = dark;
  ctx.fillStyle = dark;
  ctx.lineWidth = u * 0.0035;
  const legs = [-tw * 0.62, -tw * 0.22, tw * 0.22, tw * 0.62];
  ctx.beginPath();
  ctx.moveTo(towerX - tw * 0.62, baseY);
  ctx.lineTo(towerX - tw * 0.42, cabinY);
  ctx.moveTo(towerX + tw * 0.62, baseY);
  ctx.lineTo(towerX + tw * 0.42, cabinY);
  ctx.moveTo(towerX - tw * 0.22, baseY);
  ctx.lineTo(towerX - tw * 0.16, cabinY);
  ctx.moveTo(towerX + tw * 0.22, baseY);
  ctx.lineTo(towerX + tw * 0.16, cabinY);
  for (let k = 0; k < 3; k++) {
    const y0 = baseY - (legH * k) / 3;
    const y1 = baseY - (legH * (k + 1)) / 3;
    const w0 = tw * (0.62 - (0.2 * k) / 3);
    const w1 = tw * (0.62 - (0.2 * (k + 1)) / 3);
    ctx.moveTo(towerX - w0, y0);
    ctx.lineTo(towerX + w1, y1);
    ctx.moveTo(towerX + w0, y0);
    ctx.lineTo(towerX - w1, y1);
    ctx.moveTo(towerX - w1, y1);
    ctx.lineTo(towerX + w1, y1);
  }
  ctx.stroke();
  void legs;
  // Cabin, railing, roof
  const cw = tw * 1.15;
  const ch = u * 0.042;
  ctx.fillRect(towerX - cw / 2, cabinY - ch, cw, ch);
  ctx.fillRect(towerX - cw * 0.62, cabinY - u * 0.004, cw * 1.24, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(towerX - cw * 0.66, cabinY - ch);
  ctx.lineTo(towerX, cabinY - ch - u * 0.03);
  ctx.lineTo(towerX + cw * 0.66, cabinY - ch);
  ctx.closePath();
  ctx.fill();
  // Windows: dark by day, lit at night
  for (let k = 0; k < 3; k++) {
    const wx = towerX - cw / 2 + cw * (0.12 + k * 0.29);
    ctx.fillStyle = pal.night > 0.3 ? `rgba(255,214,140,${0.25 + 0.7 * pal.night})` : css(mix(pal.horizon, pal.shadows, 0.55));
    ctx.fillRect(wx, cabinY - ch * 0.78, cw * 0.2, ch * 0.42);
  }
  if (pal.night > 0.3) {
    const g = ctx.createRadialGradient(towerX, cabinY - ch * 0.55, 0, towerX, cabinY - ch * 0.55, u * 0.08);
    g.addColorStop(0, `rgba(255,200,120,${0.22 * pal.night})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(towerX - u * 0.08, cabinY - u * 0.13, u * 0.16, u * 0.16);
  }
};

export const placementFor = (W: number, H: number): Placement => {
  const horizonY = H * (H > W ? 0.6 : 0.64);
  return {width: W, height: H, horizonY, skyTop: H * 0.08, skyBottom: Math.max(H * 0.16, horizonY - H * 0.14), unit: Math.min(W, H)};
};

export type ForestProps = {
  width: number;
  height: number;
  /** Frames since the scene started (the flocks are simulated from there). */
  frames: number;
  sky: keyof typeof SKIES | {from: keyof typeof SKIES; to: keyof typeof SKIES; f: number};
  sunArc?: number;
  isSun?: boolean;
  /** Song and song time at the scene start: moods are read LOOKAHEAD seconds ahead, like the app. */
  song?: Song;
  songStart?: number;
  lookahead?: number;
  /** Force a mood (no song): base / calm / middle / energetic. */
  mood?: Mood;
  seed?: number;
  birdScale?: number;
};

export const ForestZone: React.FC<ForestProps> = ({width, height, frames, sky, sunArc = 0.35, isSun = false, song, songStart = 0, lookahead = 2, mood, seed = 5, birdScale = 1.25}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const P = useMemo(() => placementFor(width, height), [width, height]);
  const pal = typeof sky === 'string' ? SKIES[sky] : mixPal(SKIES[sky.from], SKIES[sky.to], sky.f);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    drawLandscape(ctx, width, height, P, pal, sunArc, isSun, frames / 30);
    const moodAt = (step: number) => {
      if (mood) return {mood, energy: mood === 'energetic' ? 0.85 : 0.4};
      if (!song) return {mood: 'base' as Mood, energy: 0};
      const ahead = songStart + step / 30 + lookahead;
      const st = song.stateAt(ahead);
      return {mood: (st === ENERGETIC ? 'energetic' : st === MIDDLE ? 'middle' : st === CALM ? 'calm' : 'base') as Mood, energy: song.energyNow(ahead)};
    };
    const flocks = simulateFlocks(Math.max(0, Math.round(frames)), moodAt, P, seed, birdScale);
    drawBirds(ctx, flocks, P, css(pal.bird, 0.95));
  });
  return <canvas ref={ref} width={width} height={height} style={{width, height, display: 'block'}} />;
};
