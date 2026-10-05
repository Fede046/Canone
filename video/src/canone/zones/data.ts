/**
 * The analysis of the two songs (src/canone/data/songs.json, written by scripts/canone/prepare-songs.mjs)
 * with the same accessors the app uses: SongAnalysis (Music Zone), EnergyTimeline (Firewatch Zone),
 * HarmonyResult (Circle Zone). Everything is a pure function of the song time `t` (seconds).
 */
import raw from '../data/songs.json';
import soundRaw from '../data/soundtrack.json';
import type {SongId} from '../timeline';

type RawSong = {
  duration: number;
  key: {tonic: number; minor: boolean};
  keyName: string;
  keyScores: {tonic: number; minor: boolean; score: number}[];
  chroma: number[];
  bpm: number;
  barSec: number;
  mz: {from: number; frames: number; bands: number[]; cumulative: number[]; onsets: [number, number][]; figureChanges: number[]};
  energy: {step: number; values: number[]; states: number[]; parts: [number, number, number][]; share: number[]};
  chords: {start: number; root: number; quality: number}[];
  voices: {start: number; midi: number}[][];
};

const FPS = 30;
export const FIGURE_SEQUENCE = [3, 4, 5, 6, 7, 8, 7, 6, 5, 4];
export const MORPH_SEC = 1.4;
export const CALM = 0;
export const MIDDLE = 1;
export const ENERGETIC = 2;

const lastStartBefore = (starts: {start: number}[], t: number) => {
  let lo = 0;
  let hi = starts.length - 1;
  if (hi < 0 || starts[0].start > t) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

export class Song {
  constructor(public readonly id: SongId, public readonly d: RawSong) {}

  get duration() {
    return this.d.duration;
  }

  // ── Music Zone ──
  energyAtFrame(band: number, frame: number) {
    const f = frame - this.d.mz.from;
    if (f < 0 || f >= this.d.mz.frames) return 0;
    return this.d.mz.bands[f * 6 + band] / 255;
  }
  energyAt(band: number, t: number) {
    if (t < 0) return 0;
    const pos = t * FPS;
    const f = Math.floor(pos);
    const a = this.energyAtFrame(band, f);
    return a + (this.energyAtFrame(band, f + 1) - a) * (pos - f);
  }
  /** Triangular filter ±4 frames over bands [from, to] (CanvasVisualizer.smoothedEnergy). */
  smoothed(from: number, to: number, t: number) {
    let sum = 0;
    for (let tap = -4; tap <= 4; tap++) {
      const w = (5 - Math.abs(tap)) / 25;
      let bands = 0;
      for (let b = from; b <= to; b++) bands += this.energyAt(b, t + tap / FPS);
      sum += w * bands;
    }
    return sum / (to - from + 1);
  }
  accumulatedEnergyAt(t: number) {
    const c = this.d.mz.cumulative;
    const pos = t * FPS - this.d.mz.from;
    if (pos <= 0) return c[0] ?? 0;
    const f = Math.floor(pos);
    if (f >= c.length - 1) return c[c.length - 1];
    return c[f] + (c[f + 1] - c[f]) * (pos - f);
  }
  figureIndexAt(frame: number) {
    const fc = this.d.mz.figureChanges;
    let lo = 0;
    let hi = fc.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (fc[mid] <= frame) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  figureStart(index: number) {
    return this.d.mz.figureChanges[index] / FPS;
  }
  /** Shape at time t: lobes before/after the current change and the morph progress (eased). */
  shapeAt(t: number) {
    const index = this.figureIndexAt(Math.max(0, Math.floor(t * FPS)));
    const n = FIGURE_SEQUENCE.length;
    const toK = FIGURE_SEQUENCE[index % n];
    const fromK = FIGURE_SEQUENCE[(index - 1 + n) % n];
    let morph = 1;
    if (index > 0) {
      const x = Math.max(0, Math.min(1, (t - this.figureStart(index)) / MORPH_SEC));
      morph = x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    }
    return {index, fromK, toK, morph};
  }
  onsets() {
    return this.d.mz.onsets;
  }

  // ── Firewatch Zone ──
  energyNow(t: number) {
    const i = Math.floor(t / this.d.energy.step);
    return i >= 0 && i < this.d.energy.values.length ? this.d.energy.values[i] : 0;
  }
  stateAt(t: number) {
    const i = Math.floor(t / this.d.energy.step);
    return i >= 0 && i < this.d.energy.states.length ? this.d.energy.states[i] : CALM;
  }
  get energyCurve() {
    return this.d.energy;
  }

  // ── Circle Zone ──
  get key() {
    return this.d.key;
  }
  get keyName() {
    return this.d.keyName;
  }
  get keyScores() {
    return this.d.keyScores;
  }
  get chroma() {
    return this.d.chroma;
  }
  get bpm() {
    return this.d.bpm;
  }
  get barSec() {
    return this.d.barSec;
  }
  get chords() {
    return this.d.chords;
  }
  chordIndexAt(t: number) {
    return lastStartBefore(this.d.chords, t);
  }
  get voices() {
    return this.d.voices;
  }
  voiceIndexAt(v: number, t: number) {
    return lastStartBefore(this.d.voices[v], t);
  }
}

const data = raw as unknown as Record<SongId, RawSong>;
export const songs: Record<SongId, Song> = {
  fast: new Song('fast', data.fast),
  calm: new Song('calm', data.calm),
};

/** The finished soundtracks, analysed like a song (Music Zone data only): t = video time. */
const sound = soundRaw as unknown as Record<'public' | 'dev', Pick<RawSong, 'mz'>>;
const asSong = (mz: RawSong['mz']) => new Song('fast', {mz, energy: {step: 0.5, values: [], states: [], parts: [], share: []}, chords: [], voices: [[], [], []]} as unknown as RawSong);
export const soundtracks = {public: asSong(sound.public.mz), dev: asSong(sound.dev.mz)};

/** Placeholder cover colours (the app takes them from the cover; ours are generated, purple). */
export const PALETTES: Record<SongId, string[]> = {
  fast: ['#A855F7', '#E879F9', '#FF5FCB', '#7C3AED', '#F472B6', '#C084FC'],
  calm: ['#8B5CF6', '#60A5FA', '#C4B5FD', '#A78BFA', '#93C5FD', '#E9D5FF'],
};
