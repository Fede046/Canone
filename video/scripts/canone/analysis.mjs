// Node port of the app's audio analysis, so the Zones in the Canone videos react to the real songs
// exactly as they do on the phone. Same constants and steps as:
//   app/…/playback/analysis/AudioAnalyzer.kt   (Music Zone: 6 bands × 30 fps, strong hits, figure changes)
//   app/…/playback/analysis/EnergyTimeline.kt  (Firewatch Zone: energy and calm / middle / energetic)
//   app/…/playback/analysis/HarmonyAnalyzer.kt (Circle Zone: 72 semitones, onset envelope, bass window)
//   app/…/playback/analysis/HarmonyResult.kt   (key, chords with Viterbi, tempo, three voices)
// The only difference: decoding and resampling go through ffmpeg instead of MediaCodec.
import {spawnSync} from 'node:child_process';

// ── Decoding ────────────────────────────────────────────────────────────────
/** Mono float samples at `rate` Hz (ffmpeg averages the channels, like MonoDecoder). */
export const decodeMono = (file, rate) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], {
    maxBuffer: 1 << 30,
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${r.stderr}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
};

// ── FFT (iterative radix-2, in place) ───────────────────────────────────────
const fftCache = new Map();
const fft = (re, im) => {
  const n = re.length;
  let tables = fftCache.get(n);
  if (!tables) {
    const rev = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      rev[i] = r;
    }
    const cos = new Float64Array(n / 2);
    const sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n);
      sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    tables = {rev, cos, sin};
    fftCache.set(n, tables);
  }
  const {rev, cos, sin} = tables;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step];
        const wi = sin[k * step];
        const a = start + k;
        const b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
};
const hann = (n) => Float64Array.from({length: n}, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));

// ── Music Zone (AudioAnalyzer.kt) ───────────────────────────────────────────
export const MZ = {
  FRAME_RATE: 30,
  BAND_COUNT: 6,
  FFT_SIZE: 1024,
  BAND_EDGES_HZ: [30, 120, 350, 1000, 2500, 6000, 16000],
  FLUX_RING_SIZE: 64,
  FLUX_MEAN_FRAMES: 60,
  ONSET_RATIO: 1.6,
  ONSET_MIN_FLUX: 12,
  GAP_FRAMES: 6,
  MIN_FIGURE_SEC: 8,
  MAX_FIGURE_SEC: 16,
};

/** @param samples mono at `sampleRate` (≥ 32 kHz: pairs are averaged, as in the app). */
export const analyzeMusicZone = (samples, sampleRate) => {
  const {FRAME_RATE, BAND_COUNT, FFT_SIZE, BAND_EDGES_HZ} = MZ;
  const decimate = sampleRate >= 32000;
  const rate = decimate ? sampleRate / 2 : sampleRate;
  const hop = Math.floor(rate / FRAME_RATE);
  const binHz = rate / FFT_SIZE;
  const maxHz = rate * 0.475;
  const bandBins = Array.from({length: BAND_COUNT}, (_, band) => {
    const from = Math.max(1, Math.floor(Math.min(BAND_EDGES_HZ[band], maxHz) / binHz));
    const to = Math.min(Math.max(Math.floor(Math.min(BAND_EDGES_HZ[band + 1], maxHz) / binHz), from), FFT_SIZE / 2 - 1);
    return [from, to];
  });
  const win = hann(FFT_SIZE);
  const ring = new Float64Array(FFT_SIZE);
  let ringPos = 0;
  let since = 0;
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const levels = []; // per frame: Uint8Array(6)

  const push = (x) => {
    ring[ringPos] = x;
    ringPos = (ringPos + 1) & (FFT_SIZE - 1);
    if (++since >= hop) {
      since = 0;
      for (let i = 0; i < FFT_SIZE; i++) {
        re[i] = ring[(ringPos + i) & (FFT_SIZE - 1)] * win[i];
        im[i] = 0;
      }
      fft(re, im);
      const scale = 2 / FFT_SIZE;
      const frame = new Uint8Array(BAND_COUNT);
      for (let band = 0; band < BAND_COUNT; band++) {
        const [from, to] = bandBins[band];
        let power = 0;
        for (let k = from; k <= to; k++) {
          const mr = re[k] * scale;
          const mi = im[k] * scale;
          power += mr * mr + mi * mi;
        }
        power /= to - from + 1;
        const db = 10 * Math.log10(power + 1e-12);
        frame[band] = Math.max(0, Math.min(255, Math.trunc(((db + 100) / 100) * 255)));
      }
      levels.push(frame);
    }
  };
  if (decimate) for (let i = 0; i + 1 < samples.length; i += 2) push((samples[i] + samples[i + 1]) * 0.5);
  else for (let i = 0; i < samples.length; i++) push(samples[i]);

  // Derived data, one pass (SongAnalysis.updateDerived)
  const frames = levels.length;
  const cumulative = new Float32Array(frames);
  const onsets = [];
  const figureChanges = [0];
  const fluxRing = new Float64Array(MZ.FLUX_RING_SIZE);
  const mask = MZ.FLUX_RING_SIZE - 1;
  let lastOnset = -MZ.GAP_FRAMES;
  const lastFigure = () => figureChanges[figureChanges.length - 1];
  for (let f = 0; f < frames; f++) {
    const cur = levels[f];
    let lowMid = 0;
    for (let b = 0; b < 4; b++) lowMid += cur[b];
    const energy = Math.max(0, Math.min(1, (lowMid / 4 - 100) / 110));
    cumulative[f] = (f > 0 ? cumulative[f - 1] : 0) + energy / FRAME_RATE;
    let flux = 0;
    if (f > 0) for (let b = 0; b < BAND_COUNT; b++) flux += Math.max(0, cur[b] - levels[f - 1][b]);
    fluxRing[f & mask] = flux;
    const c = f - 1;
    if (c >= 1) {
      const cf = fluxRing[c & mask];
      const pf = fluxRing[(c - 1) & mask];
      let sum = 0;
      const from = Math.max(0, c - MZ.FLUX_MEAN_FRAMES);
      for (let g = from; g < c; g++) sum += fluxRing[g & mask];
      const mean = c > from ? sum / (c - from) : 0;
      if (cf > Math.max(MZ.ONSET_RATIO * mean, MZ.ONSET_MIN_FLUX) && cf >= pf && cf > flux && c - lastOnset >= MZ.GAP_FRAMES) {
        lastOnset = c;
        onsets.push({frame: c, strength: Math.max(0.3, Math.min(1, cf / (3 * Math.max(mean, 8))))});
        if (c - lastFigure() >= MZ.MIN_FIGURE_SEC * FRAME_RATE) figureChanges.push(c);
      }
    }
    if (f - lastFigure() >= MZ.MAX_FIGURE_SEC * FRAME_RATE) figureChanges.push(f);
  }

  // Low/high levels per band: 10th and 98th percentile (high ≥ low + 12)
  const low = [];
  const high = [];
  for (let b = 0; b < BAND_COUNT; b++) {
    const hist = new Uint32Array(256);
    for (const fr of levels) hist[fr[b]]++;
    const pct = (fraction) => {
      const target = Math.trunc(frames * fraction);
      let acc = 0;
      for (let v = 0; v < 256; v++) if ((acc += hist[v]) > target) return v;
      return 255;
    };
    low.push(pct(0.1));
    high.push(Math.max(pct(0.98), low[b] + 12));
  }
  const energyAtFrame = (band, f) => (f < 0 || f >= frames ? 0 : Math.max(0, Math.min(1, (levels[f][band] - low[band]) / (high[band] - low[band]))));
  return {frames, levels, low, high, cumulative, onsets, figureChanges, energyAtFrame};
};

// ── Firewatch Zone (EnergyTimeline.kt) ──────────────────────────────────────
export const ENERGY = {STEP_SEC: 0.5, SMOOTH_STEPS: 4, MIDDLE: 0.36, ENERGETIC: 0.66, MARGIN: 0.05, MIN_STEPS: 12};

export const energyTimeline = (mz) => {
  const perStep = ENERGY.STEP_SEC * MZ.FRAME_RATE;
  const steps = Math.floor(mz.frames / perStep);
  const db = (level) => level / 2.55 - 100;
  const loud = new Float64Array(steps);
  const bright = new Float64Array(steps);
  const hits = new Float64Array(steps);
  for (let s = 0; s < steps; s++) {
    let l = 0;
    let br = 0;
    for (let f = s * perStep; f < (s + 1) * perStep; f++) {
      for (let b = 0; b < 5; b++) l += db(mz.levels[f][b]);
      for (let b = 3; b < 6; b++) br += db(mz.levels[f][b]);
    }
    loud[s] = l / (5 * perStep);
    bright[s] = br / (3 * perStep);
  }
  for (const o of mz.onsets) {
    const s = Math.floor(o.frame / perStep);
    if (s < steps) hits[s] += o.strength;
  }
  const smooth = (v) => {
    const prefix = new Float64Array(v.length + 1);
    for (let i = 0; i < v.length; i++) prefix[i + 1] = prefix[i] + v[i];
    return Float64Array.from(v, (_, i) => {
      const from = Math.max(0, i - ENERGY.SMOOTH_STEPS);
      const to = Math.min(v.length, i + ENERGY.SMOOTH_STEPS + 1);
      return (prefix[to] - prefix[from]) / (to - from);
    });
  };
  const sl = smooth(loud);
  const sb = smooth(bright);
  const sh = smooth(hits);
  const sorted = [...sl].sort((a, b) => a - b);
  const lo = sorted[Math.trunc(steps * 0.1)];
  const hi = sorted[Math.min(steps - 1, Math.trunc(steps * 0.95))];
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const parts = [];
  const energy = Array.from({length: steps}, (_, s) => {
    const l = clamp01((sl[s] + 60) / 25);
    const b = clamp01((sb[s] + 85) / 40);
    const dense = clamp01((sh[s] / ENERGY.STEP_SEC - 1.5) / 2.5);
    const relative = clamp01((sl[s] - lo) / Math.max(hi - lo, 1e-3));
    parts.push({loud: l, bright: b, hits: dense, relative});
    return clamp01((0.4 * l + 0.35 * b + 0.25 * dense) * (0.5 + 0.8 * relative));
  });
  const level = (e, m) => (e > ENERGY.ENERGETIC - m ? 2 : e > ENERGY.MIDDLE - m ? 1 : 0);
  const states = [];
  let current = 0;
  let since = 0;
  for (const e of energy) {
    let target = level(e, 0);
    if (target < current) target = Math.min(level(e, ENERGY.MARGIN), current);
    if (target !== current && since >= ENERGY.MIN_STEPS) {
      current = target;
      since = 0;
    }
    since++;
    states.push(current);
  }
  return {energy, states, parts};
};

// ── Circle Zone (HarmonyAnalyzer.kt + HarmonyResult.kt) ─────────────────────
export const CZ = {
  FFT_SIZE: 4096,
  SHORT_WINDOW: 2048,
  FRAME_RATE: 10,
  ENVELOPE_RATE: 100,
  BASS_FRAME_RATE: 20,
  NOTE_LOW: 28,
  NOTE_COUNT: 72,
  PEAK_FLOOR: 0.003,
  MAX_DEVIATION: 0.42,
};

/** `samples` at the app's analysis rate: 48 kHz / round(48000 / 11025) = 12 kHz. */
export const harmonyRaw = (samples, rate) => {
  const {FFT_SIZE, SHORT_WINDOW, NOTE_LOW, NOTE_COUNT} = CZ;
  const hop = Math.floor(rate / CZ.FRAME_RATE);
  const bassHop = Math.floor(rate / CZ.BASS_FRAME_RATE);
  const envHop = Math.floor(rate / CZ.ENVELOPE_RATE);
  const binHz = rate / FFT_SIZE;
  const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);
  const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);
  const binLow = Math.max(2, Math.trunc(midiToHz(NOTE_LOW - 0.5) / binHz));
  const binHigh = Math.min(FFT_SIZE / 2 - 2, Math.trunc(midiToHz(NOTE_LOW + NOTE_COUNT - 0.5) / binHz));
  const winLong = hann(FFT_SIZE);
  const winShort = hann(SHORT_WINDOW);
  const ring = new Float64Array(FFT_SIZE);
  let ringPos = 0;
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const mag = new Float64Array(FFT_SIZE / 2);
  const notes = [];
  const bass = [];
  const envelope = [];
  let sinceFrame = 0;
  let sinceBass = 0;
  let envCount = 0;
  let envEnergy = 0;
  let prevLog = NaN;

  const spectrumNotes = (len, win) => {
    const start = ringPos + FFT_SIZE - len;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = i < len ? ring[(start + i) & (FFT_SIZE - 1)] * win[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    const scale = 4 / len;
    let maxM = 0;
    for (let k = binLow - 1; k <= binHigh + 1; k++) {
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]) * scale;
      mag[k] = m;
      if (m > maxM) maxM = m;
    }
    const power = new Float64Array(NOTE_COUNT);
    const floor = maxM * CZ.PEAK_FLOOR;
    for (let k = binLow; k <= binHigh; k++) {
      const m = mag[k];
      if (m <= floor || m < mag[k - 1] || m < mag[k + 1]) continue;
      const a = Math.log(mag[k - 1] + 1e-12);
      const b = Math.log(m + 1e-12);
      const c = Math.log(mag[k + 1] + 1e-12);
      const den = a - 2 * b + c;
      const offset = den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
      const midi = hzToMidi((k + offset) * binHz);
      const nearest = Math.round(midi);
      const dev = Math.abs(midi - nearest);
      const index = nearest - NOTE_LOW;
      if (dev > CZ.MAX_DEVIATION || index < 0 || index >= NOTE_COUNT) continue;
      power[index] += m * m * (1 - dev);
    }
    return Uint8Array.from(power, (p) => Math.max(0, Math.min(255, Math.trunc((10 * Math.log10(p + 1e-12) + 100) * 2.55))));
  };

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    ring[ringPos] = x;
    ringPos = (ringPos + 1) & (FFT_SIZE - 1);
    envEnergy += x * x;
    if (++envCount >= envHop) {
      const logE = 10 * Math.log10(envEnergy / envCount + 1e-10);
      const rise = Number.isNaN(prevLog) ? 0 : Math.max(0, logE - prevLog);
      prevLog = logE;
      envelope.push(Math.max(0, Math.min(255, Math.trunc(rise * 8))));
      envEnergy = 0;
      envCount = 0;
    }
    if (++sinceBass >= bassHop) {
      sinceBass = 0;
      bass.push(spectrumNotes(SHORT_WINDOW, winShort));
    }
    if (++sinceFrame >= hop) {
      sinceFrame = 0;
      notes.push(spectrumNotes(FFT_SIZE, winLong));
    }
  }
  return {notes, bass, envelope};
};

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const TRIADS = [
  [0, 4, 7],
  [0, 3, 7],
  [0, 3, 6],
]; // major, minor, diminished
const VOICE_RANGES = [
  [0, 24],
  [24, 48],
  [48, 72],
];
const HARMONIC_OFFSETS = [0, 12, 19, 24, 28, 31];
const HARMONIC_WEIGHTS = [1, 0.8, 0.6, 0.5, 0.4, 0.35];
const mod = (a, n) => ((a % n) + n) % n;
export const scaleOf = (key) => (key.minor ? MINOR_STEPS : MAJOR_STEPS).map((s) => (key.tonic + s) % 12);
export const keyProfiles = {MAJOR_PROFILE, MINOR_PROFILE};

const correlation = (values, other) => {
  const meanA = values.reduce((a, b) => a + b, 0) / 12;
  let meanB = 0;
  for (let i = 0; i < 12; i++) meanB += other(i);
  meanB /= 12;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < 12; i++) {
    const a = values[i] - meanA;
    const b = other(i) - meanB;
    cov += a * b;
    va += a * a;
    vb += b * b;
  }
  return va <= 0 || vb <= 0 ? 0 : cov / Math.sqrt(va * vb);
};

export const deriveHarmony = (raw) => {
  const FPS = CZ.FRAME_RATE;
  const frames = raw.notes.length;
  const frameTime = (f) => Math.max(0, (f + 1) / FPS - 0.18);
  const bassFrameTime = (f) => Math.max(0, (f + 1) / CZ.BASS_FRAME_RATE - 0.09);

  // Salience
  const levels = raw.notes.map((row) => Math.max(...row));
  const loud = [...levels].sort((a, b) => a - b)[Math.min(frames - 1, Math.trunc(frames * 0.9))];
  const salience = raw.notes.map((row, f) =>
    levels[f] < loud - 40 ? new Float64Array(CZ.NOTE_COUNT) : Float64Array.from(row, (v) => Math.max(0, (v - (levels[f] - 60)) / 60)),
  );
  const chroma = VOICE_RANGES.map(([a, b]) =>
    salience.map((s) => {
      const c = new Float64Array(12);
      for (let n = a; n < b; n++) c[(n + CZ.NOTE_LOW) % 12] += s[n];
      return c;
    }),
  );
  const full = salience.map((_, f) => Float64Array.from({length: 12}, (_, pc) => chroma[0][f][pc] + chroma[1][f][pc] + 0.8 * chroma[2][f][pc]));

  // Key: Krumhansl-Kessler correlation over the 24 keys
  const total = new Float64Array(12);
  for (const fr of full) for (let pc = 0; pc < 12; pc++) total[pc] += fr[pc];
  let key = {tonic: 0, minor: false};
  let bestKeyScore = -2;
  const keyScores = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const minor of [false, true]) {
      const profile = minor ? MINOR_PROFILE : MAJOR_PROFILE;
      const score = correlation(total, (pc) => profile[mod(pc - tonic, 12)]);
      keyScores.push({tonic, minor, score});
      if (score > bestKeyScore) {
        bestKeyScore = score;
        key = {tonic, minor};
      }
    }
  }
  const scale = scaleOf(key);

  // Chords: triad templates + bass on root + diatonic bonus, Viterbi with a switch penalty
  const candidates = [];
  for (let root = 0; root < 12; root++) for (let q = 0; q < 3; q++) candidates.push([root, q]);
  const templates = candidates.map(([root, q]) => {
    const v = new Float64Array(12);
    for (const i of TRIADS[q]) v[(root + i) % 12] = 1 / Math.sqrt(3);
    return v;
  });
  const diatonic = new Set();
  for (let d = 0; d < 7; d++) {
    const root = scale[d];
    const third = mod(scale[(d + 2) % 7] - root, 12);
    const fifth = mod(scale[(d + 4) % 7] - root, 12);
    const q = third === 4 && fifth === 7 ? 0 : third === 3 && fifth === 7 ? 1 : third === 3 && fifth === 6 ? 2 : -1;
    if (q >= 0) diatonic.add(root * 3 + q);
  }
  if (key.minor) {
    diatonic.add(((key.tonic + 7) % 12) * 3 + 0);
    diatonic.add(((key.tonic + 11) % 12) * 3 + 2);
  }
  const bonus = candidates.map(([root, q]) => (diatonic.has(root * 3 + q) ? 0.05 : 0) - (q === 2 ? 0.04 : 0));
  const S = candidates.length + 1;
  const NONE = candidates.length;
  const scores = [];
  for (let f = 0; f < frames; f++) {
    const sm = new Float64Array(12);
    const sb = new Float64Array(12);
    for (let g = Math.max(0, f - 2); g <= Math.min(frames - 1, f + 2); g++) {
      for (let pc = 0; pc < 12; pc++) {
        sm[pc] += full[g][pc];
        sb[pc] += chroma[0][g][pc];
      }
    }
    const norm = Math.sqrt(sm.reduce((a, v) => a + v * v, 0));
    const bassMax = Math.max(...sb);
    const row = new Float64Array(S);
    if (norm < 1e-3) {
      row.fill(-1);
      row[NONE] = 1;
    } else {
      for (let c = 0; c < candidates.length; c++) {
        let dot = 0;
        for (let pc = 0; pc < 12; pc++) dot += sm[pc] * templates[c][pc];
        const root = candidates[c][0];
        row[c] = dot / norm + 0.12 * (bassMax > 0 ? sb[root] / bassMax : 0) + bonus[c];
      }
      row[NONE] = 0.45;
    }
    scores.push(row);
  }
  const back = [];
  let prev = Float64Array.from(scores[0]);
  back.push(new Int32Array(S));
  for (let f = 1; f < frames; f++) {
    let best = 0;
    for (let s = 1; s < S; s++) if (prev[s] > prev[best]) best = s;
    const sw = prev[best] - 0.18;
    const cur = new Float64Array(S);
    const bk = new Int32Array(S);
    for (let s = 0; s < S; s++) {
      if (prev[s] >= sw) {
        cur[s] = prev[s] + scores[f][s];
        bk[s] = s;
      } else {
        cur[s] = sw + scores[f][s];
        bk[s] = best;
      }
    }
    back.push(bk);
    prev = cur;
  }
  const path = new Int32Array(frames);
  let st = 0;
  for (let s = 1; s < S; s++) if (prev[s] > prev[st]) st = s;
  for (let f = frames - 1; f >= 0; f--) {
    path[f] = st;
    st = back[f][st];
  }
  const cStarts = [];
  const cLabels = [];
  for (let f = 0; f < frames; f++) {
    if (cLabels.length === 0 || path[f] !== cLabels[cLabels.length - 1]) {
      if (cStarts.length && f - cStarts[cStarts.length - 1] < 4 && cLabels.length > 1) {
        cStarts.pop();
        cLabels.pop();
        if (path[f] === cLabels[cLabels.length - 1]) continue;
      }
      cStarts.push(f);
      cLabels.push(path[f]);
    }
  }
  const chords = cStarts.map((f, i) => ({
    start: frameTime(f),
    root: cLabels[i] === NONE ? 0 : candidates[cLabels[i]][0],
    quality: cLabels[i] === NONE ? -1 : candidates[cLabels[i]][1],
  }));

  // Tempo: onset envelope autocorrelation 50–200 BPM with a prior around 115
  const tempo = (() => {
    const rate = CZ.ENVELOPE_RATE;
    const count = raw.envelope.length;
    if (count < rate * 8) return {bpm: 0, firstBeat: 0};
    const window = rate / 2;
    const det = new Float64Array(count);
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += raw.envelope[i];
      if (i >= window) sum -= raw.envelope[i - window];
      det[i] = Math.max(0, raw.envelope[i] - sum / Math.min(i + 1, window));
    }
    const minLag = Math.trunc((rate * 60) / 200);
    const maxLag = Math.trunc((rate * 60) / 50);
    const ac = new Float64Array(maxLag + 2);
    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let acc = 0;
      for (let i = 0; i < count - lag; i++) acc += det[i] * det[i + lag];
      ac[lag] = acc / (count - lag);
    }
    let bestLag = -1;
    let bestScore = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const bpm = (60 * rate) / lag;
      const oct = Math.log(bpm / 115) / Math.log(2);
      const score = ac[lag] * Math.exp(-0.5 * (oct / 0.6) ** 2);
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }
    if (bestLag < 0 || bestScore <= 1e-4) return {bpm: 0, firstBeat: 0};
    const a = ac[bestLag - 1];
    const b = ac[bestLag];
    const c = ac[bestLag + 1];
    const den = a - 2 * b + c;
    const period = bestLag + (den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0);
    let bestPhase = 0;
    let bestPhaseScore = -1;
    for (let phase = 0; phase < Math.trunc(period); phase++) {
      let acc = 0;
      for (let pos = phase; pos < count; pos += period) acc += det[Math.min(count - 1, Math.round(pos))];
      if (acc > bestPhaseScore) {
        bestPhaseScore = acc;
        bestPhase = phase;
      }
    }
    return {bpm: (60 * rate) / period, firstBeat: bestPhase / rate};
  })();

  // Voices
  const buildTrack = (pitch, time) => {
    const n = pitch.length;
    const filt = Int32Array.from(pitch, (p, f) => (f === 0 || f === n - 1 ? p : pitch[f - 1] === pitch[f + 1] ? pitch[f - 1] : p));
    const out = [];
    let f = 0;
    while (f < n) {
      let end = f;
      while (end + 1 < n && filt[end + 1] === filt[f]) end++;
      const len = end - f + 1;
      const note = filt[f];
      if (len < 2 && out.length) {
        // too short: extends the previous one
      } else if (!out.length || out[out.length - 1].midi !== (note < 0 ? -1 : note + CZ.NOTE_LOW)) {
        out.push({start: time(f), midi: note < 0 ? -1 : note + CZ.NOTE_LOW});
      }
      f = end + 1;
    }
    return out;
  };
  const voiceTrack = ([a, b]) => {
    const pitch = new Int32Array(frames).fill(-1);
    const strength = new Float64Array(frames);
    for (let f = 0; f < frames; f++) {
      let best = -1;
      let bv = 0;
      for (let n = a; n < b; n++) if (salience[f][n] > bv) [bv, best] = [salience[f][n], n];
      pitch[f] = best;
      strength[f] = bv;
    }
    const active = [...strength].filter((v) => v > 0).sort((x, y) => x - y);
    if (!active.length) return [];
    const typical = active[Math.min(active.length - 1, Math.trunc(active.length * 0.9))];
    for (let f = 0; f < frames; f++) if (strength[f] < 0.45 * typical) pitch[f] = -1;
    return buildTrack(pitch, frameTime);
  };
  const bassTrack = () => {
    const bf = raw.bass.length;
    const amp = raw.bass.map((row) => Float64Array.from(row, (v) => 10 ** ((v / 2.55 - 100) / 40)));
    const lv = raw.bass.map((row) => Math.max(...row));
    const ld = [...lv].sort((a, b) => a - b)[Math.min(bf - 1, Math.trunc(bf * 0.9))];
    const pitch = new Int32Array(bf).fill(-1);
    const strength = new Float64Array(bf);
    for (let f = 0; f < bf; f++) {
      if (lv[f] < ld - 40) continue;
      const row = amp[f];
      let best = -1;
      let bv = 0;
      for (let n = 0; n < 27; n++) {
        let s = 0;
        for (let h = 0; h < HARMONIC_OFFSETS.length; h++) {
          const idx = n + HARMONIC_OFFSETS[h];
          if (idx < CZ.NOTE_COUNT) s += HARMONIC_WEIGHTS[h] * row[idx];
        }
        if (s > bv) [bv, best] = [s, n];
      }
      let bassMax = 0;
      for (let n = 0; n < 24; n++) bassMax = Math.max(bassMax, row[n]);
      if (best >= 0 && row[best] >= 0.5 * bassMax) {
        pitch[f] = best;
        strength[f] = bv;
      }
    }
    const active = [...strength].filter((v) => v > 0).sort((x, y) => x - y);
    if (!active.length) return [];
    const typical = active[Math.min(active.length - 1, Math.trunc(active.length * 0.9))];
    for (let f = 0; f < bf; f++) if (strength[f] < 0.45 * typical) pitch[f] = -1;
    return buildTrack(pitch, bassFrameTime);
  };
  const voices = [bassTrack(), voiceTrack(VOICE_RANGES[1]), voiceTrack(VOICE_RANGES[2])]; // bass, middle, melody

  return {
    duration: frames / FPS,
    key,
    keyScores,
    chroma: total,
    bpm: tempo.bpm,
    firstBeat: tempo.firstBeat,
    barSec: tempo.bpm > 0 ? 240 / tempo.bpm : 2,
    chords,
    voices,
  };
};
