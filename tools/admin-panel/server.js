const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const admin = require('firebase-admin');

const execFileAsync = promisify(execFile);

const app = express();
const PORT = 3002;
const HOST = '127.0.0.1';

// ==================== MIDDLEWARE DI PROTEZIONE (M3) ====================

// 1. Verifica dell'intestazione Host: solo 127.0.0.1:3002 o localhost:3002
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host !== '127.0.0.1:3002' && host !== 'localhost:3002') {
    return res.status(403).json({ error: 'Accesso vietato: host non valido' });
  }
  next();
});

// 2. Protezione da richieste cross-origin: X-Admin-Panel per metodi non safe
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const adminHeader = req.headers['x-admin-panel'];
    if (adminHeader !== 'true') {
      return res.status(403).json({ error: 'Accesso vietato: intestazione di sicurezza mancante' });
    }
  }
  next();
});

// Parsing JSON e file statici da public/ (nessuna rotta CORS configurata)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== CONFIGURAZIONE PERCORSI E STATO ====================

const secretsDir = path.join(__dirname, '.secrets');
const keyFilePath = path.join(secretsDir, 'serviceAccountKey.json');
const customBucketFilePath = path.join(secretsDir, 'customBucket.txt');

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Istanza Multer in memoria per la chiave (M5)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 65536,
    files: 1
  }
});

function handleKeyUpload(req, res, next) {
  uploadMemory.single('keyFile')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dimensione del file superiore al limite consentito (64 KB)' });
      }
      return res.status(400).json({ error: 'Errore durante la ricezione del file' });
    }
    next();
  });
}

// Istanza Multer su disco per upload brani e copertine (100 MB limite)
const uploadDisk = multer({
  dest: tmpDir,
  limits: {
    fileSize: 104857600 // 100 MB
  }
});

function handleSongUpload(req, res, next) {
  uploadDisk.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dimensione del file superiore al limite consentito (100 MB)' });
      }
      return res.status(400).json({ error: 'Errore durante la ricezione dei file' });
    }
    next();
  });
}

// Stato globale della connessione Firebase
let currentFirebaseApp = null;
let db = null;
let bucket = null;

let connectionState = {
  connected: false,
  projectId: null,
  storageBucket: null,
  error: 'Nessuna chiave configurata'
};

// Middleware per proteggere le route dati quando il DB non è connesso
function requireDatabase(req, res, next) {
  if (!connectionState.connected || !db || !bucket) {
    return res.status(503).json({ error: 'Database non configurato. Inserisci la chiave nelle Impostazioni.' });
  }
  next();
}

// ==================== NORMALIZZAZIONE DEL VOLUME ====================

// Obiettivo di loudness (EBU R128): -14 LUFS integrati, picco reale -1.5 dBTP, come Spotify.
const LOUDNORM_TARGET = 'I=-14:TP=-1.5:LRA=11';

/**
 * Esegue ffmpeg e restituisce lo stderr (dove loudnorm stampa le misure).
 */
async function runFfmpeg(args) {
  try {
    const { stderr } = await execFileAsync('ffmpeg', args, {
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true
    });
    return stderr;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Programma esterno "ffmpeg" non trovato sul sistema');
    }
    throw new Error(`Normalizzazione del volume non riuscita: ${(err.message || '').substring(0, 200)}`);
  }
}

/**
 * Porta un MP3 allo stesso volume percepito degli altri brani (loudnorm in due passaggi):
 * il primo passaggio misura il brano, il secondo applica una correzione lineare con quelle misure.
 * Il file in ingresso viene sostituito da quello normalizzato. Restituisce la nuova dimensione in byte.
 */
async function normalizeMp3Loudness(mp3Path) {
  // 1. Misura
  const measureLog = await runFfmpeg([
    '-hide_banner', '-nostdin', '-i', mp3Path,
    '-af', `loudnorm=${LOUDNORM_TARGET}:print_format=json`,
    '-f', 'null', '-'
  ]);
  const jsonStart = measureLog.lastIndexOf('{');
  const jsonEnd = measureLog.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd < jsonStart) {
    throw new Error('Normalizzazione del volume non riuscita: misure di loudnorm non trovate');
  }
  const m = JSON.parse(measureLog.substring(jsonStart, jsonEnd + 1));
  if (!Number.isFinite(parseFloat(m.input_i))) {
    // Brano muto o quasi: non c'è un livello da correggere, resta com'è
    console.log(`Volume non misurabile, file lasciato invariato: ${path.basename(mp3Path)}`);
    return fs.statSync(mp3Path).size;
  }

  // 2. Correzione con le misure del primo passaggio; loudnorm lavora a 192 kHz, si torna a 44.1 kHz
  const normalizedPath = `${mp3Path}.norm.mp3`;
  try {
    await runFfmpeg([
      '-hide_banner', '-nostdin', '-y', '-i', mp3Path,
      '-map', '0:a:0', '-map_metadata', '0',
      '-af',
      `loudnorm=${LOUDNORM_TARGET}` +
        `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
        `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
      '-ar', '44100',
      '-c:a', 'libmp3lame', '-q:a', '0',
      normalizedPath
    ]);
    fs.renameSync(normalizedPath, mp3Path);
  } finally {
    if (fs.existsSync(normalizedPath)) {
      try { fs.unlinkSync(normalizedPath); } catch {}
    }
  }
  console.log(`Volume normalizzato (da ${m.input_i} LUFS a -14 LUFS): ${path.basename(mp3Path)}`);
  return fs.statSync(mp3Path).size;
}

// ==================== VALIDAZIONE CREDENZIALI (D1, D2, M1, M2, M4) ====================

async function validateCredentials(parsedKey, customBucketName) {
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter((f) => !parsedKey[f]);
  if (missingFields.length > 0 || parsedKey.type !== 'service_account') {
    const errorDetails = [...missingFields];
    if (parsedKey.type && parsedKey.type !== 'service_account' && !errorDetails.includes('type')) {
      errorDetails.push('type (deve essere "service_account")');
    }
    throw new Error(`File JSON incompleto o non valido. Campi mancanti o errati: ${errorDetails.join(', ')}`);
  }

  const projectId = parsedKey.project_id;
  const testAppName = `test-app-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  let testApp = null;
  let validatedBucketName = null;
  let needCustomBucket = false;

  try {
    if (customBucketName) {
      testApp = admin.initializeApp({
        credential: admin.credential.cert(parsedKey),
        storageBucket: customBucketName
      }, testAppName);

      const candidateBucket = testApp.storage().bucket();
      try {
        const [exists] = await candidateBucket.exists();
        if (!exists) {
          throw new Error(`Il bucket specificato "${customBucketName}" non esiste.`);
        }
        validatedBucketName = customBucketName;
      } catch (bucketErr) {
        throw new Error(`Errore durante la verifica del bucket "${customBucketName}": ${bucketErr.code || bucketErr.message}`);
      }
    } else {
      const candidateBuckets = [
        `${projectId}.appspot.com`,
        `${projectId}.firebasestorage.app`
      ];

      for (const candidateName of candidateBuckets) {
        if (testApp) {
          try { await testApp.delete(); } catch {}
          testApp = null;
        }

        testApp = admin.initializeApp({
          credential: admin.credential.cert(parsedKey),
          storageBucket: candidateName
        }, `${testAppName}-${candidateName.replace(/[^a-zA-Z0-9]/g, '')}`);

        const candidateBucket = testApp.storage().bucket();
        try {
          const [exists] = await candidateBucket.exists();
          if (exists) {
            validatedBucketName = candidateName;
            break;
          }
        } catch (bucketErr) {
          throw new Error(`Errore durante il controllo del bucket "${candidateName}": ${bucketErr.code || bucketErr.message}`);
        }
      }

      if (!validatedBucketName) {
        needCustomBucket = true;
      }
    }

    if (!testApp) {
      testApp = admin.initializeApp({
        credential: admin.credential.cert(parsedKey)
      }, `${testAppName}-firestore`);
    }

    const testDb = testApp.firestore();
    await testDb.collection('users').limit(1).get();

    if (needCustomBucket) {
      return { needCustomBucket: true, projectId };
    }

    return { needCustomBucket: false, projectId, storageBucket: validatedBucketName };
  } finally {
    if (testApp) {
      try {
        await testApp.delete();
      } catch {}
    }
  }
}

// ==================== SALVATAGGIO E RICOLLEGAMENTO (M6) ====================

async function connectWithCredentials(parsedKey, bucketName) {
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  fs.writeFileSync(keyFilePath, JSON.stringify(parsedKey, null, 2), 'utf-8');

  if (bucketName && bucketName !== `${parsedKey.project_id}.appspot.com` && bucketName !== `${parsedKey.project_id}.firebasestorage.app`) {
    fs.writeFileSync(customBucketFilePath, bucketName, 'utf-8');
  } else if (fs.existsSync(customBucketFilePath)) {
    try { fs.unlinkSync(customBucketFilePath); } catch {}
  }

  if (currentFirebaseApp) {
    try {
      await currentFirebaseApp.delete();
    } catch (delErr) {
      console.log('Avviso durante la disconnessione della vecchia app Firebase:', delErr.message);
    }
  }

  currentFirebaseApp = admin.initializeApp({
    credential: admin.credential.cert(parsedKey),
    storageBucket: bucketName
  }, 'adminPanel');

  db = currentFirebaseApp.firestore();
  bucket = currentFirebaseApp.storage().bucket();

  connectionState = {
    connected: true,
    projectId: parsedKey.project_id,
    storageBucket: bucketName,
    error: null
  };

  console.log('Connessione al database riuscita.');
}

async function initFromDisk() {
  if (!fs.existsSync(keyFilePath)) {
    console.log('Nessuna chiave configurata in .secrets/.');
    connectionState = { connected: false, projectId: null, storageBucket: null, error: 'Nessuna chiave configurata' };
    return;
  }

  console.log('Rilevata chiave salvata in .secrets/, verifica in corso...');
  let rawContent;
  let parsedKey;

  try {
    rawContent = fs.readFileSync(keyFilePath, 'utf-8');
  } catch {
    console.log('Impossibile leggere il file della chiave.');
    connectionState = { connected: false, projectId: null, storageBucket: null, error: 'Impossibile leggere il file della chiave' };
    return;
  }

  try {
    parsedKey = JSON.parse(rawContent);
  } catch {
    console.log('Il file salvato non è un JSON valido.');
    connectionState = { connected: false, projectId: null, storageBucket: null, error: 'Il file salvato non è un JSON valido' };
    return;
  }

  let customBucketName = null;
  if (fs.existsSync(customBucketFilePath)) {
    try {
      customBucketName = fs.readFileSync(customBucketFilePath, 'utf-8').trim();
    } catch {}
  }

  try {
    const result = await validateCredentials(parsedKey, customBucketName);
    if (result.needCustomBucket) {
      console.log('Bucket di Storage non trovato automaticamente per la chiave salvata.');
      connectionState = { connected: false, projectId: parsedKey.project_id, storageBucket: null, error: 'Bucket di Storage non trovato automaticamente' };
      return;
    }

    if (currentFirebaseApp) {
      try { await currentFirebaseApp.delete(); } catch {}
    }

    currentFirebaseApp = admin.initializeApp({
      credential: admin.credential.cert(parsedKey),
      storageBucket: result.storageBucket
    }, 'adminPanel');

    db = currentFirebaseApp.firestore();
    bucket = currentFirebaseApp.storage().bucket();

    connectionState = {
      connected: true,
      projectId: parsedKey.project_id,
      storageBucket: result.storageBucket,
      error: null
    };

    console.log('Connessione al database riuscita.');
  } catch (err) {
    console.log('Verifica della chiave salvata fallita:', err.message);
    connectionState = { connected: false, projectId: null, storageBucket: null, error: `Chiave non valida: ${err.message}` };
  }
}

// ==================== ROUTES DELLE IMPOSTAZIONI ====================

app.get('/api/settings/status', (req, res) => {
  res.json(connectionState);
});

app.post('/api/settings/key', handleKeyUpload, async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'Nessun file selezionato' });
  }

  let parsedKey;
  try {
    parsedKey = JSON.parse(req.file.buffer.toString('utf-8'));
  } catch {
    console.log('Caricamento chiave: il file inviato non è un JSON valido.');
    return res.status(400).json({ error: 'Il file non è un JSON valido' });
  }

  const customBucket = (req.body.customBucket || '').trim();

  try {
    const validation = await validateCredentials(parsedKey, customBucket || null);
    if (validation.needCustomBucket) {
      return res.status(422).json({
        success: false,
        needCustomBucket: true,
        projectId: validation.projectId,
        error: 'Bucket di Storage predefiniti non trovati per questo progetto. Inserisci il nome del bucket a mano.'
      });
    }

    await connectWithCredentials(parsedKey, validation.storageBucket);

    res.json({
      success: true,
      message: 'Connessione al database riuscita',
      projectId: connectionState.projectId,
      storageBucket: connectionState.storageBucket
    });
  } catch (err) {
    console.log('Caricamento chiave fallito:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/settings/key', async (req, res) => {
  try {
    if (fs.existsSync(keyFilePath)) fs.unlinkSync(keyFilePath);
    if (fs.existsSync(customBucketFilePath)) fs.unlinkSync(customBucketFilePath);

    if (currentFirebaseApp) {
      try {
        await currentFirebaseApp.delete();
      } catch {}
      currentFirebaseApp = null;
      db = null;
      bucket = null;
    }

    connectionState = {
      connected: false,
      projectId: null,
      storageBucket: null,
      error: 'Nessuna chiave configurata'
    };

    console.log('Chiave del database eliminata.');
    res.json({ success: true, message: 'Chiave del database eliminata con successo' });
  } catch (err) {
    console.log('Errore durante la cancellazione della chiave:', err.message);
    res.status(500).json({ error: `Errore durante l'eliminazione della chiave: ${err.message}` });
  }
});

// ==================== ROUTES UTENTI E CATALOGO (TASK 11) ====================

// Elenco utenti (per dropdown Catalogo e gestione utenti Task 12, esclude passwordHash)
app.get('/api/users', requireDatabase, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username || '',
        dailyDownloadLimit: data.dailyDownloadLimit !== undefined ? data.dailyDownloadLimit : 5,
        downloadedToday: data.downloadedToday !== undefined ? data.downloadedToday : 0,
        lastDownloadDate: data.lastDownloadDate || null
      };
    });
    users.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    res.json(users);
  } catch (err) {
    console.log('Errore recupero utenti:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Crea nuovo utente (Task 12)
app.post('/api/users', requireDatabase, async (req, res) => {
  try {
    const { username, passwordHash, dailyDownloadLimit } = req.body;

    if (username === undefined || username === null || typeof username !== 'string') {
      return res.status(400).json({ error: 'Lo username è obbligatorio' });
    }
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return res.status(400).json({ error: 'Lo username non può essere vuoto' });
    }

    if (!passwordHash || typeof passwordHash !== 'string') {
      return res.status(400).json({ error: 'La password è obbligatoria' });
    }
    if (!/^[0-9a-f]{64}$/.test(passwordHash)) {
      return res.status(400).json({ error: 'Il campo passwordHash non è valido' });
    }

    let limit = 5;
    if (dailyDownloadLimit !== undefined && dailyDownloadLimit !== null && dailyDownloadLimit !== '') {
      const parsedLimit = Number(dailyDownloadLimit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ error: 'Il limite giornaliero deve essere un numero intero maggiore o uguale a 1' });
      }
      limit = parsedLimit;
    }

    // Verifica che username non esista già (O1)
    const existing = await db.collection('users').where('username', '==', cleanUsername).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Username già esistente' });
    }

    const today = new Date().toISOString().split('T')[0];
    const docRef = await db.collection('users').add({
      username: cleanUsername,
      passwordHash,
      dailyDownloadLimit: limit,
      downloadedToday: 0,
      lastDownloadDate: today
    });

    console.log('Utente creato con successo');
    res.json({ success: true, userId: docRef.id });
  } catch (err) {
    console.log('Errore creazione utente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Aggiorna utente (Task 12)
app.put('/api/users/:id', requireDatabase, async (req, res) => {
  try {
    const { username, passwordHash, dailyDownloadLimit, downloadedToday, lastDownloadDate } = req.body;
    const updateData = {};

    if (username !== undefined) {
      if (typeof username !== 'string') {
        return res.status(400).json({ error: 'Il campo username non è valido' });
      }
      const cleanUsername = username.trim();
      if (!cleanUsername) {
        return res.status(400).json({ error: 'Lo username non può essere vuoto' });
      }
      updateData.username = cleanUsername;
    }

    if (passwordHash !== undefined && passwordHash !== null && passwordHash !== '') {
      if (typeof passwordHash !== 'string' || !/^[0-9a-f]{64}$/.test(passwordHash)) {
        return res.status(400).json({ error: 'Il campo passwordHash non è valido' });
      }
      updateData.passwordHash = passwordHash;
    }

    if (dailyDownloadLimit !== undefined) {
      if (dailyDownloadLimit === null || dailyDownloadLimit === '') {
        return res.status(400).json({ error: 'Il limite giornaliero deve essere un numero intero maggiore o uguale a 1' });
      }
      const parsedLimit = Number(dailyDownloadLimit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ error: 'Il limite giornaliero deve essere un numero intero maggiore o uguale a 1' });
      }
      updateData.dailyDownloadLimit = parsedLimit;
    }

    if (downloadedToday !== undefined) {
      if (downloadedToday === null || downloadedToday === '') {
        return res.status(400).json({ error: 'Il numero di brani scaricati oggi deve essere un numero intero maggiore o uguale a 0' });
      }
      const parsedDownloaded = Number(downloadedToday);
      if (!Number.isInteger(parsedDownloaded) || parsedDownloaded < 0) {
        return res.status(400).json({ error: 'Il numero di brani scaricati oggi deve essere un numero intero maggiore o uguale a 0' });
      }
      updateData.downloadedToday = parsedDownloaded;
    }

    if (lastDownloadDate !== undefined) {
      if (lastDownloadDate !== null && typeof lastDownloadDate !== 'string') {
        return res.status(400).json({ error: 'Il campo lastDownloadDate non è valido' });
      }
      updateData.lastDownloadDate = lastDownloadDate;
    }

    // Se si cambia username, verifica che non sia già preso da un altro utente (O1)
    if (updateData.username) {
      const existing = await db.collection('users')
        .where('username', '==', updateData.username)
        .get();
      const conflict = existing.docs.find((doc) => doc.id !== req.params.id);
      if (conflict) {
        return res.status(409).json({ error: 'Username già esistente' });
      }
    }

    await db.collection('users').doc(req.params.id).update(updateData);
    console.log('Utente aggiornato con successo');
    res.json({ success: true });
  } catch (err) {
    console.log('Errore aggiornamento utente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Elimina utente (Task 12)
app.delete('/api/users/:id', requireDatabase, async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    console.log('Utente eliminato con successo');
    res.json({ success: true });
  } catch (err) {
    console.log('Errore eliminazione utente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Elenco canzoni per utente
app.get('/api/songs', requireDatabase, async (req, res) => {
  try {
    const { userName } = req.query;
    if (!userName) {
      return res.json([]);
    }
    const snapshot = await db.collection('songs')
      .where('userName', '==', userName)
      .get();
    const songs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    songs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    res.json(songs);
  } catch (err) {
    console.log('Errore recupero catalogo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Upload manuale brano (mp3 + copertina opzionale)
app.post('/api/upload', requireDatabase, handleSongUpload, async (req, res) => {
  const mp3File = req.files?.mp3?.[0];
  const coverFile = req.files?.cover?.[0];

  if (!mp3File) {
    if (coverFile && fs.existsSync(coverFile.path)) {
      try { fs.unlinkSync(coverFile.path); } catch {}
    }
    return res.status(400).json({ error: 'File mp3 mancante' });
  }

  const { title, artist, duration, fileSizeBytes, userName } = req.body;
  const songId = crypto.randomUUID();

  try {
    // Volume uniforme fra i brani: la dimensione cambia, quindi si usa quella del file normalizzato
    const normalizedSize = await normalizeMp3Loudness(mp3File.path);

    const storagePath = `songs/${songId}.mp3`;
    await bucket.upload(mp3File.path, {
      destination: storagePath,
      metadata: { contentType: 'audio/mpeg' }
    });

    const songDoc = {
      title: title || mp3File.originalname,
      artist: artist || 'Sconosciuto',
      duration: Number(duration) || 0,
      storagePath,
      fileSizeBytes: normalizedSize || Number(fileSizeBytes) || mp3File.size,
      userName: userName || ''
    };

    if (coverFile) {
      const coverToken = crypto.randomUUID();
      const coverPath = `covers/${songId}.jpg`;
      await bucket.upload(coverFile.path, {
        destination: coverPath,
        metadata: {
          contentType: coverFile.mimetype || 'image/jpeg',
          metadata: {
            firebaseStorageDownloadTokens: coverToken
          }
        }
      });
      const encodedPath = encodeURIComponent(coverPath);
      const coverUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${coverToken}`;
      songDoc.coverPath = coverPath;
      songDoc.coverUrl = coverUrl;
    } else {
      // N1: Se non c'è la copertina, coverPath: '' e coverUrl non viene scritto
      songDoc.coverPath = '';
    }

    await db.collection('songs').doc(songId).set(songDoc);
    res.json({ success: true, songId });
  } catch (err) {
    console.log('Errore upload brano:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (mp3File && fs.existsSync(mp3File.path)) {
      try { fs.unlinkSync(mp3File.path); } catch {}
    }
    if (coverFile && fs.existsSync(coverFile.path)) {
      try { fs.unlinkSync(coverFile.path); } catch {}
    }
  }
});

// Modifica metadati brano (titolo / artista)
app.put('/api/songs/:id', requireDatabase, async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title && !artist) {
      return res.status(400).json({ error: 'Almeno uno tra titolo e artista è richiesto' });
    }

    const docRef = db.collection('songs').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Canzone non trovata' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim() || 'Sconosciuto';
    if (artist !== undefined) updateData.artist = artist.trim() || 'Sconosciuto';

    await docRef.update(updateData);
    res.json({ success: true, id: req.params.id, ...updateData });
  } catch (err) {
    console.log('Errore modifica canzone:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminazione singolo brano
app.delete('/api/songs/:id', requireDatabase, async (req, res) => {
  try {
    const docRef = db.collection('songs').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Canzone non trovata' });
    }

    const data = doc.data();
    const deletions = [];
    if (data.storagePath) {
      deletions.push(bucket.file(data.storagePath).delete().catch(() => {}));
    }
    if (data.coverPath) {
      deletions.push(bucket.file(data.coverPath).delete().catch(() => {}));
    }
    await Promise.all(deletions);
    await docRef.delete();

    res.json({ success: true });
  } catch (err) {
    console.log('Errore eliminazione canzone:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminazione di tutte le canzoni di un utente
app.delete('/api/songs/user/:userName', requireDatabase, async (req, res) => {
  try {
    const { userName } = req.params;
    if (!userName) {
      return res.status(400).json({ error: 'userName richiesto' });
    }

    const snapshot = await db.collection('songs')
      .where('userName', '==', userName)
      .get();

    if (snapshot.empty) {
      return res.json({ deleted: 0, message: `Nessuna canzone trovata per "${userName}"` });
    }

    const deletions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.storagePath) {
        deletions.push(bucket.file(data.storagePath).delete().catch(() => {}));
      }
      if (data.coverPath) {
        deletions.push(bucket.file(data.coverPath).delete().catch(() => {}));
      }
      deletions.push(doc.ref.delete());
    });

    await Promise.all(deletions);
    res.json({ deleted: snapshot.size, message: `Eliminate ${snapshot.size} canzoni per "${userName}"` });
  } catch (err) {
    console.log('Errore eliminazione canzoni utente:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== AVVIO SERVER ====================

app.listen(PORT, HOST, async () => {
  console.log(`Pannello attivo su http://${HOST}:${PORT}`);
  await initFromDisk();
});
