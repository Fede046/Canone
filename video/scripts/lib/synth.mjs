// Tiny offline synthesiser shared by the soundtrack scripts.
// Pure Node, no dependencies: oscillators, filters, drum voices, pads, FX,
// a Freeverb-style reverb, EBU R128 loudness, a look-ahead limiter and a WAV writer.
//
// Usage: const s = createSynth({sampleRate, bpm, seconds}); …add voices… ; s.finish({...})
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const NOTE = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
export const CHORDS = {
  Am: ['A', 'C', 'E'],
  C: ['C', 'E', 'G'],
  Dm: ['D', 'F', 'A'],
  Em: ['E', 'G', 'B'],
  F: ['F', 'A', 'C'],
  G: ['G', 'B', 'D'],
};

export const createSynth = ({sampleRate, bpm, seconds, seed = 20261003}) => {
  const SR = sampleRate;
  const N = Math.round(seconds * SR);
  const SPB = 60 / bpm;

  let state = seed;
  const rnd = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const noise = () => rnd() * 2 - 1;
  const s2i = (s) => Math.round(s * SR);
  const b2s = (b) => b * SPB;
  const panGains = (pan) => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];

  const bus = () => [new Float32Array(N), new Float32Array(N)];
  const send = bus(); // reverb send, filled by voice(..., {rev})

  /** Writes a mono voice into a stereo bus. `fn(t, j)` returns the sample at t seconds since start. */
  const voice = (target, start, dur, fn, {gain = 1, pan = 0, rev = 0} = {}) => {
    const [gl, gr] = panGains(pan);
    const i0 = s2i(start);
    const n = s2i(dur);
    for (let j = 0; j < n; j++) {
      const i = i0 + j;
      if (i < 0 || i >= N) continue;
      const v = fn(j / SR, j) * gain;
      target[0][i] += v * gl;
      target[1][i] += v * gr;
      if (rev) {
        send[0][i] += v * gl * rev;
        send[1][i] += v * gr * rev;
      }
    }
  };

  class Biquad {
    constructor() {
      this.x1 = this.x2 = this.y1 = this.y2 = 0;
    }
    set(type, freq, q = 0.707) {
      const w = (2 * Math.PI * Math.min(Math.max(freq, 10), SR * 0.45)) / SR;
      const c = Math.cos(w);
      const a = Math.sin(w) / (2 * q);
      let b0, b1, b2;
      if (type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
      else if (type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
      else [b0, b1, b2] = [a, 0, -a]; // band-pass (0 dB peak)
      const a0 = 1 + a;
      this.b0 = b0 / a0;
      this.b1 = b1 / a0;
      this.b2 = b2 / a0;
      this.a1 = (-2 * c) / a0;
      this.a2 = (1 - a) / a0;
      return this;
    }
    run(x) {
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;
      return y;
    }
  }

  /** Band-limited-ish saw (PolyBLEP). */
  const sawStep = (phase, dt) => {
    let v = 2 * phase - 1;
    if (phase < dt) {
      const t = phase / dt;
      v -= t + t - t * t - 1;
    } else if (phase > 1 - dt) {
      const t = (phase - 1) / dt;
      v -= t * t + t + t + 1;
    }
    return v;
  };

  // ── Harmony ────────────────────────────────────────────────────────────
  const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
  /** Pitch class of a note name with optional accidentals: "C", "F#", "Eb", "Bbb". */
  const pcOf = (name) => NOTE[name[0]] + (name.match(/#/g) || []).length - (name.slice(1).match(/b/g) || []).length;
  const midiOf = (name, octave) => 12 * (octave + 1) + pcOf(name);
  /** Any triad name not in CHORDS: root with accidentals + optional "m" (minor). */
  const triadOf = (chord) => {
    const [, root, minor] = chord.match(/^([A-G][#b]?)(m?)$/);
    const names = Object.keys(NOTE).flatMap((n) => [n, n + '#', n + 'b']);
    const at = (semis) => names.find((n) => pcOf(n) % 12 === (pcOf(root) + semis + 12) % 12);
    return [root, at(minor ? 3 : 4), at(7)];
  };
  /** Chord tones as MIDI, root placed so it falls in [lo, lo+12). */
  const tones = (chord, lo) => {
    const names = CHORDS[chord] ?? triadOf(chord);
    let root = midiOf(names[0], 0);
    while (root < lo) root += 12;
    return names.map((n) => {
      let m = midiOf(n, 0);
      while (m < root) m += 12;
      return m;
    });
  };

  // ── Drums ──────────────────────────────────────────────────────────────
  const kick = (target, beat, vel, gain = 0.95) => {
    let ph = 0;
    voice(
      target,
      b2s(beat),
      0.5,
      (t) => {
        const f = 44 + 120 * Math.exp(-t / 0.032);
        ph += f / SR;
        const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.3) * Math.min(1, t / 0.001);
        const click = noise() * Math.exp(-t / 0.0018) * 0.35;
        return Math.tanh((body + click) * 1.6);
      },
      {gain: gain * vel},
    );
  };

  /** Sidechain (pumping) gain curve from a list of {b, vel} hits. */
  const makeDuck = (hits) => {
    const duck = new Float32Array(N).fill(1);
    for (const {b, vel} of hits) {
      const i0 = s2i(b2s(b));
      for (let j = 0; j < s2i(0.45); j++) {
        const i = i0 + j;
        if (i >= N) break;
        const t = j / SR;
        const g = 1 - Math.min(0.85, 0.72 * vel) * Math.exp(-t / 0.11) * Math.min(1, t / 0.004 + 0.6);
        duck[i] = Math.min(duck[i], g);
      }
    }
    return duck;
  };

  const clap = (target, beat, vel, centre = 1300) => {
    const bp = new Biquad().set('bp', centre, 0.9);
    voice(
      target,
      b2s(beat),
      0.35,
      (t) => {
        const bursts = [0, 0.009, 0.019].reduce((acc, o) => acc + (t >= o ? Math.exp(-(t - o) / (o === 0.019 ? 0.11 : 0.006)) : 0), 0);
        const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.045) * 0.5;
        return bp.run(noise()) * bursts * 2.2 + tone;
      },
      {gain: 0.42 * vel, rev: 0.35, pan: 0.05},
    );
  };

  const hat = (target, beat, vel, open = false, pan = 0.22) => {
    const hp = new Biquad().set('hp', 7200, 0.8);
    voice(target, b2s(beat), open ? 0.3 : 0.08, (t) => hp.run(noise()) * Math.exp(-t / (open ? 0.12 : 0.028)), {
      gain: 0.3 * vel,
      pan,
      rev: open ? 0.1 : 0,
    });
  };

  /** Soft muted tick (tension clock). */
  const tick = (target, beat, vel = 1, pan = 0) => {
    const bp = new Biquad().set('bp', 3200, 4);
    voice(target, b2s(beat), 0.05, (t) => bp.run(noise()) * Math.exp(-t / 0.008), {gain: 0.35 * vel, pan, rev: 0.2});
  };

  // ── Tonal voices ───────────────────────────────────────────────────────
  const bassNote = (target, beat, len, midi, {vel = 1, cutoff = 900, sub = 0.6, saw = 0.5} = {}) => {
    const f = hz(midi);
    const lp = new Biquad();
    let p1 = 0;
    let p2 = 0;
    let ps = 0;
    voice(
      target,
      b2s(beat),
      b2s(len) + 0.02,
      (t, j) => {
        if (j % 16 === 0) lp.set('lp', cutoff * (0.35 + 0.65 * Math.exp(-t / 0.07)) + 60, 1.1);
        p1 = (p1 + (f * 1.004) / SR) % 1;
        p2 = (p2 + (f * 0.996) / SR) % 1;
        ps = (ps + f / SR) % 1;
        const env = Math.min(1, t / 0.003) * (t < b2s(len) ? 1 : Math.max(0, 1 - (t - b2s(len)) / 0.02));
        const s = lp.run((sawStep(p1, f / SR) + sawStep(p2, f / SR)) * 0.5) * saw + Math.sin(2 * Math.PI * ps) * sub;
        return Math.tanh(s * 1.5) * env;
      },
      {gain: 0.5 * vel},
    );
  };

  const DETUNE = [-0.11, -0.05, 0, 0.05, 0.11];
  const supersaw = (
    target,
    beat,
    len,
    chord,
    {cutFrom = 800, cutTo = 2500, vel = 1, octave = 57, release = 0.25, attack = 0.02, rev = 0.25} = {},
  ) => {
    const notes = tones(chord, octave);
    notes.push(notes[0] + 12);
    const dur = b2s(len);
    notes.forEach((m, ni) => {
      const f = hz(m);
      const lp = new Biquad();
      const phases = DETUNE.map(() => rnd());
      voice(
        target,
        b2s(beat),
        dur + release,
        (t, j) => {
          if (j % 32 === 0) lp.set('lp', cutFrom * (cutTo / cutFrom) ** Math.min(1, t / dur), 0.8);
          let s = 0;
          for (let k = 0; k < DETUNE.length; k++) {
            const fk = f * 2 ** (DETUNE[k] / 12);
            phases[k] = (phases[k] + fk / SR) % 1;
            s += sawStep(phases[k], fk / SR);
          }
          const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 3)));
          return lp.run(s / DETUNE.length) * env;
        },
        {gain: 0.16 * vel, pan: (ni - 1.5) * 0.35, rev},
      );
    });
  };

  /** Soft sine/triangle pad, for airy or tense beds. */
  const softPad = (target, beat, len, midis, {vel = 1, attack = 0.6, release = 0.8, rev = 0.5, bright = 0.25} = {}) => {
    const dur = b2s(len);
    midis.forEach((m, ni) => {
      const f = hz(m);
      voice(
        target,
        b2s(beat),
        dur + release,
        (t) => {
          const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 3)));
          const vib = 1 + 0.002 * Math.sin(2 * Math.PI * (4.5 + ni * 0.3) * t);
          const x = 2 * Math.PI * f * vib * t;
          return (Math.sin(x) + bright * Math.sin(2 * x) * 0.5 + bright * Math.sin(3 * x) * 0.2) * env;
        },
        {gain: 0.07 * vel, pan: (ni - (midis.length - 1) / 2) * 0.4, rev},
      );
    });
  };

  const pluck = (target, beat, midi, vel, bright, pan) => {
    const f = hz(midi);
    const lp = new Biquad();
    let ph = rnd();
    voice(
      target,
      b2s(beat),
      0.25,
      (t, j) => {
        if (j % 16 === 0) lp.set('lp', 300 + bright * Math.exp(-t / 0.05), 1.4);
        ph = (ph + f / SR) % 1;
        return lp.run(sawStep(ph, f / SR)) * Math.exp(-t / 0.09);
      },
      {gain: 0.2 * vel, pan},
    );
  };

  /** Bell-ish sine pluck (warm sections). */
  const bell = (target, beat, midi, vel = 1, pan = 0) => {
    const f = hz(midi);
    voice(
      target,
      b2s(beat),
      1.2,
      (t) => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t / 0.15)) * Math.exp(-t / 0.45),
      {gain: 0.09 * vel, pan, rev: 0.45},
    );
  };

  /** Stereo ping-pong delay applied in place. */
  const pingPong = (b, beats, feedback = 0.32) => {
    const d = s2i(b2s(beats));
    for (let i = d; i < N; i++) {
      b[0][i] += b[1][i - d] * feedback;
      b[1][i] += b[0][i - d] * feedback;
    }
  };

  // ── FX ─────────────────────────────────────────────────────────────────
  const riser = (target, start, end, gain = 0.55) => {
    const dur = b2s(end - start);
    const bp = new Biquad();
    let ph = 0;
    voice(
      target,
      b2s(start),
      dur,
      (t, j) => {
        const p = t / dur;
        if (j % 16 === 0) bp.set('bp', 300 * 30 ** p, 1.2 + 3 * p);
        const f = 110 * 8 ** p * (1 + 0.004 * Math.sin(2 * Math.PI * 6 * t));
        ph = (ph + f / SR) % 1;
        const cut = Math.min(1, (dur - t) / 0.004);
        return (bp.run(noise()) * 1.6 + sawStep(ph, f / SR) * 0.18) * p * p * cut;
      },
      {gain, rev: 0.2},
    );
  };

  const whoosh = (target, beat, intensity = 1) => {
    const pre = 0.42;
    const post = 0.22;
    const bp = new Biquad();
    const peak = b2s(beat);
    for (const side of [-1, 1]) {
      voice(
        target,
        peak - pre,
        pre + post,
        (t, j) => {
          const x = t - pre; // <0 before the cut
          if (j % 16 === 0) bp.set('bp', x < 0 ? 600 * 9 ** ((t / pre) ** 2) : 5400 * Math.exp(-x / 0.08), 1.6);
          const env = x < 0 ? (t / pre) ** 2.5 : Math.exp(-x / 0.06);
          return bp.run(noise()) * env;
        },
        {gain: 0.32 * intensity, pan: side * 0.65, rev: 0.25},
      );
    }
  };

  const suck = (target, start, end) => {
    const dur = b2s(end - start);
    const hp = new Biquad();
    voice(
      target,
      b2s(start),
      dur,
      (t, j) => {
        const p = t / dur;
        if (j % 16 === 0) hp.set('hp', 1500 + 6000 * p, 0.9);
        return hp.run(noise()) * p ** 3 * Math.min(1, (dur - t) / 0.003);
      },
      {gain: 0.6, rev: 0.15},
    );
  };

  const impact = (target, beat, big) => {
    const t0 = b2s(beat);
    let ph = 0;
    voice(
      target,
      t0,
      big ? 2.2 : 1.4,
      (t) => {
        const f = 30 + 70 * Math.exp(-t / 0.09);
        ph += f / SR;
        return Math.tanh(Math.sin(2 * Math.PI * ph) * Math.exp(-t / (big ? 0.9 : 0.55)) * 1.8 + noise() * Math.exp(-t / 0.004) * 0.6);
      },
      {gain: 0.95},
    );
    const hp = new Biquad().set('hp', 3800, 0.7);
    voice(target, t0, big ? 3 : 1.8, (t) => hp.run(noise()) * Math.exp(-t / (big ? 0.9 : 0.5)), {gain: 0.28, rev: 0.5, pan: -0.1});
    const metal = [233, 361, 517, 809, 1187];
    voice(target, t0, 1.2, (t) => metal.reduce((a, f, k) => a + Math.sin(2 * Math.PI * f * t + k) / (k + 1), 0) * Math.exp(-t / 0.35), {
      gain: 0.07,
      rev: 0.6,
    });
  };

  /** One mechanical key press at `t` seconds. */
  const keyClick = (target, t) => {
    const hp = new Biquad().set('hp', 2400, 0.9);
    const body = 1500 + rnd() * 1400;
    voice(
      target,
      t,
      0.04,
      (x) =>
        hp.run(noise()) * Math.exp(-x / 0.0045) +
        Math.sin(2 * Math.PI * body * x) * Math.exp(-x / 0.003) * 0.5 +
        Math.sin(2 * Math.PI * 170 * x) * Math.exp(-x / 0.012) * 0.35,
      {gain: 0.2 * (0.7 + rnd() * 0.3), pan: (rnd() - 0.5) * 0.5},
    );
  };
  /** Clicks for every keystroke time (s), thinned to a human max of ~22 keys/s. */
  const typing = (target, times) => {
    let last = -1;
    for (const t0 of times) {
      const t = t0 + rnd() * 0.008;
      if (t - last < 0.045) continue;
      last = t;
      keyClick(target, t);
    }
  };
  const enterKey = (target, beat) => {
    const hp = new Biquad().set('hp', 900, 0.8);
    voice(target, b2s(beat), 0.08, (x) => hp.run(noise()) * Math.exp(-x / 0.01) + Math.sin(2 * Math.PI * 120 * x) * Math.exp(-x / 0.03), {gain: 0.32});
  };
  const chime = (target, beat, gain = 0.07) => {
    voice(target, b2s(beat), 0.8, (x) => (Math.sin(2 * Math.PI * 1318.5 * x) + 0.6 * Math.sin(2 * Math.PI * 1975.5 * x)) * Math.exp(-x / 0.18), {
      gain,
      rev: 0.4,
    });
  };

  // ── Reverb, loudness, limiter, output ──────────────────────────────────
  const reverb = () => {
    const k = SR / 44100;
    const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round(d * k));
    const apT = [556, 441, 341, 225].map((d) => Math.round(d * k));
    const run = (input, spread) => {
      const out = new Float32Array(N);
      for (const d0 of combT) {
        const d = d0 + spread;
        const buf = new Float32Array(d);
        let idx = 0;
        let lp = 0;
        for (let i = 0; i < N; i++) {
          const y = buf[idx];
          lp = y * 0.72 + lp * 0.28;
          buf[idx] = input[i] + lp * 0.84;
          idx = (idx + 1) % d;
          out[i] += y;
        }
      }
      for (const d0 of apT) {
        const d = d0 + spread;
        const buf = new Float32Array(d);
        let idx = 0;
        for (let i = 0; i < N; i++) {
          const b = buf[idx];
          const x = out[i];
          buf[idx] = x + b * 0.5;
          out[i] = b - x;
          idx = (idx + 1) % d;
        }
      }
      return out;
    };
    return [run(send[0], 0), run(send[1], Math.round(23 * k))];
  };

  /** Integrated loudness, ITU-R BS.1770 / EBU R128 (gated). 48 kHz K-weighting coefficients. */
  const lufs = (L, R) => {
    const kw = (x) => {
      const s1 = {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585]};
      const s2 = {b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621]};
      const out = new Float32Array(x.length);
      for (const st of [s1, s2]) {
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        const src = st === s1 ? x : out;
        for (let i = 0; i < x.length; i++) {
          const xi = src[i];
          const y = st.b[0] * xi + st.b[1] * x1 + st.b[2] * x2 - st.a[0] * y1 - st.a[1] * y2;
          x2 = x1; x1 = xi; y2 = y1; y1 = y;
          out[i] = y;
        }
      }
      return out;
    };
    const kL = kw(L);
    const kR = kw(R);
    const block = Math.round(0.4 * SR);
    const hop = Math.round(0.1 * SR);
    const z = [];
    for (let s = 0; s + block <= N; s += hop) {
      let sum = 0;
      for (let i = s; i < s + block; i++) sum += kL[i] * kL[i] + kR[i] * kR[i];
      z.push(sum / block);
    }
    const loud = (ms) => -0.691 + 10 * Math.log10(ms);
    const abs = z.filter((m) => loud(m) > -70);
    const rel = loud(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
    const gated = abs.filter((m) => loud(m) > rel);
    return loud(gated.reduce((a, b) => a + b, 0) / gated.length);
  };

  const limit = (L, R, ceilingDb) => {
    const ceil = 10 ** (ceilingDb / 20);
    const look = s2i(0.003);
    const rel = Math.exp(-1 / (0.08 * SR));
    const need = new Float32Array(N);
    for (let i = 0; i < N; i++) need[i] = Math.min(1, ceil / Math.max(1e-9, Math.abs(L[i]), Math.abs(R[i])));
    const g = new Float32Array(N);
    let env = 1;
    for (let i = 0; i < N; i++) {
      let m = 1;
      for (let j = i; j < Math.min(N, i + look); j++) if (need[j] < m) m = need[j];
      env = m < env ? m : m + (env - m) * rel;
      g[i] = env;
    }
    const oL = new Float32Array(N);
    const oR = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      oL[i] = Math.max(-ceil, Math.min(ceil, L[i] * g[i]));
      oR[i] = Math.max(-ceil, Math.min(ceil, R[i] * g[i]));
    }
    return [oL, oR];
  };

  /**
   * Normalise to `targetLufs` (iterating with the limiter at peakDb - 0.3), apply a 3 ms fade-in
   * and a cosine fade-out over [fadeOut.start, fadeOut.end) beats, write a 16-bit WAV.
   */
  const finish = ({mix, targetLufs, peakDb, fadeOut, path}) => {
    let [outL, outR] = mix;
    let gainDb = targetLufs - lufs(outL, outR);
    for (let pass = 0; pass < 3; pass++) {
      const g = 10 ** (gainDb / 20);
      [outL, outR] = limit(mix[0].map((v) => v * g), mix[1].map((v) => v * g), peakDb - 0.3);
      const measured = lufs(outL, outR);
      if (Math.abs(measured - targetLufs) < 0.15) break;
      gainDb += targetLufs - measured;
    }
    const fadeA = s2i(b2s(fadeOut.start));
    const fadeB = s2i(b2s(fadeOut.end));
    for (let i = 0; i < N; i++) {
      let g = Math.min(1, i / s2i(0.003));
      if (i >= fadeA) g *= i >= fadeB ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (i - fadeA)) / (fadeB - fadeA));
      outL[i] *= g;
      outR[i] *= g;
    }

    const wav = Buffer.alloc(44 + N * 4);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + N * 4, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(SR, 24);
    wav.writeUInt32LE(SR * 4, 28);
    wav.writeUInt16LE(4, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(N * 4, 40);
    let peak = 0;
    for (let i = 0; i < N; i++) {
      for (let c = 0; c < 2; c++) {
        const v = c ? outR[i] : outL[i];
        peak = Math.max(peak, Math.abs(v));
        const q = Math.max(-32768, Math.min(32767, Math.round(v * 32767 + (rnd() - rnd()))));
        wav.writeInt16LE(q, 44 + i * 4 + c * 2);
      }
    }
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, wav);
    console.log(
      `${path}  ${(N / SR).toFixed(2)} s  ${SR} Hz  ` +
        `${lufs(outL, outR).toFixed(1)} LUFS  peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS`,
    );
  };

  return {
    SR, N, SPB, rnd, noise, s2i, b2s, bus, send, voice, Biquad, sawStep, hz, pcOf, midiOf, tones,
    kick, makeDuck, clap, hat, tick, bassNote, supersaw, softPad, pluck, bell, pingPong,
    riser, whoosh, suck, impact, keyClick, typing, enterKey, chime, reverb, lufs, limit, finish,
  };
};
