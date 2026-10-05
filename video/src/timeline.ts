/**
 * THE shared timeline.
 *
 * Both the animations (src/**) and the soundtrack generator (scripts/make-music.mjs)
 * read this file, so every cut, accent and sound effect lands on the same beat.
 *
 * Units are BEATS: 120 BPM → 1 beat = 0.5 s = 15 frames @ 30 fps. Fractions are fine.
 * Change a value, then run `npm run music` (or `npm run render`) to regenerate the audio.
 *
 * ⚠ Node runs this file directly: keep it import-free and use only erasable TS syntax
 *   (no enums / namespaces).
 */
export const timeline = {
  bpm: 120,
  fps: 30,
  totalBeats: 30, // 15 s

  // Scene windows [start, end) in beats.
  scenes: {
    intro: {start: 0, end: 4},
    tagline: {start: 4, end: 8},
    build: {start: 8, end: 12},
    feature1: {start: 12, end: 15},
    feature2: {start: 15, end: 18},
    feature3: {start: 18, end: 21},
    terminal: {start: 21, end: 26},
    outro: {start: 25.5, end: 30}, // overlaps the terminal: the line spirals into the logo
  },

  // Visual cues (absolute beats).
  cues: {
    lineDraw: 0,
    nameMusic: 1,
    namePlayer: 2,
    namePunch: 3,
    taglineWords: [4, 5, 6, 7],
    buildWords: [8, 9, 10],
    buildPush: 11,
    freeze: 11.5, // half-beat of silence before the drop
    drop: 12,
    playToggle: 16,
    shuffles: [19, 20],
    // One typing window per terminal line. Keyboard clicks are generated from these.
    typing: [
      {start: 21.5, end: 23},
      {start: 23.25, end: 24},
      {start: 24.25, end: 25},
    ],
    installed: 25,
    spiral: 25.5,
    logoImpact: 26,
    wordmark: 27,
    url: 28,
    // Slit-mask transitions between scenes.
    slits: [15, 18, 21],
    // Small camera "punches" on accents.
    punches: [3, 5, 6, 7, 9, 10, 13, 14, 16, 17, 19, 20, 23, 24, 25, 27, 28],
  },

  audio: {
    sampleRate: 48000,
    key: 'A minor',
    // One chord per bar (4 beats). Bar 2 is the build, bar 3 is the drop.
    chords: ['Am', 'F', 'G', 'Am', 'F', 'C', 'G', 'Am'],
    riser: {start: 8, end: 11.5},
    silence: {start: 11.5, end: 12},
    drop: {start: 12, end: 21},
    breakdown: {start: 21, end: 26},
    whooshes: [4, 8, 15, 18, 21],
    suck: {start: 24.5, end: 26}, // reverse swell into the logo impact
    impacts: [12, 26],
    fadeOut: {start: 28, end: 30},
    targetLufs: -14, // social platforms normalise to about -14 LUFS
    peakDb: -1,
  },
} as const;

export const FRAMES_PER_BEAT = (timeline.fps * 60) / timeline.bpm; // 15
export const beatToFrame = (beat: number): number => Math.round(beat * FRAMES_PER_BEAT);
export const beatToSeconds = (beat: number): number => (beat * 60) / timeline.bpm;
export const TOTAL_FRAMES = beatToFrame(timeline.totalBeats);

export type SceneName = keyof typeof timeline.scenes;

/**
 * Typing model shared by the terminal animation and the keyboard-click generator:
 * a line of `length` chars is typed linearly across its typing window.
 */
type TypingWindow = {readonly start: number; readonly end: number};
export const typedChars = (frame: number, win: TypingWindow, length: number): number => {
  const s = beatToFrame(win.start);
  const e = beatToFrame(win.end);
  return Math.max(0, Math.min(length, Math.floor((length * (frame - s)) / (e - s))));
};
/** Frame on which character `k` (1-based) of the line appears. */
export const keystrokeFrame = (k: number, win: TypingWindow, length: number): number => {
  const s = beatToFrame(win.start);
  const e = beatToFrame(win.end);
  return s + Math.ceil((k * (e - s)) / length);
};
