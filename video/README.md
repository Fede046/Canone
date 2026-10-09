# Canone — videos

Motion-graphics videos of the app, built with [Remotion](https://www.remotion.dev). Every soundtrack
is synthesised from code (pure Node, no external services) and every video has a single timeline
shared by the animations and the audio script, so cuts, accents and sound effects land on the beat
(120 BPM = one beat every 15 frames at 30 fps). All on-screen text is English and lives in one file per video.

| Composition | Size | Output | What |
|---|---|---|---|
| `Canone-Public-Horizontal` | 1920×1080 | `out/canone-public-horizontal.mp4` | **Canone for everyone** (61 s) — README / YouTube |
| `Canone-Public-Vertical` | 1080×1920 | `out/canone-public-vertical.mp4` | same, social |
| `Canone-Dev-Horizontal` | 1920×1080 | `out/canone-dev-horizontal.mp4` | **Canone for developers** (82 s) — README / YouTube |
| `Canone-Dev-Vertical` | 1080×1920 | `out/canone-dev-vertical.mp4` | same, social |
| `Explainer-Horizontal` / `-Vertical` | | `out/explainer-*.mp4` | older 40 s explainer, from before the rename (“Music Player”) |
| `Showreel-Horizontal` / `-Vertical` / `-GIF` | | `out/showreel-*` | older 15 s teaser, from before the rename |
| `Canone-Thumbnail` | 1280×720 | `out/canone-thumbnail.png` | YouTube thumbnail of the developer video (still: `npx remotion still Canone-Thumbnail out/canone-thumbnail.png`) |
| `Canone-ZonesTest` | 1920×1080 | — | development aid: the three Zones, fast and calm song, side by side |

All MP4s are H.264 + AAC, soundtrack at −14 LUFS with a clean fade-out.

The rendered files in `out/` are not in git (they are too heavy): render them yourself, or watch them from the main [README](../README.md) (GitHub player and YouTube).

## Setup (once)

```bash
cd video
npm install
```

Needs Node 22.18+ (the scripts import the `.ts` timeline and content files directly) and `ffmpeg` on PATH
(it decodes the songs; also used for the old GIF).

## Preview (Remotion Studio)

```bash
npm run canone:studio
```

Regenerates both Canone soundtracks, then opens Remotion Studio at http://localhost:3000: pick a
`Canone-*` composition on the left, press space to play, scrub the timeline. `npm run studio`
does the same for the older explainer and showreel. If the songs are not in `songs/` (see below),
start the Studio with `npx remotion studio`: it uses the soundtracks already in `public/canone/`.

---

## The Canone videos

Both follow an elevator pitch: question → problem → consequences (cold, near-black, slow) · the name
and the value phrase on the drop (the strongest moment, back again at the end) · how it works with
real code and commands from the repository · vision (a warm violet-to-rose dawn) · logo and URL.

| | Public | Developers |
|---|---|---|
| Value phrase | **See what you hear.** | **Know every beat before it plays.** |
| How it works | ① download once (offline, playlists, screen off) ② tap MZ, CZ or FZ (`PlayerScreen.kt`) — each Zone with a fast song and a calm one ③ it studies each song once (`HarmonyResult.kt`) | SETUP: clone + `google-services.json`, `./gradlew installDebug`, admin panel (`npm start`), Firebase key, users, MP3 upload with loudness evened out, log in on the phone · then the parenthesis **( How the Zones work )**: decoding with `MediaCodec` (no `RECORD_AUDIO`), the MZ curve, key profiles and Viterbi chords for CZ, one energy curve per song for FZ (84 energetic 64% of the time, Citadel never) |

### The songs

The Zones in the videos are driven by the real analysis of two songs, **84** (fast) and
**Celestial Citadel** (calm), computed with a Node port of the app's own algorithm
(`scripts/canone/analysis.mjs`: same bands, thresholds, key profiles, Viterbi path, energy states as
`app/…/playback/analysis/*.kt`; it reproduces the app's measurements: 84 energetic 64% of the time, Citadel never).
Short excerpts of the songs play during the Zones.

The full songs are **not** in the repository: to regenerate the analysis or the soundtracks, copy them to

```
video/songs/fast.mp3   ("84")
video/songs/calm.mp3   ("Celestial Citadel")
```

(`songs/` is git-ignored). Everything else needed to render is in the project: the analysis
(`src/canone/data/*.json`) and the finished soundtracks (`public/canone/*.wav`).

The forest of the Firewatch Zone is redrawn as original vector art: the app's reference picture is not used.
Covers, users, keys and projects shown in the mock-ups are placeholders.

### Files

| File | What |
|---|---|
| `src/canone/content.ts` | **every on-screen text of both videos**, with the real code and commands (file and line noted) |
| `src/canone/timeline.ts` | **the shared timeline**: scenes, beat cues, typing windows, chords, audio sections, SFX, song excerpts |
| `src/canone/scenes/*.tsx` | the scenes: `Cold`, `Reveal` (name + value phrase), `PublicDemo`, `DevSetup`, `DevZones`, `Warm` (vision + closing) |
| `src/canone/zones/*.tsx` | the three Zones redrawn from the app's code (`MusicZone`, `CircleZone`, `ForestZone`) and their data accessors |
| `src/canone/kit.tsx`, `ui.tsx`, `theme.ts` | kinetic type, code windows, phone, admin panel mock-ups, black and purple palette |
| `scripts/canone/prepare-songs.mjs` | analyses the songs → `src/canone/data/songs.json` |
| `scripts/canone/make-music.mjs` | the soundtracks → `public/canone/public.wav`, `public/canone/dev.wav` |
| `scripts/canone/analyze-soundtrack.mjs` | analyses the soundtracks (the MZ figure behind the value phrase reacts to the music you hear) → `src/canone/data/soundtrack.json` |

### Commands

```bash
npm run canone:render              # soundtracks + all four MP4s
npm run canone:music               # both soundtracks + their analysis only (~30 s)
npm run canone:songs               # re-analyse the songs (only if the songs or `sources` change)
npm run canone:public:horizontal   # one output at a time (the soundtrack must exist)
npm run canone:public:vertical
npm run canone:dev:horizontal
npm run canone:dev:vertical
```

### After a change

- **Text only** (`content.ts`, not the code lines) → render again.
- **Code or command lines, timeline, cues, chords** → `npm run canone:music` first (`canone:render` does it),
  so key clicks, whooshes and accents stay on the frames where things happen.
- **Which part of a song plays** (`songs` / `sources` in `timeline.ts`) → `npm run canone:songs`, then `canone:music`.
- Visuals only (scenes, colours) → render again.

---

## Older videos (before the rename)

### Explainer (40 s, non-technical audience) — “Download once. Listen forever.”

| File | What |
|---|---|
| `src/explainer/content.ts` | every on-screen text, the command and the code shown in the demo |
| `src/explainer/timeline.ts` | the shared timeline |
| `src/explainer/scenes/*.tsx` | the scenes (Cold, Solution, Demo, Warm) |
| `scripts/make-explainer-music.mjs` | the soundtrack → `public/explainer.wav` |

```bash
npm run explainer:render       # music + both MP4s
npm run explainer:music        # public/explainer.wav only
npm run explainer:horizontal   # one output at a time (music must exist)
npm run explainer:vertical
```

### Showreel (15 s teaser, concept “ONE LINE”)

| File | What |
|---|---|
| `src/content.ts` | every on-screen text, terminal lines, code texture |
| `src/timeline.ts` | the shared timeline |
| `src/scenes/*.tsx` | the scenes |
| `scripts/make-music.mjs` | the soundtrack → `public/showreel.wav` |

```bash
npm run render              # music + both MP4s + GIF (~25 min with motion blur)
npm run music               # public/showreel.wav only
npm run render:vertical     # one output at a time (music must exist)
npm run render:horizontal
npm run render:gif          # if the GIF grows past 10 MB: node scripts/make-gif.mjs 800 12
```

For the showreel in the Studio, turn `motionBlur` off in the props panel for smooth playback.

---

The synthesiser shared by all soundtracks lives in `scripts/lib/synth.mjs`
(drums, bass, pads, plucks, bells, riser, whooshes, impacts, key clicks, reverb,
EBU R128 loudness normalisation to −14 LUFS, limiter, WAV writer).
