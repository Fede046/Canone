/**
 * Every piece of on-screen text lives here. Edit, then re-render (see video/README.md).
 *
 * Keep words short: each screen must be readable with the sound off.
 * The terminal lines also drive the keyboard-click sound effects, so after
 * changing them run `npm run music` (already included in `npm run render`).
 *
 * ⚠ Node reads this file directly (scripts/make-music.mjs): keep it import-free.
 */
export const content = {
  // 0–2 s · project name, stacked
  name: ['MUSIC', 'PLAYER'],

  // 2–4 s · tagline, one beat per entry
  tagline: [
    {text: 'YOUR MUSIC.', accent: false},
    {text: 'OFFLINE.', accent: true},
    {text: 'ALWAYS', accent: false},
    {text: 'PLAYING.', accent: false},
  ],
  // Fake timestamps on the play bar under "ALWAYS PLAYING."
  playbarTimes: ['1:07', '3:24'],

  // 4–6 s · what it does (one line per beat) + small caption
  build: ['STREAM IT.', 'DOWNLOAD IT.', 'KEEP IT.'],
  buildCaption: 'ANDROID MUSIC PLAYER · KOTLIN · COMPOSE',

  // 6–10.5 s · features (2–3 words each, stacked on two lines)
  features: [
    {index: '01', lines: ['OFFLINE', 'DOWNLOADS'], status: ['↓ 4.8 MB', '✓ SAVED']},
    {index: '02', lines: ['BACKGROUND', 'PLAYBACK'], track: 'Midnight Drive', clock: '9:41'},
    {index: '03', lines: ['PLAYLISTS', '& SHUFFLE'], timer: '29:59'},
  ],

  // 10.5–13 s · terminal
  terminal: {
    title: '~/MusicPlayer',
    prompt: '$',
    lines: [
      'git clone https://github.com/Fede046/MusicPlayer.git',
      'cd MusicPlayer',
      './gradlew installDebug',
    ],
    done: '✓ installed on device',
  },

  // 13–15 s · end card
  outro: {
    wordmark: 'Music Player',
    url: 'github.com/Fede046/MusicPlayer',
  },

  // Corner HUD (small monospace labels)
  hud: {
    topLeft: 'MUSIC PLAYER — REEL',
    sceneLabels: {
      intro: 'INTRO',
      tagline: 'TAGLINE',
      build: 'SIGNAL',
      feature1: 'FEATURE 01',
      feature2: 'FEATURE 02',
      feature3: 'FEATURE 03',
      terminal: 'INSTALL',
      outro: 'END',
    },
  },

  // Real lines from the codebase, used as a drifting background texture.
  codeTexture: [
    'class PlaybackService : MediaSessionService() {',
    'player = ExoPlayer.Builder(this)',
    'mediaSession = MediaSession.Builder(this, player)',
    '@Entity(tableName = "downloaded_songs")',
    'fun observeLocalLibrary(): Flow<List<SongEntity>>',
    'suspend fun downloadSong(song: RemoteSong): Boolean {',
    '@Query("SELECT * FROM playlists ORDER BY name ASC")',
    'fun playQueue(songs: List<SongEntity>, startIndex: Int)',
    'fun setSleepTimer(durationMs: Long) {',
    'fun toggleShuffle() = playerController.toggleShuffle()',
    '@HiltViewModel',
    'val uiState by viewModel.uiState.collectAsStateWithLifecycle()',
    '.combinedClickable(onLongClick = { showDelete = true })',
    '@Query("SELECT * FROM downloaded_songs ORDER BY downloadedAt DESC")',
  ],
} as const;
