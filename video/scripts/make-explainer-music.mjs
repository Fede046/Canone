// Synthesises the EXPLAINER soundtrack → public/explainer.wav
//
// The music follows the pitch's emotional arc, all read from src/explainer/timeline.ts:
//   question/problem  → minimal and tense (drone, heartbeat, ticks)
//   consequences      → riser + snare roll, half a beat of silence
//   name / value      → impact on the name, DROP on the value phrase
//   how it works      → steady, lighter groove; key clicks on every typed character
//   vision / closing  → airy major-key pads and bells, clean fade
//
//   node scripts/make-explainer-music.mjs
import {content} from '../src/explainer/content.ts';
import {beatToSeconds, keystrokeFrame, timeline} from '../src/explainer/timeline.ts';
import {createSynth} from './lib/synth.mjs';

const {audio, cues, scenes} = timeline;
const s = createSynth({sampleRate: audio.sampleRate, bpm: timeline.bpm, seconds: beatToSeconds(timeline.totalBeats), seed: 4040});
const {N, SR, SPB, b2s, tones} = s;
const inRange = (b, r) => b >= r.start && b < r.end;

const dry = s.bus(); // drums, fx, keys
const music = s.bus(); // bass, saws (sidechained)
const arp = s.bus(); // plucks (sidechained + delay)
const air = s.bus(); // soft pads & bells (lightly sidechained)

const chordAt = (beat) => {
  let c = audio.chords[0].chord;
  for (const e of audio.chords) if (e.beat <= beat) c = e.chord;
  return c;
};
/** Consecutive chord segments clipped to [from, to). */
const segments = (from, to) => {
  const out = [];
  const marks = audio.chords.map((e) => e.beat).filter((b) => b > from && b < to);
  const pts = [from, ...marks, to];
  for (let i = 0; i < pts.length - 1; i++) out.push({start: pts[i], end: pts[i + 1], chord: chordAt(pts[i])});
  return out;
};

// ── 1 · Tense (question → consequences) ─────────────────────────────────
{
  const {start, end} = audio.tense;
  s.softPad(air, start, end - start + 6, [33, 40], {vel: 2.2, attack: 2.5, release: 1, bright: 0.15, rev: 0.3}); // low A + E drone
  for (const seg of segments(start, audio.riser.end)) s.softPad(air, seg.start, seg.end - seg.start, tones(seg.chord, 52), {vel: 0.9, attack: 1.2, release: 1.2, bright: 0.08});
  // Wind: slow filtered noise
  const lp = new s.Biquad();
  s.voice(dry, 0, b2s(audio.riser.end), (t, j) => {
    if (j % 64 === 0) lp.set('lp', 300 + 250 * Math.sin(t * 0.7), 0.7);
    return lp.run(s.noise()) * Math.min(1, t / 2);
  }, {gain: 0.22, pan: 0});
  // Heartbeat: soft double thump every 2 beats
  for (let b = 2; b < audio.riser.start; b += 2) {
    s.kick(dry, b, 0.42, 0.7);
    s.kick(dry, b + 0.3, 0.28, 0.7);
  }
  // Clock ticks on the off-beats once the problem starts
  for (let b = scenes.problem.start + 0.5; b < audio.riser.start; b += 1) s.tick(dry, b, 0.6, b % 2 > 1 ? 0.3 : -0.3);
  // Dull hits on "No signal." / "No music."
  for (const b of audio.accents) {
    s.kick(dry, b, 0.75);
    s.bassNote(music, b, 1.5, 33, {saw: 0, sub: 1, vel: 0.55});
  }
}

// ── 2 · Riser into the name ──────────────────────────────────────────────
s.riser(dry, audio.riser.start, audio.riser.end, 0.6);
for (let b = 26; b < audio.riser.end - 1e-6; ) {
  const p = (b - 26) / (audio.riser.end - 26);
  s.clap(dry, b, 0.2 + 0.7 * p * p, 1000 + 2400 * p);
  b += b < 28 ? 0.5 : b < 29 ? 0.25 : 0.125;
}
for (let b = audio.riser.start; b < audio.riser.end; b += 0.5) {
  const p = (b - audio.riser.start) / (audio.riser.end - audio.riser.start);
  s.bassNote(music, b, 0.4, tones(chordAt(b), 33)[0], {cutoff: 250 + 1800 * p * p, vel: 0.5 + 0.4 * p});
}
s.supersaw(music, audio.riser.start, audio.riser.end - audio.riser.start, chordAt(audio.riser.start), {cutFrom: 500, cutTo: 5000, vel: 0.7, release: 0.02, attack: 0.5});

// ── 3 · Name impact, swell, DROP on the value phrase ─────────────────────
s.impact(dry, audio.impacts[0], true);
s.supersaw(air, audio.impacts[0], 2, 'Am', {cutFrom: 3000, cutTo: 800, vel: 0.8, release: 0.3, rev: 0.6, attack: 0.005});
s.suck(dry, audio.drop.start - 1, audio.drop.start);
s.impact(dry, audio.impacts[1], false);

const kicks = [];
const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
for (let b = audio.drop.start; b < audio.drop.end; b++) kicks.push({b, vel: 1});
for (let st = audio.drop.start * 4; st < audio.drop.end * 4; st++) {
  const b = st / 4;
  const pos = st % 4;
  s.hat(dry, b, pos === 2 ? 0.95 : pos === 0 ? 0.35 : 0.5, false, pos % 2 ? 0.3 : -0.15);
  if (pos === 2) s.hat(dry, b, 0.45, true);
  if (pos !== 0) s.bassNote(music, b, 0.22, tones(chordAt(b), 33)[0] + (pos === 2 ? 12 : 0), {cutoff: 1500, vel: pos === 2 ? 1 : 0.85});
  const tn = tones(chordAt(b), 69);
  tn.push(tn[0] + 12);
  s.pluck(arp, b, tn[ARP[st % ARP.length]], st % 4 === 2 ? 1 : 0.75, 5200, st % 2 ? 0.45 : -0.45);
}
for (let b = audio.drop.start + 1; b < audio.drop.end; b += 2) s.clap(dry, b, 1);
for (let b = audio.drop.start; b < audio.drop.end; b++) {
  s.supersaw(music, b + 0.5, 0.2, chordAt(b), {cutFrom: 4200, cutTo: 2200, vel: 1.2, release: 0.12, rev: 0.3});
}
for (const seg of segments(audio.drop.start, audio.drop.end)) s.supersaw(music, seg.start, seg.end - seg.start, seg.chord, {cutFrom: 1400, cutTo: 2200, vel: 0.5});

// ── 4 · Groove under the demo ────────────────────────────────────────────
{
  const {start, end} = audio.groove;
  for (let b = start; b < end; b++) kicks.push({b, vel: 0.72});
  for (let b = start + 1; b < end; b += 2) s.clap(dry, b, 0.45);
  for (let b = start; b < end; b += 0.5) {
    if (b % 1) s.hat(dry, b, 0.55, false, 0.25);
    s.bassNote(music, b, 0.4, tones(chordAt(b), 33)[0] + (b % 1 ? 12 : 0), {cutoff: 650, vel: 0.62});
    const tn = tones(chordAt(b), 67);
    tn.push(tn[0] + 12);
    s.pluck(arp, b, tn[ARP[Math.round(b * 2) % ARP.length]], 0.5, 2200, b % 1 ? 0.4 : -0.4);
  }
  for (const seg of segments(start, end)) s.supersaw(music, seg.start, seg.end - seg.start, seg.chord, {cutFrom: 900, cutTo: 1300, vel: 0.45, attack: 0.1});
}

// Keyboard clicks: one per character, on the exact frame it appears on screen.
const keyTimes = (win, length) => Array.from({length}, (_, k) => keystrokeFrame(k + 1, win, length) / timeline.fps);
const charCount = (lines) => lines.reduce((a, l) => a + l.length, 0);
s.typing(dry, keyTimes(cues.typing.step1, content.steps[0].terminal.command.length));
s.enterKey(dry, cues.typing.step1.end);
s.typing(dry, keyTimes(cues.typing.step2, charCount(content.steps[1].editor.lines)));
s.typing(dry, keyTimes(cues.typing.step3, charCount(content.steps[2].editor.lines)));
audio.chimes.forEach((b) => s.chime(dry, b, 0.09));
s.bell(dry, cues.tap, 88, 0.8, 0.2); // tap
s.bell(dry, cues.downloadDone, 91, 0.8, 0.2); // saved
s.bell(dry, cues.play, 84, 1, 0); // play

// ── 5 · Vision & closing: airy, warm, major ──────────────────────────────
{
  const {start, end} = audio.airy;
  s.suck(dry, start - 1.5, start);
  for (let b = start; b < cues.logo; b += 2) kicks.push({b, vel: 0.55});
  for (let b = start; b < cues.logo; b += 0.5) s.hat(dry, b, b % 1 ? 0.4 : 0.2, false, b % 1 ? 0.3 : -0.3);
  for (const seg of segments(start, end)) {
    s.softPad(air, seg.start, seg.end - seg.start, tones(seg.chord, 60), {vel: 1.1, attack: 0.4, release: 1.4, bright: 0.35});
    s.bassNote(music, seg.start, seg.end - seg.start, tones(seg.chord, 33)[0], {saw: 0, sub: 1, vel: 0.55});
  }
  for (let b = start; b < end - 1; b += 0.5) {
    const tn = tones(chordAt(b), 72);
    tn.push(tn[0] + 12);
    const step = Math.round(b * 2);
    s.bell(air, b, tn[[0, 2, 1, 3][step % 4]], b >= cues.logo ? 0.5 : 0.8, step % 2 ? 0.35 : -0.35);
  }
  s.softPad(air, cues.logo, end - cues.logo, [48, 55, 60, 64, 67], {vel: 1.4, attack: 0.05, release: 1.5, bright: 0.3, rev: 0.7}); // final C major
}
audio.whooshes.forEach((b) => s.whoosh(dry, b, b < scenes.name.start ? 0.6 : 1));
for (const {b, vel} of kicks) s.kick(dry, b, vel);
s.pingPong(arp, 0.75, 0.28);

// ── Mix ──────────────────────────────────────────────────────────────────
const duck = s.makeDuck(kicks.concat(audio.impacts.map((b) => ({b, vel: 1.4}))));
const [wetL, wetR] = s.reverb();
const silenceA = s.s2i(b2s(audio.silence.start));
const silenceB = s.s2i(b2s(audio.silence.end));
const dcHP = [new s.Biquad().set('hp', 28, 0.7), new s.Biquad().set('hp', 28, 0.7)];
const energy = (beat) => {
  if (beat < audio.riser.start) return 0.72;
  if (beat < audio.silence.start) return 0.72 + 0.25 * ((beat - audio.riser.start) / (audio.silence.start - audio.riser.start)) ** 2;
  if (inRange(beat, audio.groove)) return 0.8;
  if (beat >= audio.airy.start) return 0.62;
  return 1;
};
const ENERGY = Float32Array.from({length: N}, (_, i) => energy(i / SR / SPB));
const mix = [new Float32Array(N), new Float32Array(N)];
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const d = duck[i];
    let v = (dry[c][i] + (music[c][i] + arp[c][i]) * d + air[c][i] * (0.6 + 0.4 * d)) * ENERGY[i] + (c ? wetR[i] : wetL[i]) * 0.06;
    if (i >= silenceA && i < silenceB) v *= Math.max(0, 1 - (i - silenceA) / s.s2i(0.025));
    mix[c][i] = dcHP[c].run(v);
  }
}

s.finish({mix, targetLufs: audio.targetLufs, peakDb: audio.peakDb, fadeOut: audio.fadeOut, path: 'public/explainer.wav'});
