/**
 * The shared timeline of the two CANONE videos.
 *
 * Read by the animations (src/canone/**), by the song preparation script
 * (scripts/canone/prepare-songs.mjs) AND by the soundtrack generator (scripts/canone/make-music.mjs):
 * every cut, accent, song excerpt and sound effect lands on the same beat.
 *
 * Units are BEATS: 120 BPM → 1 beat = 0.5 s = 15 frames @ 30 fps. Fractions are fine.
 * Song excerpts (`songs`) say where each piece of "84" / "Celestial Citadel" plays: the visuals of the
 * Zones read the analysis of the song at `at + seconds since from`, the soundtrack plays the same audio.
 * After editing: `npm run canone:songs` (if `songs` changed), then `npm run canone:music`.
 *
 * ⚠ Node runs this file directly: keep it import-free and use only erasable TS syntax.
 */

export const BPM = 120;
export const FPS = 30;
export const SAMPLE_RATE = 48000;

/** Where the excerpts come from (seconds in the full songs). Both videos read the same analysis. */
export const sources = {
  fast: {file: 'songs/fast.mp3', from: 44, to: 116}, // "84": the span exported for the visuals
  calm: {file: 'songs/calm.mp3', from: 176, to: 210}, // "Celestial Citadel"
} as const;

const PUBLIC_FAST = 62.37; // strong hit, energetic all along, a new MZ figure at 64.77
const PUBLIC_CALM = 192.57; // calm, melody and chord changes
const DEV_FAST = 59.37; // a new MZ figure at 64.77, inside "New shape on the first big hit"

export const timelines = {
  // ═════════════════════════════════════════════════════════════════════════
  public: {
    totalBeats: 122, // 61 s
    scenes: {
      question: {start: 0, end: 8},
      problemA: {start: 8, end: 14},
      problemB: {start: 14, end: 20},
      consA: {start: 20, end: 25},
      consB: {start: 25, end: 30},
      name: {start: 30, end: 32},
      value: {start: 32, end: 40},
      basics: {start: 40, end: 50},
      tap: {start: 50, end: 56},
      mz: {start: 56, end: 70},
      cz: {start: 70, end: 84},
      fz: {start: 84, end: 98},
      grid: {start: 98, end: 106},
      vision: {start: 106, end: 116},
      closing: {start: 116, end: 122},
    },
    songs: [
      {song: 'fast', from: 56, to: 62, at: PUBLIC_FAST},
      {song: 'calm', from: 62, to: 70, at: PUBLIC_CALM},
      {song: 'fast', from: 70, to: 76, at: PUBLIC_FAST + 3},
      {song: 'calm', from: 76, to: 84, at: PUBLIC_CALM + 4},
      {song: 'fast', from: 84, to: 90, at: PUBLIC_FAST + 6},
      {song: 'calm', from: 90, to: 98, at: PUBLIC_CALM + 8},
    ],
    cues: {
      questionWords: 0.5,
      callouts: [10, 11.5],
      phones: [15, 16],
      waves: [20.5, 22.5],
      hear: 25.5,
      see: 27.5,
      iris: 28.5,
      nameImpact: 30,
      valueWords: [32, 33, 34, 35],
      valuePulse: 36,
      download: 41,
      downloaded: 43,
      playlists: 44.5,
      offline: 45.5,
      screenOff: 47,
      typing: {tap: {start: 50.5, end: 53}, grid: {start: 99, end: 101.5}},
      zoneLines: [53.5, 54.25, 55],
      fingerTap: 55.5,
      gridBadges: [102, 102.5, 103],
      visionText: 107,
      birdsRise: 109,
      logo: 116,
      closingValue: 117,
      url: 118,
    },
    audio: {
      // Chord changes (beat → chord). E♭ minor ("84") for the tension and the drop,
      // E major ("Celestial Citadel") for the warm ending: a canon, like the app's name.
      chords: [
        {beat: 0, chord: 'Ebm'},
        {beat: 8, chord: 'B'},
        {beat: 14, chord: 'Abm'},
        {beat: 20, chord: 'Ebm'},
        {beat: 24, chord: 'Bb'},
        {beat: 32, chord: 'Ebm'},
        {beat: 34, chord: 'B'},
        {beat: 36, chord: 'Gb'},
        {beat: 38, chord: 'Db'},
        {beat: 40, chord: 'Ebm'},
        {beat: 44, chord: 'B'},
        {beat: 48, chord: 'Gb'},
        {beat: 52, chord: 'Db'},
        {beat: 98, chord: 'E'},
        {beat: 100, chord: 'B'},
        {beat: 102, chord: 'C#m'},
        {beat: 104, chord: 'A'},
        {beat: 106, chord: 'E'},
        {beat: 108, chord: 'B'},
        {beat: 110, chord: 'C#m'},
        {beat: 112, chord: 'G#m'},
        {beat: 114, chord: 'A'},
        {beat: 116, chord: 'E'},
        {beat: 118, chord: 'A'},
        {beat: 119, chord: 'B'},
        {beat: 120, chord: 'E'},
      ],
      tense: {start: 0, end: 24},
      riser: {start: 24, end: 29.5},
      drop: {start: 32, end: 40},
      groove: [{start: 40, end: 56, level: 0.8}, {start: 98, end: 106, level: 1}],
      inside: [] as {start: number; end: number}[],
      airy: {start: 106, end: 122},
      whooshes: [8, 20, 40, 50, 56, 62, 70, 76, 84, 90, 98, 106, 116],
      impacts: [30, 32],
      accents: [10, 11.5, 15, 16],
      chimes: [43, 53.5, 54.25, 55, 102, 102.5, 103],
      taps: [41, 55.5],
      fadeOut: {start: 119, end: 122},
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  dev: {
    totalBeats: 165, // 82.5 s
    scenes: {
      question: {start: 0, end: 8},
      problemA: {start: 8, end: 14},
      problemB: {start: 14, end: 20},
      consA: {start: 20, end: 25},
      consB: {start: 25, end: 30},
      name: {start: 30, end: 32},
      value: {start: 32, end: 40},
      clone: {start: 40, end: 50},
      install: {start: 50, end: 58},
      panel: {start: 58, end: 68},
      key: {start: 68, end: 76},
      users: {start: 76, end: 84},
      upload: {start: 84, end: 94},
      phone: {start: 94, end: 104},
      pipeline: {start: 104, end: 114},
      mzA: {start: 114, end: 121},
      mzB: {start: 121, end: 128},
      czA: {start: 128, end: 135},
      czB: {start: 135, end: 142},
      fzA: {start: 142, end: 149},
      vision: {start: 149, end: 159},
      closing: {start: 159, end: 165},
    },
    songs: [
      {song: 'fast', from: 114, to: 142, at: DEV_FAST},
    ],
    cues: {
      questionWords: 0.5,
      dialog: 9,
      fog: 14.5,
      denyHover: 21,
      lateMarks: [25.5, 26.5, 27.5],
      iris: 28.5,
      nameImpact: 30,
      valueWords: [32, 32.5, 33, 34, 34.5, 35],
      valuePulse: 36,
      typing: {
        clone: {start: 40.5, end: 43},
        install: {start: 50.5, end: 52},
        panel: {start: 58.5, end: 61.5},
        upload: {start: 89.5, end: 91.5},
        pipeline: {start: 106, end: 108},
        cz: {start: 136, end: 138.5},
      },
      cloneDone: 44,
      configDrop: 46,
      installDone: 54,
      appIcon: 55,
      panelReady: 63,
      browser: 64,
      keyDrag: 69.5,
      keyConnected: 72,
      userFields: [77.5, 78.5, 79.5],
      userCreate: 81,
      mp3Drop: 85.5,
      loudness: 92,
      login: 95,
      downloadPhone: 97.5,
      offlinePhone: 100,
      parenOpen: 104,
      pipelineSteps: [108.5, 109.25, 110, 110.75, 111.5],
      manifest: 112,
      figureLabel: 116,
      keySweep: {start: 129, end: 133},
      keyFound: 133.5,
      viterbi: {start: 136, end: 141},
      energyCurves: {start: 143, end: 146},
      fzStats: 146.5,
      parenClose: 147.75,
      visionB: 154,
      logo: 159,
      closingValue: 160,
      url: 161,
    },
    audio: {
      chords: [
        {beat: 0, chord: 'Ebm'},
        {beat: 8, chord: 'B'},
        {beat: 14, chord: 'Abm'},
        {beat: 20, chord: 'Ebm'},
        {beat: 24, chord: 'Bb'},
        {beat: 32, chord: 'Ebm'},
        {beat: 34, chord: 'B'},
        {beat: 36, chord: 'Gb'},
        {beat: 38, chord: 'Db'},
        {beat: 40, chord: 'Ebm'},
        {beat: 44, chord: 'B'},
        {beat: 48, chord: 'Gb'},
        {beat: 52, chord: 'Db'},
        {beat: 56, chord: 'Ebm'},
        {beat: 60, chord: 'B'},
        {beat: 64, chord: 'Gb'},
        {beat: 68, chord: 'Db'},
        {beat: 72, chord: 'Ebm'},
        {beat: 76, chord: 'B'},
        {beat: 80, chord: 'Gb'},
        {beat: 84, chord: 'Db'},
        {beat: 88, chord: 'Ebm'},
        {beat: 92, chord: 'B'},
        {beat: 96, chord: 'Gb'},
        {beat: 100, chord: 'Db'},
        {beat: 104, chord: 'Ebm'},
        {beat: 108, chord: 'B'},
        {beat: 142, chord: 'Ebm'},
        {beat: 144, chord: 'B'},
        {beat: 146, chord: 'Gb'},
        {beat: 148, chord: 'Db'},
        {beat: 149, chord: 'E'},
        {beat: 151, chord: 'B'},
        {beat: 153, chord: 'C#m'},
        {beat: 155, chord: 'G#m'},
        {beat: 157, chord: 'A'},
        {beat: 159, chord: 'E'},
        {beat: 161, chord: 'A'},
        {beat: 162, chord: 'B'},
        {beat: 163, chord: 'E'},
      ],
      tense: {start: 0, end: 24},
      riser: {start: 24, end: 29.5},
      drop: {start: 32, end: 40},
      groove: [{start: 40, end: 104, level: 0.75}],
      inside: [{start: 104, end: 114}, {start: 142, end: 149}],
      airy: {start: 149, end: 165},
      whooshes: [8, 20, 40, 50, 58, 68, 76, 84, 94, 104, 114, 121, 128, 135, 142, 149, 159],
      impacts: [30, 32],
      accents: [9, 21, 25.5, 26.5, 27.5],
      chimes: [44, 54, 63, 72, 81, 92, 100, 112, 133.5],
      taps: [69.5, 81, 85.5, 95, 97.5],
      thumps: [104, 147.75], // the parenthesis opening and closing
      fadeOut: {start: 162, end: 165},
    },
  },
} as const;

export type Timeline = (typeof timelines)['public'] | (typeof timelines)['dev'];
export type SongId = keyof typeof sources;
export type SongExcerpt = {readonly song: SongId; readonly from: number; readonly to: number; readonly at: number};

export const FRAMES_PER_BEAT = (FPS * 60) / BPM; // 15
export const beatToFrame = (beat: number): number => Math.round(beat * FRAMES_PER_BEAT);
export const beatToSeconds = (beat: number): number => (beat * 60) / BPM;

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
