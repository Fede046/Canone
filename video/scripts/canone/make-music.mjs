// Synthesises the soundtracks of the two CANONE videos → public/canone/{public,dev}.wav
//
// Everything is read from src/canone/timeline.ts (scenes, cues, chords, sections, excerpts) and
// src/canone/content.ts (typed code → one key click per character, on the frame it appears):
//   question / problem / consequences → minimal and tense: E♭ drone, heartbeat, clock ticks
//   consequences                      → riser and snare roll, half a beat of silence
//   name / value phrase               → impact on the name, DROP on the value phrase (E♭ minor, the key of "84")
//   how it works                      → steady groove; key clicks, chimes, taps, whooshes on every cut
//   inside the Zones (dev)            → the same groove heard "through the wall" (low-passed)
//   Zones                             → the real songs: "84" (fast) and "Celestial Citadel" (calm)
//   vision / closing                  → airy E major: Pachelbel's progression with a real two-voice canon
// No external services: pure Node + the synthesiser in scripts/lib/synth.mjs; ffmpeg only decodes the songs.
//
//   node scripts/canone/make-music.mjs            (both)
//   node scripts/canone/make-music.mjs public     (one)
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {devContent, publicContent} from '../../src/canone/content.ts';
import {BPM, FPS, SAMPLE_RATE, beatToSeconds, keystrokeFrame, sources, timelines} from '../../src/canone/timeline.ts';
import {createSynth} from '../lib/synth.mjs';

const charCount = (lines) => lines.reduce((a, l) => a + l.length, 0);

/** What gets typed on screen, per typing window: [window, characters, enter at the end?]. */
const typedText = {
  public: (cues) => [
    [cues.typing.tap, charCount(publicContent.tap.code.lines), false],
    [cues.typing.grid, charCount(publicContent.grid.code.lines), false],
  ],
  dev: (cues) => {
    const s = devContent.setup;
    return [
      [cues.typing.clone, s.clone.command.length, true],
      [cues.typing.install, s.install.command.length, true],
      [cues.typing.panel, charCount(s.panel.commands), true],
      [cues.typing.upload, charCount(s.upload.code.lines), false],
      [cues.typing.pipeline, charCount(devContent.pipeline.code.lines), false],
      [cues.typing.cz, charCount(devContent.cz.code.lines), false],
    ];
  },
};

/** Stereo excerpt of a song, decoded by ffmpeg. */
const decodeExcerpt = (file, at, seconds) => {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-ss', String(at), '-t', String(seconds), '-i', file, '-vn', '-ac', '2', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-'],
    {maxBuffer: 1 << 30},
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${r.stderr}`);
  const all = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
  const n = all.length / 2;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = all[2 * i];
    R[i] = all[2 * i + 1];
  }
  return [L, R];
};

const build = (audience) => {
  const tl = timelines[audience];
  const {audio, cues, scenes} = tl;
  const s = createSynth({sampleRate: SAMPLE_RATE, bpm: BPM, seconds: beatToSeconds(tl.totalBeats), seed: audience === 'dev' ? 8484 : 2026});
  const {N, SR, SPB, b2s, tones} = s;

  const dry = s.bus(); // drums, fx, keys
  const music = s.bus(); // bass, saws (sidechained)
  const arp = s.bus(); // plucks (sidechained + delay)
  const air = s.bus(); // pads, bells
  const inside = s.bus(); // the groove heard from inside the Zones (low-passed at mix time)
  const songs = s.bus(); // the real songs, untouched

  const chordAt = (beat) => {
    let c = audio.chords[0].chord;
    for (const e of audio.chords) if (e.beat <= beat + 1e-6) c = e.chord;
    return c;
  };
  const segments = (from, to) => {
    const marks = audio.chords.map((e) => e.beat).filter((b) => b > from && b < to);
    const pts = [from, ...marks, to];
    return pts.slice(0, -1).map((p, i) => ({start: p, end: pts[i + 1], chord: chordAt(p)}));
  };
  const kicks = [];
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];

  // ── 1 · Tense: question → consequences ─────────────────────────────────
  {
    const {start, end} = audio.tense;
    s.softPad(air, start, end - start + 6, [27, 34], {vel: 2.4, attack: 2.5, release: 1, bright: 0.12, rev: 0.3}); // low E♭ + B♭
    for (const seg of segments(start, audio.riser.end)) {
      s.softPad(air, seg.start, seg.end - seg.start, tones(seg.chord, 51), {vel: 0.85, attack: 1.2, release: 1.2, bright: 0.07});
    }
    const lp = new s.Biquad();
    s.voice(dry, 0, b2s(audio.riser.end), (t, j) => {
      if (j % 64 === 0) lp.set('lp', 280 + 220 * Math.sin(t * 0.6), 0.7);
      return lp.run(s.noise()) * Math.min(1, t / 2);
    }, {gain: 0.2});
    for (let b = 2; b < audio.riser.start; b += 2) {
      s.kick(dry, b, 0.4, 0.7);
      s.kick(dry, b + 0.3, 0.26, 0.7);
    }
    for (let b = scenes.problemA.start + 0.5; b < audio.riser.start; b += 1) s.tick(dry, b, 0.55, b % 2 > 1 ? 0.3 : -0.3);
    for (const b of audio.accents) {
      s.kick(dry, b, 0.7);
      s.bassNote(music, b, 1.5, 27, {saw: 0, sub: 1, vel: 0.5});
    }
  }

  // ── 2 · Riser into the name ────────────────────────────────────────────
  const silence = {start: audio.riser.end, end: scenes.name.start};
  s.riser(dry, audio.riser.start, audio.riser.end, 0.6);
  for (let b = 26; b < audio.riser.end - 1e-6; ) {
    const p = (b - 26) / (audio.riser.end - 26);
    s.clap(dry, b, 0.2 + 0.7 * p * p, 1000 + 2400 * p);
    b += b < 28 ? 0.5 : b < 29 ? 0.25 : 0.125;
  }
  for (let b = audio.riser.start; b < audio.riser.end; b += 0.5) {
    const p = (b - audio.riser.start) / (audio.riser.end - audio.riser.start);
    s.bassNote(music, b, 0.4, tones(chordAt(b), 27)[0], {cutoff: 250 + 1800 * p * p, vel: 0.5 + 0.4 * p});
  }
  s.supersaw(music, audio.riser.start, audio.riser.end - audio.riser.start, chordAt(audio.riser.start), {cutFrom: 500, cutTo: 5000, vel: 0.7, release: 0.02, attack: 0.5});

  // ── 3 · Name impact, DROP on the value phrase ──────────────────────────
  s.impact(dry, audio.impacts[0], true);
  s.supersaw(air, audio.impacts[0], 2, 'Ebm', {cutFrom: 3000, cutTo: 800, vel: 0.8, release: 0.3, rev: 0.6, attack: 0.005});
  s.suck(dry, audio.drop.start - 1, audio.drop.start);
  s.impact(dry, audio.impacts[1], false);
  for (let b = audio.drop.start; b < audio.drop.end; b++) kicks.push({b, vel: 1});
  for (let st = audio.drop.start * 4; st < audio.drop.end * 4; st++) {
    const b = st / 4;
    const pos = st % 4;
    s.hat(dry, b, pos === 2 ? 0.95 : pos === 0 ? 0.35 : 0.5, false, pos % 2 ? 0.3 : -0.15);
    if (pos === 2) s.hat(dry, b, 0.45, true);
    if (pos !== 0) s.bassNote(music, b, 0.22, tones(chordAt(b), 27)[0] + (pos === 2 ? 12 : 0), {cutoff: 1500, vel: pos === 2 ? 1 : 0.85});
    const tn = tones(chordAt(b), 63);
    tn.push(tn[0] + 12);
    s.pluck(arp, b, tn[ARP[st % ARP.length]], pos === 2 ? 1 : 0.75, 5200, st % 2 ? 0.45 : -0.45);
  }
  for (let b = audio.drop.start + 1; b < audio.drop.end; b += 2) s.clap(dry, b, 1);
  for (let b = audio.drop.start; b < audio.drop.end; b++) {
    s.supersaw(music, b + 0.5, 0.2, chordAt(b), {cutFrom: 4200, cutTo: 2200, vel: 1.2, release: 0.12, rev: 0.3, octave: 51});
  }
  for (const seg of segments(audio.drop.start, audio.drop.end)) {
    s.supersaw(music, seg.start, seg.end - seg.start, seg.chord, {cutFrom: 1400, cutTo: 2200, vel: 0.5, octave: 51});
  }

  // ── 4 · Groove under the demo (and the same groove, muffled, inside the Zones) ──
  const groove = (target, start, end, level, withKicks) => {
    for (let b = start; b < end; b++) {
      if (withKicks) kicks.push({b, vel: 0.72 * level});
      else s.kick(target, b, 0.6);
    }
    for (let b = start + 1; b < end; b += 2) s.clap(target, b, 0.45 * level);
    for (let b = start; b < end; b += 0.5) {
      if (b % 1) s.hat(target, b, 0.5 * level, false, 0.25);
      s.bassNote(withKicks ? music : target, b, 0.4, tones(chordAt(b), 27)[0] + (b % 1 ? 12 : 0), {cutoff: 650, vel: 0.62 * level});
      const tn = tones(chordAt(b), 63);
      tn.push(tn[0] + 12);
      s.pluck(withKicks ? arp : target, b, tn[ARP[Math.round(b * 2) % ARP.length]], 0.5 * level, 2200, b % 1 ? 0.4 : -0.4);
    }
    for (const seg of segments(start, end)) {
      s.supersaw(withKicks ? music : target, seg.start, seg.end - seg.start, seg.chord, {cutFrom: 900, cutTo: 1300, vel: 0.42 * level, attack: 0.1, octave: 51});
    }
  };
  for (const g of audio.groove) groove(dry, g.start, g.end, g.level, true);
  for (const g of audio.inside) {
    groove(inside, g.start, g.end, 1, false);
    // Data blips: short high sines on the 16ths, like bytes being written
    for (let b = g.start; b < g.end; b += 0.25) {
      if (s.rnd() < 0.45) {
        const f = 1800 + Math.floor(s.rnd() * 6) * 300;
        s.voice(dry, b2s(b), 0.05, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.012), {gain: 0.05, pan: s.rnd() - 0.5});
      }
    }
  }

  // ── 5 · Vision & closing: airy E major, Pachelbel's progression and a two-voice canon ──
  {
    const {start, end} = audio.airy;
    const logo = cues.logo;
    s.suck(dry, start - 1.5, start);
    for (let b = start; b < logo; b += 2) kicks.push({b, vel: 0.5});
    for (let b = start; b < logo; b += 0.5) s.hat(dry, b, b % 1 ? 0.38 : 0.18, false, b % 1 ? 0.3 : -0.3);
    for (const seg of segments(start, end)) {
      s.softPad(air, seg.start, seg.end - seg.start, tones(seg.chord, 56), {vel: 1.1, attack: 0.4, release: 1.4, bright: 0.35});
      s.bassNote(music, seg.start, seg.end - seg.start, tones(seg.chord, 28)[0], {saw: 0, sub: 1, vel: 0.55});
    }
    // Pachelbel's first violin line, transposed to E: one note per chord (2 beats)
    const LINE = [80, 78, 76, 75, 73, 71, 73, 75, 76]; // G#5 F#5 E5 D#5 C#5 B4 C#5 D#5 E5
    const voiceAt = (delay, gain, pan) => {
      LINE.forEach((m, i) => {
        const b = start + delay + i * 2;
        if (b < end - 1) {
          s.bell(air, b, m, gain, pan);
          s.bell(air, b + 1, m + (i % 2 ? -12 : 0), gain * 0.45, -pan);
        }
      });
    };
    voiceAt(0, 1, -0.3); // leader
    voiceAt(4, 0.75, 0.35); // follower, one bar later: a real canon
    s.softPad(air, logo, end - logo, [52, 59, 64, 68, 71], {vel: 1.4, attack: 0.05, release: 1.5, bright: 0.3, rev: 0.7}); // final E major
  }

  // ── 6 · Sound effects ──────────────────────────────────────────────────
  audio.whooshes.forEach((b) => s.whoosh(dry, b, b < scenes.name.start ? 0.6 : 1));
  audio.chimes.forEach((b) => s.chime(dry, b, 0.085));
  audio.taps.forEach((b) => s.bell(dry, b, 88, 0.7, 0.15));
  for (const b of audio.thumps ?? []) {
    s.kick(dry, b, 0.9, 0.8);
    s.impact(dry, b, false);
  }
  const keyTimes = (win, length) => Array.from({length}, (_, k) => keystrokeFrame(k + 1, win, length) / FPS);
  for (const [win, length, enter] of typedText[audience](cues)) {
    s.typing(dry, keyTimes(win, length));
    if (enter) s.enterKey(dry, win.end);
  }
  for (const {b, vel} of kicks) s.kick(dry, b, vel);
  s.pingPong(arp, 0.75, 0.28);

  // ── 7 · Mix the bed, then lay the real songs on top at a matching loudness ──
  const duck = s.makeDuck(kicks.concat(audio.impacts.map((b) => ({b, vel: 1.4}))));
  const [wetL, wetR] = s.reverb();
  const silenceA = s.s2i(b2s(silence.start));
  const silenceB = s.s2i(b2s(silence.end));
  const inRanges = (beat, ranges) => ranges.some((r) => beat >= r.start && beat < r.end);
  const level = (beat) => {
    if (beat < audio.riser.start) return 0.72;
    if (beat < silence.start) return 0.72 + 0.25 * ((beat - audio.riser.start) / (silence.start - audio.riser.start)) ** 2;
    if (inRanges(beat, audio.groove)) return 0.8;
    if (beat >= audio.airy.start) return 0.62;
    return 1;
  };
  const insideLP = [new s.Biquad().set('lp', 700, 0.9), new s.Biquad().set('lp', 700, 0.9)];
  const dcHP = [new s.Biquad().set('hp', 28, 0.7), new s.Biquad().set('hp', 28, 0.7)];
  const bed = [new Float32Array(N), new Float32Array(N)];
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < N; i++) {
      const d = duck[i];
      let v = (dry[c][i] + (music[c][i] + arp[c][i]) * d + air[c][i] * (0.6 + 0.4 * d)) * level(i / SR / SPB);
      v += insideLP[c].run(inside[c][i]) * 0.9 + (c ? wetR[i] : wetL[i]) * 0.06;
      if (i >= silenceA && i < silenceB) v *= Math.max(0, 1 - (i - silenceA) / s.s2i(0.025));
      bed[c][i] = dcHP[c].run(v);
    }
  }

  // Songs: each excerpt at the bed's loudness (the calm one a little softer), short fades at the cuts
  const bedLufs = s.lufs(bed[0], bed[1]);
  const TARGET = {fast: bedLufs + 0.5, calm: bedLufs - 2};
  for (const ex of tl.songs) {
    const src = sources[ex.song];
    if (!existsSync(src.file)) throw new Error(`Missing ${src.file}: copy the song there (see video/README.md).`);
    const seconds = beatToSeconds(ex.to - ex.from);
    const [L, R] = decodeExcerpt(src.file, ex.at, seconds + 0.05);
    const probe = [new Float32Array(N), new Float32Array(N)];
    const i0 = s.s2i(beatToSeconds(ex.from));
    const n = Math.min(L.length, s.s2i(seconds), N - i0);
    for (let j = 0; j < n; j++) {
      probe[0][i0 + j] = L[j];
      probe[1][i0 + j] = R[j];
    }
    const gain = 10 ** ((TARGET[ex.song] - s.lufs(probe[0], probe[1])) / 20);
    const fadeIn = s.s2i(0.012);
    const fadeOut = s.s2i(0.035);
    for (let j = 0; j < n; j++) {
      const g = gain * Math.min(1, j / fadeIn, (n - j) / fadeOut);
      songs[0][i0 + j] += L[j] * g;
      songs[1][i0 + j] += R[j] * g;
    }
  }
  const mix = [Float32Array.from(bed[0], (v, i) => v + songs[0][i]), Float32Array.from(bed[1], (v, i) => v + songs[1][i])];
  s.finish({mix, targetLufs: -14, peakDb: -2, fadeOut: audio.fadeOut, path: `public/canone/${audience}.wav`});
};

const which = process.argv.slice(2);
for (const audience of which.length ? which : ['public', 'dev']) build(audience);
