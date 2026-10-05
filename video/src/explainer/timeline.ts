/**
 * Shared timeline of the EXPLAINER video (40 s).
 *
 * Read by the animations (src/explainer/**) AND by the soundtrack generator
 * (scripts/make-explainer-music.mjs): every cut, accent and sound effect lands on the same beat.
 *
 * Units are BEATS: 120 BPM → 1 beat = 0.5 s = 15 frames @ 30 fps. Fractions are fine.
 * After editing, run `npm run explainer:music` (or `npm run explainer:render`).
 *
 * ⚠ Node runs this file directly: keep it import-free and use only erasable TS syntax.
 */
export const timeline = {
  bpm: 120,
  fps: 30,
  totalBeats: 80, // 40 s

  // Scene windows [start, end) in beats — the elevator-pitch outline.
  scenes: {
    question: {start: 0, end: 8}, // 0–4 s
    problem: {start: 8, end: 20}, // 4–10 s
    consequences: {start: 20, end: 30}, // 10–15 s
    name: {start: 30, end: 32}, // 15–16 s
    value: {start: 32, end: 40}, // 16–20 s
    step1: {start: 40, end: 48}, // 20–24 s
    step2: {start: 48, end: 57}, // 24–28.5 s
    step3: {start: 57, end: 66}, // 28.5–33 s
    vision: {start: 66, end: 76}, // 33–38 s
    closing: {start: 76, end: 80}, // 38–40 s
  },

  cues: {
    // Question
    questionWords: 0.5, // first word; the rest follow with a slow stagger
    flatline: 4.5, // the music waveform dies on "stop"
    // Problem
    signalBarsOff: [10, 11, 12, 13],
    noSignal: 14,
    noMusic: 16,
    spinnerStop: 18,
    // Consequences
    people: [20, 22, 24],
    vanishLine: 26,
    vanish: 28, // letters of "vanishes" drift away
    iris: 28.5, // the frame closes to black
    // Solution
    nameImpact: 30,
    valueA: 32, // DOWNLOAD ONCE.  (the drop)
    valueB: 34, // LISTEN FOREVER.
    valueBoth: 36,
    // Demo
    stepCaption: 0.25, // beats after each step start
    typing: {
      step1: {start: 41, end: 43},
      step2: {start: 51, end: 54},
      step3: {start: 59.5, end: 62},
    },
    installed: 44,
    tap: 50,
    downloadDone: 52.5,
    highlight2: 55,
    airplane: 58,
    play: 59,
    highlight3: 63,
    // Vision
    places: [66, 68, 70],
    keepsPlaying: 72,
    // Closing
    logo: 76,
    closingValue: 77,
    url: 78,
  },

  audio: {
    sampleRate: 48000,
    // Chord changes (beat → chord). Minor & dark at first, major and warm for the vision.
    chords: [
      {beat: 0, chord: 'Am'},
      {beat: 8, chord: 'F'},
      {beat: 14, chord: 'Dm'},
      {beat: 20, chord: 'Am'},
      {beat: 24, chord: 'Em'},
      {beat: 32, chord: 'Am'},
      {beat: 36, chord: 'F'},
      {beat: 40, chord: 'C'},
      {beat: 44, chord: 'G'},
      {beat: 48, chord: 'Am'},
      {beat: 52, chord: 'F'},
      {beat: 57, chord: 'C'},
      {beat: 61, chord: 'G'},
      {beat: 66, chord: 'C'},
      {beat: 68, chord: 'F'},
      {beat: 70, chord: 'Am'},
      {beat: 72, chord: 'G'},
      {beat: 74, chord: 'F'},
      {beat: 76, chord: 'C'},
    ],
    tense: {start: 0, end: 24}, // minimal: drone, heartbeat, ticks
    riser: {start: 24, end: 29.5},
    silence: {start: 29.5, end: 30},
    drop: {start: 32, end: 40},
    groove: {start: 40, end: 66},
    airy: {start: 66, end: 80},
    whooshes: [8, 20, 40, 48, 57, 66, 76],
    impacts: [30, 32],
    accents: [14, 16], // dull hits on "No signal." / "No music."
    chimes: [44, 55, 63], // success / highlight dings
    fadeOut: {start: 77, end: 80},
    targetLufs: -14,
    peakDb: -2, // sample-peak ceiling; leaves headroom so the true peak stays under -1 dBTP
  },
} as const;

export const FRAMES_PER_BEAT = (timeline.fps * 60) / timeline.bpm; // 15
export const beatToFrame = (beat: number): number => Math.round(beat * FRAMES_PER_BEAT);
export const beatToSeconds = (beat: number): number => (beat * 60) / timeline.bpm;
export const TOTAL_FRAMES = beatToFrame(timeline.totalBeats);

export type SceneName = keyof typeof timeline.scenes;

/** Typing model shared by the code windows and the keyboard-click generator. */
type TypingWindow = {readonly start: number; readonly end: number};
export const typedChars = (frame: number, win: TypingWindow, length: number): number => {
  const s = beatToFrame(win.start);
  const e = beatToFrame(win.end);
  return Math.max(0, Math.min(length, Math.floor((length * (frame - s)) / (e - s))));
};
/** Frame on which character `k` (1-based) appears. */
export const keystrokeFrame = (k: number, win: TypingWindow, length: number): number => {
  const s = beatToFrame(win.start);
  const e = beatToFrame(win.end);
  return s + Math.ceil((k * (e - s)) / length);
};
