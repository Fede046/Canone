// Analyses the two songs exactly like the app does (see analysis.mjs) and writes what the
// Zones of the Canone videos need → src/canone/data/songs.json
//
// Needs the full songs in video/songs/ (git-ignored): fast.mp3 = "84", calm.mp3 = "Celestial Citadel".
// Only the analysis of the spans in `sources` (timeline.ts) is exported, plus the whole-song energy
// curves and key scores used by the developer video.
//
//   node scripts/canone/prepare-songs.mjs
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {sources} from '../../src/canone/timeline.ts';
import {analyzeMusicZone, decodeMono, deriveHarmony, energyTimeline, harmonyRaw, MZ} from './analysis.mjs';

const OUT = 'src/canone/data/songs.json';
const r3 = (x) => Math.round(x * 1000) / 1000;
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const data = {};
for (const [id, src] of Object.entries(sources)) {
  if (!existsSync(src.file)) {
    console.error(`Missing ${src.file}: copy the song there (see video/README.md).`);
    process.exit(1);
  }
  const t0 = Date.now();
  const mz = analyzeMusicZone(decodeMono(src.file, 48000), 48000);
  const energy = energyTimeline(mz);
  const harmony = deriveHarmony(harmonyRaw(decodeMono(src.file, 12000), 12000));

  // Music Zone: normalised band energies (0..255) for the exported span, as the app reads them
  const f0 = Math.floor(src.from * MZ.FRAME_RATE);
  const f1 = Math.min(mz.frames, Math.ceil(src.to * MZ.FRAME_RATE));
  const bands = [];
  const cumulative = [];
  for (let f = f0; f < f1; f++) {
    for (let b = 0; b < MZ.BAND_COUNT; b++) bands.push(Math.round(255 * mz.energyAtFrame(b, f)));
    cumulative.push(r3(mz.cumulative[f]));
  }
  const inSpan = (sec) => sec >= src.from - 1 && sec <= src.to + 1;
  const states = [0, 0, 0];
  for (const s of energy.states) states[s]++;

  data[id] = {
    duration: r3(mz.frames / MZ.FRAME_RATE),
    key: harmony.key,
    keyName: `${NAMES[harmony.key.tonic]} ${harmony.key.minor ? 'minor' : 'major'}`,
    keyScores: harmony.keyScores.map((k) => ({...k, score: r3(k.score)})),
    chroma: Array.from(harmony.chroma, (v) => r3(v / Math.max(...harmony.chroma))),
    bpm: r3(harmony.bpm),
    barSec: r3(harmony.barSec),
    mz: {
      from: f0, // first exported frame (30 fps, song time)
      frames: f1 - f0,
      bands, // frames × 6, 0..255
      cumulative,
      onsets: mz.onsets.filter((o) => inSpan(o.frame / MZ.FRAME_RATE)).map((o) => [o.frame, r3(o.strength)]),
      figureChanges: mz.figureChanges,
    },
    energy: {
      step: 0.5,
      values: energy.energy.map(r3),
      states: energy.states,
      parts: energy.parts.map((p) => [r3(p.loud), r3(p.bright), r3(p.hits)]),
      share: states.map((n) => r3(n / energy.states.length)),
    },
    chords: harmony.chords.filter((c) => inSpan(c.start)).map((c) => ({...c, start: r3(c.start)})),
    voices: harmony.voices.map((v) => {
      // Keep one note before the span, so trails and heads exist from the first frame
      const first = Math.max(0, v.findIndex((n) => n.start >= src.from - 1) - 1);
      return v.slice(first).filter((n) => n.start <= src.to + 1).map((n) => ({...n, start: r3(n.start)}));
    }),
  };
  console.log(
    `${id}: ${data[id].keyName}, ${harmony.bpm.toFixed(1)} BPM, ` +
      `calm/middle/energetic ${data[id].energy.share.map((x) => Math.round(x * 100) + '%').join(' / ')}, ` +
      `${data[id].chords.length} chords and ${data[id].voices.map((v) => v.length).join('/')} notes in the span ` +
      `(${Date.now() - t0} ms)`,
  );
}

mkdirSync(dirname(OUT), {recursive: true});
writeFileSync(OUT, JSON.stringify(data));
console.log(`→ ${OUT}`);
