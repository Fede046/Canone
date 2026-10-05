# 🎵 Canone

[![Android](https://img.shields.io/badge/Android-34-3DDC84?logo=android&logoColor=white)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9.24-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Jetpack Compose](https://img.shields.io/badge/Compose-BOM%202024.06-4285F4?logo=jetpackcompose&logoColor=white)](https://developer.android.com/compose)
[![Media3](https://img.shields.io/badge/Media3-1.4.0-A855F7)](https://developer.android.com/media/media3)
[![Min SDK](https://img.shields.io/badge/minSdk-26-FF6D00?logo=android)](https://developer.android.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

App musicale Android in stile Spotify, nera e viola, scritta in **Kotlin** con **Jetpack Compose**.
Accedi con l'account creato dal pannello di amministrazione, scarica i brani del tuo catalogo Firebase per ascoltarli offline per sempre, organizzali in playlist e **guardali suonare**: tre *Zone* a schermo intero (**MZ**, **CZ**, **FZ**) analizzano ogni brano direttamente sul telefono e lo trasformano in immagini.

---

## 🎬 Video

| | Orizzontale (README, YouTube) | Verticale (social) |
|---|---|---|
| **Per tutti** — *See what you hear.* (61 s) | [canone-public-horizontal.mp4](video/out/canone-public-horizontal.mp4) | [canone-public-vertical.mp4](video/out/canone-public-vertical.mp4) |
| **Per sviluppatori** — *Know every beat before it plays.* (82 s): installazione, pannello, come funzionano le Zone | [canone-dev-horizontal.mp4](video/out/canone-dev-horizontal.mp4) | [canone-dev-vertical.mp4](video/out/canone-dev-vertical.mp4) |

I video sono fatti con [Remotion](https://www.remotion.dev) nella cartella [`video/`](video/README.md), con colonna sonora sintetizzata da codice e con estratti di due brani originali dell'autore, "84" e "Celestial Citadel". Le Zone che si vedono sono guidate dall'analisi vera di questi due brani, calcolata con lo stesso algoritmo dell'app.

## ✨ Caratteristiche

- 🔐 **Accesso** — username e password creati dal pannello; ogni utente ha il suo catalogo e un limite di download giornaliero
- 🗂️ **Sfoglia** — il catalogo online dell'utente, con ricerca e filtro per autore; una copia locale lo rende subito disponibile all'apertura
- ⬇️ **Download permanente** — audio e copertina restano sul telefono: si ascolta anche senza connessione
- 📚 **Libreria** — ricerca, filtro per artista e menu con la pressione prolungata: aggiungi a playlist, modifica titolo e artista (solo sul telefono), elimina dal telefono
- 🎶 **Playlist** — con un colore ciascuna, create dal menu di un brano, dal player o dalla schermata Playlist
- ▶️ **Riproduzione in background** — notifica con i comandi, casuale, ripeti (brano o coda), sleep timer (Media3 / ExoPlayer)
- 🌌 **Music Zone (MZ)** — una curva perfettamente simmetrica, da 3 a 8 lobi, che respira con la musica; colori dalla copertina e una nebulosa diversa per ogni brano
- 🎡 **Circle Zone (CZ)** — tonalità, accordi, tempo e tre voci stimati dall'audio, disegnati su una ruota di ettagoni (uno per ottava), con la melodia ripresa a canone
- 🌲 **Firewatch Zone (FZ)** — una torretta nel bosco: il cielo segue l'ora del telefono, gli stormi seguono l'energia del brano
- ⚙️ **Impostazioni** — quanto resta acceso lo schermo nelle Zone: come il telefono, sempre mentre la musica suona, oppure 5–60 minuti dall'ultimo tocco
- ❓ **Guida** integrata (tasto “?”) con tutte le funzioni
- 🎨 Tema sempre scuro, nero e viola; icona con la chiave di sol
- 📱 Android 8.0+ (minSdk 26)

## 🧠 Come funzionano le Zone

Le Zone non usano il `Visualizer` di Android (che richiede il permesso del microfono e ascolta solo l'istante presente): **leggono il file scaricato** con `MediaExtractor` + `MediaCodec`, lo riducono a mono e lo analizzano in background, molto più in fretta della riproduzione. L'app non chiede `RECORD_AUDIO`.

- **MZ** — FFT da 1024 punti, energia di 6 bande 30 volte al secondo, salvata come byte. La figura è `z(s) = e^(is) + a·e^(i(1+k)s) + b·e^(i(1-2k)s)`: i medi decidono `a`, gli alti `b`, i bassi il respiro, ma la simmetria di ordine `k` resta esatta. `k` segue 3-4-5-6-7-8-7-6-5-4 e cambia sul primo colpo forte dopo almeno 8 secondi.
- **CZ** — energia dei 72 semitoni da Mi1 a Re♯7; la tonalità è quella dei 24 profili di Krumhansl-Kessler con la correlazione più alta, gli accordi il percorso migliore (Viterbi) fra le triadi, con un costo per ogni cambio, così non tremolano; il tempo viene dall'autocorrelazione degli attacchi.
- **FZ** — volume, brillantezza, densità dei colpi forti e dinamica interna diventano un'unica curva d'energia con tre stati (calmo, intermedio, energico) con margine e permanenza minima; la scena la legge **2 secondi in anticipo**, così gli stormi arrivano insieme al ritornello.

Ogni analisi si fa una volta per brano e resta in cache in `filesDir`; a ogni avvio `AnalysisCacheCleaner` cancella le cache dei brani non più in libreria.

## 🛠️ Tecnologie utilizzate

| Categoria | Tecnologia |
|-----------|-----------|
| **Linguaggio** | Kotlin 1.9.24 |
| **UI** | Jetpack Compose (BOM 2024.06) + Material Design 3 |
| **Database locale** | Room 2.6.1 (brani scaricati, catalogo in cache, playlist) |
| **Backend** | Firebase Firestore + Firebase Storage |
| **Riproduzione** | Media3 1.4.0 (ExoPlayer + MediaSession) |
| **Analisi audio** | `MediaExtractor` / `MediaCodec` + FFT propria (`playback/analysis`) |
| **Colori delle Zone** | AndroidX Palette |
| **DI** | Dagger Hilt 2.51.1 |
| **Download** | Coroutines + Firebase Storage |
| **Copertine** | Coil 2.6.0 |
| **Navigazione** | Navigation Compose |
| **Pannello** | Node.js + Express + firebase-admin, ffmpeg |
| **Video** | Remotion |

## 📋 Prerequisiti

- Android Studio **Koala** (2024.1.1) o successivo, JDK **17**
- Un progetto Firebase con **Firestore** e **Storage**
- Per il pannello di amministrazione: **Node.js** (provato con la 24.12) e **ffmpeg** nel `PATH` (vedi il suo [README](tools/admin-panel/README.md))

## 🚀 Setup

### 1️⃣ Firebase e app

1. Nella [Firebase Console](https://console.firebase.google.com) crea un progetto (o usane uno esistente) e attiva **Firestore Database** e **Storage**
2. Aggiungi un'app **Android** con package `com.example.musicplayer`
3. Scarica `google-services.json` e copialo in `app/google-services.json`

   > ⚠️ **Importante:** questo file non è nel repository. Ognuno usa quello del proprio progetto Firebase.

### 2️⃣ Pannello di amministrazione

Catalogo e utenti si gestiscono dal pannello locale in [`tools/admin-panel/`](tools/admin-panel/README.md):

```powershell
cd tools/admin-panel
npm install
npm start
```

Apri http://127.0.0.1:3002 (il pannello ascolta solo sul tuo computer), poi:

1. **Impostazioni** → carica la chiave del service account Firebase (Impostazioni progetto → Account di servizio → Genera nuova chiave privata). Viene salvata in `tools/admin-panel/.secrets/`, esclusa da git: non va mai condivisa
2. **Utenti** → crea un utente con username, password e limite di download giornaliero
3. **Catalogo** → carica gli MP3 per quell'utente, con copertina facoltativa. Ogni brano viene portato allo stesso volume percepito (−14 LUFS) con ffmpeg prima del caricamento

### 3️⃣ Avvia l'app

Apri il progetto in Android Studio (**File → Open**), lascia sincronizzare Gradle e avvia su un dispositivo o emulatore Android 8.0+, oppure da terminale:

```bash
./gradlew installDebug
```

Nell'app apri **Sfoglia** e accedi con l'utente creato nel pannello.

### Dati su Firebase (scritti dal pannello)

```
songs/{songId}
  title, artist
  duration          // millisecondi
  storagePath       // es. "songs/<id>.mp3"
  coverUrl          // URL di download della copertina (vuoto se non c'è)
  fileSizeBytes
  userName          // proprietario: il catalogo di un utente sono i brani con il suo username

users/{userId}
  username
  passwordHash      // SHA-256 esadecimale, calcolato nel browser dal pannello
  dailyDownloadLimit, downloadedToday, lastDownloadDate ("yyyy-MM-dd")

Storage: songs/<id>.mp3, covers/<id>.jpg
```

### Regole di sicurezza (solo per prova)

L'app legge `songs` e `users` dal telefono e aggiorna il conteggio dei download in `users`:

```
// Firestore
match /songs/{songId} { allow read: if true; }
match /users/{userId} { allow read, update: if true; }

// Storage
match /songs/{fileName} { allow read: if true; }
match /covers/{fileName} { allow read: if true; }
```

> ⚠️ Con queste regole chiunque conosca il progetto può leggere gli hash delle password e cambiare i contatori: vanno bene solo per uso personale o di prova. Per un uso reale servono Firebase Auth, regole più strette e App Check (vedi le estensioni future).

## 📁 Struttura del progetto

```
app/src/main/java/com/example/musicplayer/
├── data/
│   ├── remote/            # RemoteSong, RemoteUser, RemoteSongRepository (Firestore + Storage)
│   ├── local/             # Room: brani scaricati, catalogo in cache, playlist (AppDatabase, versione 6)
│   └── repository/        # SongRepository (download, catalogo, libreria), UserRepository (accesso, limite giornaliero)
├── playback/
│   ├── PlaybackService.kt # MediaSessionService + ExoPlayer
│   ├── controller/        # PlayerController (ponte UI ↔ servizio via MediaController)
│   └── analysis/          # MonoDecoder, Fft, AudioAnalyzer (MZ), HarmonyAnalyzer + HarmonyResult (CZ),
│                          # EnergyTimeline (FZ), AnalysisCacheCleaner
├── ui/
│   ├── catalog/           # Sfoglia: accesso, catalogo, download
│   ├── library/           # Libreria
│   ├── playlist/          # elenco e dettaglio playlist
│   ├── player/            # mini player e player
│   ├── musiczone/         # MZ: CanonVisualizer, NebulaBackground, CoverPalette
│   ├── circlezone/        # CZ: CircleWheel, WheelLayout, NoteSpeller, CircleHud
│   ├── firewatch/         # FZ: FirewatchScene, FirewatchSky, FirewatchWorld
│   ├── zone/              # ZoneMode, ZoneChrome, ZoneSettings (comuni alle tre Zone)
│   ├── components/        # SongItem, ArtistFilter, menu e finestre dei brani, MarqueeText
│   ├── settings/, help/   # Impostazioni e Guida
│   └── theme/             # tema nero e viola
├── navigation/            # NavGraph (barra in basso, mini player)
├── di/                    # AppModule (Hilt: Firebase, Room)
├── MainActivity.kt
└── MusicApp.kt            # Application @HiltAndroidApp

tools/admin-panel/         # pannello locale (Express) per catalogo, utenti e chiave Firebase
video/                     # video del progetto (Remotion)
```

## 🔍 Note implementative

- Il **download** controlla prima il limite giornaliero, poi scarica l'audio, la copertina e salva la riga in Room; in caso di errore i file parziali vengono cancellati
- La **Libreria** legge solo da Room tramite `Flow`, quindi funziona al 100% offline
- La **pressione prolungata** su un brano apre il menu delle azioni; la modifica di titolo e artista resta sul telefono e il brano risulta comunque scaricato
- La **riproduzione in background** è gestita da `PlaybackService` (MediaSessionService), che espone la notifica media di Media3
- Il permesso `POST_NOTIFICATIONS` viene chiesto a runtime da Android 13; il microfono non serve
- Il nome visibile è **Canone**, ma l'identificativo resta `com.example.musicplayer`, per non perdere libreria e playlist già sul telefono (va cambiato solo per pubblicare sul Play Store)

## 🚧 Possibili estensioni future

### 🔐 Sicurezza informatica
Passare a Firebase Auth al posto dell'hash SHA-256 senza sale, con regole di sicurezza su Firestore e Storage che permettano a ogni utente di leggere solo i propri dati. Spostare il limite di download sul server (oggi è controllato solo dall'app) e aggiungere App Check per prevenire abusi.

### 🎚️ Equalizzatore audio
Integrare un equalizzatore grafico a bande multiple con preset (Pop, Rock, Jazz, Classica…), controllo separato di bassi e alti ed effetti aggiuntivi (reverb, virtualizer, bass boost) tramite l'API AudioEffects di Android.

### 🎶 Suggerimenti
Usare tonalità, tempo ed energia già calcolati dalle Zone per proporre il brano successivo più adatto (“potrebbe piacerti anche…”) o costruire playlist per atmosfera.

## 🤝 Contribuire

I contributi sono benvenuti! Per contribuire:

1. Fai un **Fork** del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/nuova-feature`)
3. Committa le modifiche (`git commit -m "Aggiunta nuova feature"`)
4. Pusha sul branch (`git push origin feature/nuova-feature`)
5. Apri una **Pull Request**

## 📄 Licenza

Questo progetto è distribuito sotto licenza **MIT**. Vedi il file [LICENSE](LICENSE) per maggiori dettagli.

**Crediti:** la chiave di sol dell'icona è il tracciato `music-clef-treble` di [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0).

**Brani nei video:** "84" e "Celestial Citadel", i cui estratti si sentono nei video in `video/out/` e nei file audio in `video/public/canone/`, sono composizioni originali di Federico, © tutti i diritti riservati. **Non sono coperti dalla licenza MIT**: non possono essere riusati, ridistribuiti o modificati senza permesso.

---

<p align="center">
  <sub>Realizzato con ❤️ usando Kotlin e Jetpack Compose</sub>
</p>
