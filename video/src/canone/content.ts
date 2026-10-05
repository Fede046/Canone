/**
 * Every piece of on-screen text of the two CANONE videos, in one place.
 *
 *   public — for anyone who listens to music (motivation and impact)
 *   dev    — for developers (setup, admin panel, how the Zones work)
 *
 * Rules: spoken language, short words, at most 10 words per screen,
 * at most 1–2 technical terms per video, explained on the same screen.
 * Code and commands are copied from the repository (file and line in the comment).
 * Mock-ups use placeholder data only: no real users, keys, projects or paths.
 *
 * The code/command strings also drive the keyboard-click sound effects:
 * after changing them run `npm run canone:music` (included in `npm run canone:render`).
 *
 * ⚠ Node reads this file directly (scripts/canone/*.mjs): keep it import-free.
 */

export const brand = {
  name: 'Canone',
  url: 'github.com/Fede046/Canone',
  songs: {
    fast: {title: '84', tag: 'Fast song'},
    calm: {title: 'Celestial Citadel', tag: 'Calm song'},
  },
  zones: {
    mz: {short: 'MZ', name: 'Music Zone'},
    cz: {short: 'CZ', name: 'Circle Zone'},
    fz: {short: 'FZ', name: 'Firewatch Zone'},
  },
} as const;

// The three ZoneButton lines of the player — app/…/ui/player/PlayerScreen.kt:264-266
const zoneButtons = {
  file: 'PlayerScreen.kt',
  firstLine: 264,
  lines: [
    'ZoneButton("MZ", "Music Zone", activeZone == Zone.MUSIC) { onOpenZone(Zone.MUSIC) }',
    'ZoneButton("CZ", "Circle Zone", activeZone == Zone.CIRCLE) { onOpenZone(Zone.CIRCLE) }',
    'ZoneButton("FZ", "Firewatch Zone", activeZone == Zone.FIRE) { onOpenZone(Zone.FIRE) }',
  ],
} as const;

// Key, chords and tempo, once per song — app/…/playback/analysis/HarmonyResult.kt:165-167
const deriveLines = {
  file: 'HarmonyResult.kt',
  firstLine: 165,
  lines: ['val key = detectKey(full)', 'val chords = detectChords(full, chroma[BASS], key)', 'val (bpm, firstBeat) = detectTempo(raw)'],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC — value phrase: "See what you hear."
// ═══════════════════════════════════════════════════════════════════════════
export const publicContent = {
  // 1 · Opening question
  question: {text: 'What does your phone show while music plays?', highlight: 'show'},

  // 2 · Problem
  problem: {
    a: {text: 'A cover. A progress bar.', callouts: ['cover', 'progress bar']},
    b: {text: 'Same screen, every song.'},
  },

  // 3 · Consequences
  consequences: {
    a: {text: 'Fast song. Calm song.'},
    b: {text: 'You hear the difference. You never see it.', bright: 'hear', dim: 'see'},
  },

  // 4 · Solution
  value: ['See', 'what', 'you', 'hear.'],

  // 5 · How it works
  basics: {
    step: '1',
    caption: 'Download once. Playlists, offline, even with the screen off.',
    labels: {offline: 'Offline', playlists: 'Playlists', background: 'Screen off'},
    library: ['Midnight Drive', 'Golden Hour', 'Northbound', 'Paper Moons'],
    playlists: ['Night run', 'Sunday', 'Focus'],
    nowPlaying: {title: 'Midnight Drive', artist: 'Demo Artist'},
  },
  tap: {step: '2', caption: 'Then tap MZ, CZ or FZ.', code: zoneButtons},
  zones: {
    mz: {caption: 'A shape that moves with the music.'},
    cz: {caption: "The song's notes and chords, on a wheel."},
    fz: {caption: 'The sky follows your clock. Birds follow the song.'},
  },
  grid: {step: '3', caption: 'It studies each song once, on your phone.', code: deriveLines},

  // 6 · Vision
  vision: {text: 'Every song becomes its own world.'},
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DEV — value phrase: "Know every beat before it plays."
// Technical terms: "Visualizer" (Android's built-in one) and "permission".
// ═══════════════════════════════════════════════════════════════════════════
export const devContent = {
  // 1 · Opening question
  question: {text: 'Ever tried to visualize music on Android?', highlight: 'Android?'},

  // 2 · Problem
  problem: {
    a: {text: 'The built-in Visualizer needs microphone permission.', highlight: 'microphone'},
    b: {text: 'And it only hears the present.', highlight: 'present.'},
    dialog: {title: 'Allow app to record audio?', deny: 'Deny', allow: 'Allow'},
  },

  // 3 · Consequences
  consequences: {
    a: {text: 'Users see a scary permission prompt.'},
    b: {text: 'Visuals land after the beat, never on it.', highlight: 'after'},
    lateLabel: 'late',
  },

  // 4 · Solution
  value: ['Know', 'every', 'beat', 'before', 'it', 'plays.'],

  // 5a · Setup — real commands, placeholder data
  setupLabel: 'SETUP',
  setup: {
    clone: {
      step: '1',
      caption: 'Clone it. Add your Firebase config file.',
      prompt: '~ $',
      command: 'git clone https://github.com/Fede046/Canone.git',
      output: ["Cloning into 'Canone'...", 'done.'],
      tree: ['Canone/', 'app/', 'google-services.json', 'tools/admin-panel/', 'video/'],
      configFile: 'google-services.json',
      configNote: 'from your Firebase project',
    },
    install: {
      step: '2',
      caption: 'Build and install on your phone.',
      prompt: '~/Canone $',
      command: './gradlew installDebug',
      output: ['> Task :app:installDebug', 'Installed on 1 device.', 'BUILD SUCCESSFUL'],
    },
    panel: {
      step: '3',
      caption: 'Start the admin panel. It runs on your computer.',
      prompt: '~/Canone $',
      commands: ['cd tools/admin-panel', 'npm install', 'npm start'],
      // Real log line — tools/admin-panel/server.js:1087
      output: 'Pannello attivo su http://127.0.0.1:3002',
      needs: 'needs Node.js + ffmpeg',
      url: '127.0.0.1:3002',
    },
    // Admin panel mock-up: real (Italian) labels from tools/admin-panel/public/index.html, fake data
    panelUi: {
      title: 'Pannello di Amministrazione',
      tabs: ['Catalogo', 'Utenti', 'Impostazioni'],
    },
    key: {
      step: '4',
      caption: 'Settings: drop in your Firebase key.',
      section: 'Connessione Firebase',
      file: 'firebase-key.json',
      button: 'Salva chiave',
      status: 'Connesso',
      project: 'my-project',
      note: 'saved in .secrets/, never in git',
    },
    users: {
      step: '5',
      caption: 'Users: create a login with a daily limit.',
      fields: [
        {label: 'Username', value: 'demo'},
        {label: 'Password', value: '••••••••'},
        {label: 'Limite giornaliero', value: '5'},
      ],
      button: 'Crea utente',
      note: 'password hashed in the browser',
    },
    upload: {
      step: '6',
      caption: 'Catalog: upload an MP3. Loudness is evened out.',
      drop: 'Trascina l’mp3 qui',
      file: 'midnight-drive.mp3',
      fields: [
        {label: 'Titolo', value: 'Midnight Drive'},
        {label: 'Artista', value: 'Demo Artist'},
      ],
      button: 'Carica su Firebase',
      // Real line — tools/admin-panel/server.js:185
      code: {file: 'server.js', firstLine: 185, lines: ["const LOUDNORM_TARGET = 'I=-14:TP=-1.5:LRA=11';"]},
      meter: ['−23 LUFS', '−14 LUFS'],
    },
    phone: {
      step: '7',
      caption: 'On the phone: log in, download, play offline.',
      login: {user: 'demo', button: 'Accedi'},
      quota: '4 / 5 today',
      songs: ['Midnight Drive', 'Golden Hour', 'Northbound'],
    },
  },

  // 5b · The parenthesis: how the Zones work
  zonesLabel: 'How the Zones work',
  pipeline: {
    caption: 'Read the file faster than it plays. Save once.',
    steps: ['song.mp3', 'MediaCodec', 'mono samples', 'FFT', 'bytes on disk'],
    // Real line — app/…/playback/analysis/MonoDecoder.kt:42
    code: {file: 'MonoDecoder.kt', firstLine: 42, lines: ['val codec = MediaCodec.createDecoderByType(mime).apply {']},
    // Real permissions — app/src/main/AndroidManifest.xml:4-7
    manifest: ['INTERNET', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'POST_NOTIFICATIONS'],
    noMic: 'no RECORD_AUDIO',
  },
  mz: {
    a: {caption: 'MZ: one curve, exactly symmetric. The music bends it.'},
    b: {caption: 'New shape on the first big hit after 8 s.'},
    // Real formula — app/…/ui/musiczone/CanonVisualizer.kt:49
    formula: 'z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s)',
    params: [
      {name: 'a', from: 'mids'},
      {name: 'b', from: 'highs'},
      {name: 'r', from: 'bass'},
    ],
    sequence: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4],
    hit: 'big hit',
  },
  cz: {
    a: {caption: 'CZ: match the notes against 24 key profiles.'},
    b: {caption: 'Chords: the smoothest path wins. No flicker.'},
    code: deriveLines,
    keyLabel: 'best match',
  },
  fz: {
    a: {caption: 'FZ: volume, brightness and hits become one energy.'},
    signals: ['volume', 'brightness', 'hits'],
    states: ['calm', 'middle', 'energetic'],
    // Measured by the app on the two songs (same numbers as .agent/report/T26.md)
    stat: {fast: 'energetic 64% of the time', calm: 'never energetic'},
  },

  // 6 · Vision
  vision: {a: 'Runs on the phone. No permission. No lag.', b: "Visuals that know what's coming."},
} as const;

export type Audience = 'public' | 'dev';
