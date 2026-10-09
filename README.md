# 🎵 Canone

[![Android](https://img.shields.io/badge/Android-34-3DDC84?logo=android&logoColor=white)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9.24-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Jetpack Compose](https://img.shields.io/badge/Compose-BOM%202024.06-4285F4?logo=jetpackcompose&logoColor=white)](https://developer.android.com/compose)
[![Media3](https://img.shields.io/badge/Media3-1.4.0-A855F7)](https://developer.android.com/media/media3)
[![Min SDK](https://img.shields.io/badge/minSdk-26-FF6D00?logo=android)](https://developer.android.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Spotify-style Android music app, black and purple, written in **Kotlin** with **Jetpack Compose**.
Sign in with the account created in the admin panel, download the songs of your Firebase catalog to listen offline forever, organize them into playlists and **watch them play**: three full-screen *Zones* (**MZ**, **CZ**, **FZ**) analyze every song directly on the phone and turn it into visuals.

<!-- Video "For everyone": replace the line below with the link GitHub creates when you upload canone-public-github.mp4 -->
https://github.com/user-attachments/assets/f7961929-776c-4a89-9d31-8fb26aeb7bd0



> The app's interface is in Italian; in this README the Italian labels are given in *italics* next to their English meaning.

---

## 🎬 Videos

- **For everyone** — *See what you hear.* (61 s): the video at the top of this page
- **For developers** — *Know every beat before it plays.* (82 s): setup, admin panel, how the Zones work

[![Canone for developers — Know every beat before it plays](https://img.youtube.com/vi/wQ7tEq2HEVA/maxresdefault.jpg)](https://youtu.be/wQ7tEq2HEVA)

The videos are made with [Remotion](https://www.remotion.dev) in the [`video/`](video/README.md) folder, with a soundtrack synthesized in code and excerpts from two original songs by the author, "84" and "Celestial Citadel". The Zones you see are driven by the real analysis of these two songs, computed with the same algorithm as the app.

## ✨ Features

- 🔐 **Sign-in** — username and password created in the admin panel; each user has their own catalog and a daily download limit
- 🗂️ **Browse** (*Sfoglia*) — the user's online catalog, with search and an artist filter; a local copy makes it available instantly at startup
- ⬇️ **Permanent download** — audio and cover art stay on the phone: you can listen without a connection
- 📚 **Library** (*Libreria*) — search, artist filter and a long-press menu: add to playlist, edit title and artist (on the phone only), delete from the phone
- 🎶 **Playlists** — each with its own color, created from a song's menu, from the player or from the Playlists screen
- ▶️ **Background playback** — notification with controls, shuffle, repeat (song or queue), sleep timer (Media3 / ExoPlayer)
- 🌌 **Music Zone (MZ)** — a perfectly symmetric curve, from 3 to 8 lobes, that breathes with the music; colors from the cover art and a different nebula for every song
- 🎡 **Circle Zone (CZ)** — key, chords, tempo and three voices estimated from the audio, drawn on a wheel of heptagons (one per octave), with the melody echoed in canon
- 🌲 **Firewatch Zone (FZ)** — a lookout tower in the woods: the sky follows the phone's clock, the flocks of birds follow the song's energy
- ⚙️ **Settings** — how long the screen stays on in the Zones: like the phone, always while music is playing, or 5–60 minutes after the last touch
- ❓ Built-in **guide** (“?” button) covering every feature
- 🎨 Always-dark theme, black and purple; treble clef icon
- 📱 Android 8.0+ (minSdk 26)

## 🧠 How the Zones work

The Zones don't use Android's `Visualizer` (which needs the microphone permission and only hears the present instant): they **read the downloaded file** with `MediaExtractor` + `MediaCodec`, downmix it to mono and analyze it in the background, much faster than playback. The app never asks for `RECORD_AUDIO`.

- **MZ** — 1024-point FFT, energy of 6 bands 30 times per second, stored as bytes. The figure is `z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s)`: the mids drive `a`, the highs `b`, the bass the breathing, while the order-`k` symmetry stays exact. `k` follows 3-4-5-6-7-8-7-6-5-4 and changes on the first strong beat after at least 8 seconds.
- **CZ** — energy of the 72 semitones from E1 to D♯7; the key is the one among the 24 Krumhansl-Kessler profiles with the highest correlation, the chords are the best path (Viterbi) through the triads, with a cost for every change so they don't flicker; the tempo comes from the autocorrelation of the onsets.
- **FZ** — loudness, brightness, density of strong beats and internal dynamics become a single energy curve with three states (calm, medium, energetic), with hysteresis and a minimum dwell time; the scene reads it **2 seconds ahead**, so the flocks arrive together with the chorus.

Each analysis runs once per song and is cached in `filesDir`; at every startup `AnalysisCacheCleaner` deletes the caches of songs no longer in the library.

## 🛠️ Tech stack

| Category | Technology |
|-----------|-----------|
| **Language** | Kotlin 1.9.24 |
| **UI** | Jetpack Compose (BOM 2024.06) + Material Design 3 |
| **Local database** | Room 2.6.1 (downloaded songs, cached catalog, playlists) |
| **Backend** | Firebase Firestore + Firebase Storage |
| **Playback** | Media3 1.4.0 (ExoPlayer + MediaSession) |
| **Audio analysis** | `MediaExtractor` / `MediaCodec` + custom FFT (`playback/analysis`) |
| **Zone colors** | AndroidX Palette |
| **DI** | Dagger Hilt 2.51.1 |
| **Downloads** | Coroutines + Firebase Storage |
| **Cover art** | Coil 2.6.0 |
| **Navigation** | Navigation Compose |
| **Admin panel** | Node.js + Express + firebase-admin, ffmpeg |
| **Videos** | Remotion |

## 📋 Requirements

- Android Studio **Koala** (2024.1.1) or later, JDK **17**
- A Firebase project with **Firestore** and **Storage**
- For the admin panel: **Node.js** (tested with 24.12) and **ffmpeg** on the `PATH` (see its [README](tools/admin-panel/README.md), in Italian)

## 🚀 Setup

### 1️⃣ Firebase and app

1. In the [Firebase Console](https://console.firebase.google.com) create a project (or use an existing one) and enable **Firestore Database** and **Storage**
2. Add an **Android** app with package `com.example.musicplayer`
3. Download `google-services.json` and copy it to `app/google-services.json`

   > ⚠️ **Important:** this file is not in the repository. Everyone uses the one from their own Firebase project.

### 2️⃣ Admin panel

The catalog and the users are managed from the local panel in [`tools/admin-panel/`](tools/admin-panel/README.md):

```powershell
cd tools/admin-panel
npm install
npm start
```

Open http://127.0.0.1:3002 (the panel only listens on your own computer), then:

1. **Settings** (*Impostazioni*) → upload the Firebase service account key (Project settings → Service accounts → Generate new private key). It is saved in `tools/admin-panel/.secrets/`, excluded from git: never share it
2. **Users** (*Utenti*) → create a user with username, password and daily download limit
3. **Catalog** (*Catalogo*) → upload MP3s for that user, with optional cover art. Every song is brought to the same perceived loudness (−14 LUFS) with ffmpeg before uploading

### 3️⃣ Run the app

Open the project in Android Studio (**File → Open**), let Gradle sync and run it on an Android 8.0+ device or emulator, or from a terminal:

```bash
./gradlew installDebug
```

In the app open **Browse** (*Sfoglia*) and sign in with the user created in the panel.

### Data on Firebase (written by the panel)

```
songs/{songId}
  title, artist
  duration          // milliseconds
  storagePath       // e.g. "songs/<id>.mp3"
  coverUrl          // download URL of the cover art (empty if there is none)
  fileSizeBytes
  userName          // owner: a user's catalog is the set of songs with their username

users/{userId}
  username
  passwordHash      // hex SHA-256, computed in the browser by the panel
  dailyDownloadLimit, downloadedToday, lastDownloadDate ("yyyy-MM-dd")

Storage: songs/<id>.mp3, covers/<id>.jpg
```

### Security rules

The rules are in [`firebase/firestore.rules`](firebase/firestore.rules) and [`firebase/storage.rules`](firebase/storage.rules): copy them into the Firebase Console (**Firestore Database → Rules** and **Storage → Rules**) and click **Publish**.

- **Firestore:** the app can read songs, look up a user by username (one document at a time) and update only `downloadedToday` and `lastDownloadDate`. Username, password and daily limit can only be changed from the panel.
- **Storage:** the app can download files one by one; nobody can list, upload or delete them from the phone.
- The panel uses the Admin SDK, which bypasses these rules.

> ⚠️ Without Firebase Auth the rules don't know who is asking: anyone who knows the project can still read a user (including the password hash) and reset their own download counter. For use with other people you need Firebase Auth and App Check (see future extensions).

## 📁 Project structure

```
app/src/main/java/com/example/musicplayer/
├── data/
│   ├── remote/            # RemoteSong, RemoteUser, RemoteSongRepository (Firestore + Storage)
│   ├── local/             # Room: downloaded songs, cached catalog, playlists (AppDatabase, version 6)
│   └── repository/        # SongRepository (downloads, catalog, library), UserRepository (sign-in, daily limit)
├── playback/
│   ├── PlaybackService.kt # MediaSessionService + ExoPlayer
│   ├── controller/        # PlayerController (UI ↔ service bridge via MediaController)
│   └── analysis/          # MonoDecoder, Fft, AudioAnalyzer (MZ), HarmonyAnalyzer + HarmonyResult (CZ),
│                          # EnergyTimeline (FZ), AnalysisCacheCleaner
├── ui/
│   ├── catalog/           # Browse: sign-in, catalog, downloads
│   ├── library/           # Library
│   ├── playlist/          # playlist list and detail
│   ├── player/            # mini player and player
│   ├── musiczone/         # MZ: CanonVisualizer, NebulaBackground, CoverPalette
│   ├── circlezone/        # CZ: CircleWheel, WheelLayout, NoteSpeller, CircleHud
│   ├── firewatch/         # FZ: FirewatchScene, FirewatchSky, FirewatchWorld
│   ├── zone/              # ZoneMode, ZoneChrome, ZoneSettings (shared by the three Zones)
│   ├── components/        # SongItem, ArtistFilter, song menus and dialogs, MarqueeText
│   ├── settings/, help/   # Settings and Guide
│   └── theme/             # black and purple theme
├── navigation/            # NavGraph (bottom bar, mini player)
├── di/                    # AppModule (Hilt: Firebase, Room)
├── MainActivity.kt
└── MusicApp.kt            # Application @HiltAndroidApp

tools/admin-panel/         # local panel (Express) for catalog, users and Firebase key
firebase/                  # Firestore and Storage security rules
video/                     # project videos (Remotion)
```

## 🔍 Implementation notes

- A **download** first checks the daily limit, then fetches the audio and the cover art and saves the row in Room; on error, partial files are deleted
- The **Library** reads only from Room via `Flow`, so it works 100% offline
- A **long press** on a song opens its actions menu; editing title and artist stays on the phone and the song still counts as downloaded
- **Background playback** is handled by `PlaybackService` (MediaSessionService), which exposes Media3's media notification
- The `POST_NOTIFICATIONS` permission is requested at runtime from Android 13; the microphone is not needed
- The visible name is **Canone**, but the identifier is still `com.example.musicplayer`, so that the library and playlists already on the phone are not lost (it only needs to change for a Play Store release)

## 🚧 Possible future extensions

### 🔐 Security
Move to Firebase Auth instead of the unsalted SHA-256 hash, with Firestore and Storage security rules that let each user read only their own data. Move the download limit to the server (today it is enforced only by the app) and add App Check to prevent abuse.

### 🎚️ Audio equalizer
Add a multi-band graphic equalizer with presets (Pop, Rock, Jazz, Classical…), separate bass and treble controls and extra effects (reverb, virtualizer, bass boost) through Android's AudioEffects API.

### 🎶 Recommendations
Use the key, tempo and energy already computed by the Zones to suggest the best next song (“you might also like…”) or to build mood-based playlists.

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m "Add new feature"`)
4. Push the branch (`git push origin feature/new-feature`)
5. Open a **Pull Request**

## 📄 License

This project is released under the **MIT** license. See the [LICENSE](LICENSE) file for details.

**Credits:** the treble clef in the icon is the `music-clef-treble` path from [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0).

**Songs in the videos:** "84" and "Celestial Citadel", whose excerpts can be heard in the videos and in the audio files in `video/public/canone/`, are original compositions by Federico, © all rights reserved. **They are not covered by the MIT license**: they may not be reused, redistributed or modified without permission.

---

<p align="center">
  <sub>Made with ❤️ using Kotlin and Jetpack Compose</sub>
</p>
