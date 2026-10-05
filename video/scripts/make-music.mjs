// Synthesises the SHOWREEL soundtrack → public/showreel.wav
//
// Pure Node, no dependencies, no external services. Everything is generated from the
// SAME timeline the animations use (src/timeline.ts) plus the terminal lines in
// src/content.ts (keyboard clicks land on the exact frames each character appears).
//
//   node scripts/make-music.mjs
import {content} from '../src/content.ts';
import {beatToSeconds, keystrokeFrame, timeline} from '../src/timeline.ts';
import {createSynth} from './lib/synth.mjs';

const {audio, cues, scenes} = timeline;
const s = createSynth({sampleRate: audio.sampleRate, bpm: timeline.bpm, seconds: beatToSeconds(timeline.totalBeats)});
const {N, SR, SPB, b2s, tones} = s;

const dry = s.bus(); // drums, fx
const music = s.bus(); // bass, pads, stabs (sidechained)
const arp = s.bus(); // plucks (sidechained + delay)

const lastImpact = audio.impacts[audio.impacts.length - 1];
const chordAt = (beat) =>
  beat >= lastImpact ? audio.chords[audio.chords.length - 1] : audio.chords[Math.min(Math.floor(beat / 4), audio.chords.length - 1)];
const inRange = (b, r) => b >= r.start && b < r.end;

// ── Drums ────────────────────────────────────────────────────────────────
const kicks = [];
for (let b = 0; b < timeline.totalBeats; b++) {
  if (b >= audio.silence.start && b < audio.silence.end) continue;
  if (b >= lastImpact) continue;
  if (audio.impacts.includes(b)) continue; // impacts bring their own low end
  const vel = inRange(b, audio.breakdown) ? 0.62 : b < scenes.tagline.start ? 0.82 : inRange(b, audio.drop) ? 1 : 0.9;
  kicks.push({b, vel});
}
for (const {b, vel} of kicks) s.kick(dry, b, vel);
const duck = s.makeDuck(kicks.concat(audio.impacts.map((b) => ({b, vel: 1.4}))));

for (const b of [13, 15, 17, 19]) s.clap(dry, b, 1);
for (const b of [23, 25]) s.clap(dry, b, 0.55);
// Snare roll through the build: 8ths → 16ths → 32nds, velocity and pitch rising.
{
  const {start} = audio.riser;
  const end = audio.silence.start;
  for (let b = start; b < end - 1e-6; ) {
    const p = (b - start) / (end - start);
    s.clap(dry, b, 0.25 + 0.75 * p * p, 1000 + 2400 * p);
    b += b < 10 ? 0.5 : b < 11 ? 0.25 : 0.125;
  }
}

for (let st = 0; st < timeline.totalBeats * 4; st++) {
  const b = st / 4;
  const pos = st % 4; // 16th within the beat
  if (b >= audio.silence.start && b < audio.silence.end) continue;
  if (b >= lastImpact) continue;
  if (b >= scenes.tagline.start && b < audio.riser.start && pos === 2) s.hat(dry, b, 0.7, true);
  if (inRange(b, {start: audio.riser.start, end: audio.silence.start})) s.hat(dry, b, 0.25 + 0.5 * ((b - 8) / 3.5), false, pos % 2 ? 0.3 : -0.1);
  if (inRange(b, audio.drop)) {
    s.hat(dry, b, pos === 2 ? 0.95 : pos === 0 ? 0.35 : 0.5, false, pos % 2 ? 0.3 : -0.15);
    if (pos === 2) s.hat(dry, b, 0.45, true);
  }
  if (inRange(b, audio.breakdown) && pos === 2) s.hat(dry, b, 0.4, false);
}

// ── Bass ─────────────────────────────────────────────────────────────────
const bassRoot = (beat) => tones(chordAt(beat), 33)[0]; // A1..G#2
for (let b = 0; b < scenes.tagline.start; b++) s.bassNote(music, b, 0.9, bassRoot(b), {saw: 0, sub: 0.9, vel: 0.8});
for (let b = scenes.tagline.start; b < audio.riser.start; b += 0.5)
  s.bassNote(music, b, 0.45, bassRoot(b) + (b % 1 ? 12 : 0), {cutoff: 500, vel: 0.85});
for (let b = audio.riser.start; b < audio.silence.start; b += 0.25) {
  const p = (b - audio.riser.start) / (audio.silence.start - audio.riser.start);
  s.bassNote(music, b, 0.22, bassRoot(b), {cutoff: 300 + 2200 * p * p, vel: 0.65 + 0.3 * p});
}
for (let b = audio.drop.start; b < audio.drop.end; b += 0.25) {
  const pos = Math.round((b % 1) * 4);
  if (pos === 0) continue; // leave the downbeat to the kick
  s.bassNote(music, b, 0.22, bassRoot(b) + (pos === 2 ? 12 : 0), {cutoff: 1500, vel: pos === 2 ? 1 : 0.85});
}
for (let b = audio.breakdown.start; b < lastImpact; b += 1) s.bassNote(music, b, 0.95, bassRoot(b), {saw: 0.15, sub: 0.8, vel: 0.6, cutoff: 300});

// ── Pads & stabs ─────────────────────────────────────────────────────────
s.supersaw(music, 0, 4, chordAt(0), {cutFrom: 300, cutTo: 900, vel: 0.7, attack: 0.4});
s.supersaw(music, 4, 4, chordAt(4), {cutFrom: 900, cutTo: 1800, vel: 0.8});
s.supersaw(music, 8, 3.5, chordAt(8), {cutFrom: 1200, cutTo: 6000, vel: 0.9, release: 0.02});
for (let b = audio.drop.start; b < audio.drop.end; b += 1) {
  s.supersaw(music, b + 0.5, 0.2, chordAt(b), {cutFrom: 4200, cutTo: 2200, vel: 1.25, release: 0.12, rev: 0.3});
  if (b % 4 === 0) s.supersaw(music, b, 4, chordAt(b), {cutFrom: 1400, cutTo: 2000, vel: 0.5});
}
s.supersaw(music, audio.breakdown.start, 3, chordAt(21), {cutFrom: 700, cutTo: 1200, vel: 0.55});
s.supersaw(music, 24, 2, chordAt(24), {cutFrom: 800, cutTo: 1600, vel: 0.6, release: 0.05});
s.supersaw(music, lastImpact, 3.6, chordAt(lastImpact), {cutFrom: 5000, cutTo: 900, vel: 1.1, release: 0.4, rev: 0.6, attack: 0.005});

// ── Arp (plucks with a dotted-eighth delay) ──────────────────────────────
const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
const arpRun = (from, to, vel, bright) => {
  for (let st = Math.round(from * 4); st < Math.round(to * 4); st++) {
    const b = st / 4;
    const tn = tones(chordAt(b), 69);
    tn.push(tn[0] + 12);
    s.pluck(arp, b, tn[ARP[st % ARP.length]], vel * (st % 4 === 2 ? 1 : 0.75), bright, st % 2 ? 0.45 : -0.45);
  }
};
arpRun(audio.drop.start, audio.drop.end, 1, 5200);
arpRun(audio.breakdown.start, lastImpact, 0.55, 1800);
s.pingPong(arp, 0.75);

// ── Riser, whooshes, suck, impacts ───────────────────────────────────────
s.riser(dry, audio.riser.start, audio.riser.end);
audio.whooshes.forEach((b) => s.whoosh(dry, b));
s.suck(dry, audio.suck.start, audio.suck.end);
audio.impacts.forEach((b) => s.impact(dry, b, b === lastImpact));

// ── Keyboard: one click per character, on the frame the character appears ──
content.terminal.lines.forEach((line, li) => {
  const win = cues.typing[li];
  const times = [];
  for (let k = 1; k <= line.length; k++) times.push(keystrokeFrame(k, win, line.length) / timeline.fps);
  s.typing(dry, times);
  s.enterKey(dry, win.end);
});
s.chime(dry, cues.installed);

// ── Mix ──────────────────────────────────────────────────────────────────
const [wetL, wetR] = s.reverb();
const mix = [new Float32Array(N), new Float32Array(N)];
const silenceA = s.s2i(b2s(audio.silence.start));
const silenceB = s.s2i(b2s(audio.silence.end));
const dcHP = [new s.Biquad().set('hp', 28, 0.7), new s.Biquad().set('hp', 28, 0.7)];
// Section energy: keep the intro and build lower so the drop hits harder.
const energy = (beat) => {
  if (beat < audio.riser.start) return 0.58;
  if (beat < audio.drop.start) return 0.62 + 0.3 * ((beat - audio.riser.start) / (audio.drop.start - audio.riser.start)) ** 2;
  if (beat < audio.drop.end) return 1;
  if (beat < lastImpact) return 0.78;
  return 1;
};
const ENERGY = Float32Array.from({length: N}, (_, i) => energy(i / SR / SPB));
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    let v = (dry[c][i] + (music[c][i] + arp[c][i]) * duck[i]) * ENERGY[i] + (c ? wetR[i] : wetL[i]) * 0.055;
    // The half-beat of silence before the drop: hard gate (tails included).
    if (i >= silenceA && i < silenceB) v *= Math.max(0, 1 - (i - silenceA) / s.s2i(0.025));
    mix[c][i] = dcHP[c].run(v);
  }
}

s.finish({mix, targetLufs: audio.targetLufs, peakDb: audio.peakDb, fadeOut: audio.fadeOut, path: 'public/showreel.wav'});
