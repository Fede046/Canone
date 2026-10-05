/**
 * Every piece of on-screen text of the EXPLAINER video. Audience: non-technical.
 *
 * Rules: spoken language, short words, max 10 words per screen,
 * one technical term only ("offline"), explained on the same screen.
 *
 * The code/command strings also drive the keyboard-click sound effects:
 * after changing them run `npm run explainer:music` (included in `npm run explainer:render`).
 *
 * ⚠ Node reads this file directly (scripts/make-explainer-music.mjs): keep it import-free.
 */
export const content = {
  // 1 · Opening question (0–4 s)
  question: {text: 'Ever had your music stop in a tunnel?', highlight: 'stop'},

  // 2 · Problem (4–10 s)
  problem: {
    line: 'Most music apps need internet for every song.',
    highlight: 'internet',
    noSignal: 'No signal.',
    noMusic: 'No music.',
  },

  // 3 · Consequences (10–15 s)
  consequences: {
    people: ['Commuters.', 'Travelers.', 'Anyone on a small data plan.'],
    line: 'Their music vanishes when they need it most.',
    vanishWord: 'vanishes',
  },

  // 4 · Solution (15–20 s)
  name: 'Music Player',
  value: ['Download once.', 'Listen forever.'], // the value phrase — also returns at the end

  // 5 · How it works (20–33 s) — real command and real code from the repository
  steps: [
    {
      caption: 'Install the app with one command.',
      terminal: {title: 'Terminal', prompt: '$', command: './gradlew installDebug', done: '✓ Installed on your phone'},
    },
    {
      caption: "Tap a song. It's saved on your phone.",
      editor: {
        file: 'SongRepository.kt',
        lines: [
          'suspend fun downloadSong(song: RemoteSong): Boolean {',
          '    val songId = song.id',
          '    …',
          '    val audioDest = audioFile(songId)',
          '    val coverDest = coverFile(songId)',
        ],
        highlightLines: [3, 4], // 0-based
      },
      demoSongs: ['Midnight Drive', 'Golden Hour', 'Northbound'],
    },
    {
      caption: 'Play it offline — no internet needed.',
      editor: {
        file: 'SongDao.kt',
        lines: ['@Query("SELECT * FROM downloaded_songs ORDER BY downloadedAt DESC")', 'fun observeAll(): Flow<List<SongEntity>>'],
        highlightLines: [0],
        highlightToken: 'downloaded_songs',
      },
      nowPlaying: 'Midnight Drive',
    },
  ],

  // 6 · Vision (33–38 s)
  vision: {places: ['Flights.', 'Tunnels.', 'Mountain trails.'], line: 'Your music keeps playing.'},

  // 7 · Closing (38–40 s)
  url: 'github.com/Fede046/MusicPlayer',
} as const;
