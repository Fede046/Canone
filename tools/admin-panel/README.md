# Pannello di Amministrazione Locale

Applicazione web locale per la gestione unificata del catalogo musicale, degli utenti e delle credenziali Firebase dell'app Android **Canone** (pacchetto `com.example.musicplayer`).

> ⚠️ **Responsabilità sui contenuti**
> Questo pannello carica file audio sul **tuo** progetto Firebase. Chi lo usa è l'unico responsabile dei file che carica e deve averne i diritti: brani propri, liberi da diritti o con una licenza che ne consente la distribuzione. L'autore del software non controlla i contenuti caricati e non risponde di eventuali violazioni di copyright o di altri diritti.

---

## 1. Requisiti

* **Node.js** e **npm**: il pannello è stato provato e verificato con **Node.js v24.12.0** e **npm 11.6.2**.
* **FFmpeg** (`ffmpeg`):
  * Deve essere installato sul sistema e accessibile nel `PATH` di sistema.
  * Il pannello è stato verificato con FFmpeg versione **8.0-essentials**.
  * `ffmpeg` serve a **ogni caricamento di brani**: prima dell'invio a Storage il volume del brano viene normalizzato (vedi "Volume uniforme" più sotto). Senza `ffmpeg` il caricamento si ferma con un errore e il brano non viene caricato.
  * Gestione utenti, visualizzazione e modifica del catalogo, eliminazione brani e Impostazioni funzionano anche senza `ffmpeg`.
  * Se `ffmpeg` manca, il server restituisce un messaggio d'errore esplicito: `Programma esterno "ffmpeg" non trovato sul sistema`

### Volume uniforme
Ogni brano caricato passa da `ffmpeg` con il filtro `loudnorm` (EBU R128) in due passaggi: il primo misura il volume percepito, il secondo lo porta a **-14 LUFS** con picco massimo **-1.5 dBTP**, lo stesso livello usato da Spotify. Il file risultante è un MP3 VBR di alta qualità (`-q:a 0`) a 44.1 kHz. Un brano muto o non misurabile viene caricato così com'è.

I brani caricati prima di questa funzione non sono normalizzati: per uniformarli vanno ricaricati dal pannello, poi eliminati e riscaricati nell'app.

---

## 2. Installazione e avvio

### Comandi in PowerShell (dalla radice del repository)

Dalla radice del repository `MusicApp`, spostarsi nella cartella del pannello, installare le dipendenze e avviare il server:

```powershell
cd tools/admin-panel
npm install
npm start
```

### Accesso al pannello

Una volta avviato il server, aprire il browser web all'indirizzo:

http://127.0.0.1:3002

Il pannello è configurato per restare in ascolto esclusivamente sull'interfaccia locale (`127.0.0.1`) alla porta `3002`.

### Come fermare il server

Per arrestare il server locale, premere `Ctrl + C` nella finestra del terminale PowerShell in cui è in esecuzione il comando `npm start`.

---

## 3. Gestione della chiave del database

### Come ottenere la chiave da Firebase

1. Accedere alla [Console Firebase](https://console.firebase.google.com/) con il proprio account Google.
2. Selezionare il progetto associato all'applicazione.
3. Fare clic sull'icona dell'ingranaggio in alto a sinistra accanto a **Panoramica progetto** e scegliere **Impostazioni progetto**.
4. Spostarsi nella scheda **Account di servizio**.
5. Verificare che sia selezionato **Firebase Admin SDK** (con runtime Node.js) e fare clic sul pulsante **Genera nuova chiave privata**.
6. Confermare il popup facendo clic su **Genera chiave**: verrà scaricato un file in formato `.json` contenente le credenziali dell'account di servizio.

### Come inserire, sostituire e cancellare la chiave dalle Impostazioni

Tutte le operazioni relative alla chiave vengono eseguite direttamente dall'interfaccia web nella scheda **Impostazioni**, sezione **Connessione Firebase**:

* **Inserimento iniziale**:
  * Se nessuna chiave è configurata, lo **Stato Connessione** visualizza il badge `Non connesso` e il modulo propone il titolo **Carica chiave del database**.
  * Fare clic sul pulsante per scegliere il file nel campo **File JSON delle credenziali**, selezionare il file `.json` scaricato dalla console Firebase e fare clic su **Salva chiave**.
  * Il server convalida la chiave in memoria collegandosi a Firestore e Storage. A esito positivo, lo stato diventa `Connesso`, vengono mostrati **Progetto Firebase** e **Bucket Storage**, e la chiave viene salvata localmente.
* **Sostituzione della chiave**:
  * Con il database connesso, il modulo mostra il titolo **Sostituisci chiave del database** e il pulsante **Sostituisci chiave**.
  * Per aggiornare le credenziali, selezionare il nuovo file `.json` tramite il pulsante per scegliere il file nel campo **File JSON delle credenziali** e fare clic su **Sostituisci chiave**. La vecchia chiave viene sostituita e la nuova connessione viene verificata immediatamente.
* **Cancellazione della chiave**:
  * Quando è presente una chiave configurata, accanto al pulsante di salvataggio è visibile il pulsante rosso **Elimina chiave**.
  * Cliccando **Elimina chiave**, il server rimuove il file salvato su disco, chiude la sessione attiva di Firebase e reimposta lo stato su `Non connesso`.

### Rilevamento del bucket e inserimento manuale

* Durante la verifica della chiave, il server interroga automaticamente i due nomi di bucket predefiniti di Firebase per il progetto: `<project_id>.appspot.com` e `<project_id>.firebasestorage.app`.
* Se uno dei due bucket esiste ed è accessibile, viene associato automaticamente senza richiedere alcun inserimento da parte dell'utente.
* Se nessuno dei due bucket predefiniti viene rilevato automaticamente (nessuno dei due nomi esiste), il server segnala la condizione e la pagina richiede il nome a mano mostrando il campo **Nome bucket Storage (manuale)**. In tal caso è sufficiente digitare il nome del bucket (es. `<project_id>.appspot.com`) e confermare con **Salva chiave**. Il nome manuale viene convalidato e registrato in locale.

### Dove viene salvata la chiave e sicurezza

* Il file delle credenziali viene memorizzato localmente nel percorso:
  `tools/admin-panel/.secrets/serviceAccountKey.json`
  L'eventuale nome del bucket manuale viene memorizzato in `tools/admin-panel/.secrets/customBucket.txt`.
* La cartella `.secrets/` è inserita nel file `tools/admin-panel/.gitignore` ed è permanentemente esclusa dal versionamento git.
* **Perché la chiave non va condivisa né caricata su git**:
  Il file JSON del service account contiene una chiave crittografica RSA privata con privilegi amministrativi completi. Tale chiave consente il pieno controllo in lettura, scrittura e cancellazione su tutte le collezioni del database Cloud Firestore e su tutti i file presenti in Firebase Storage, scavalcando qualsiasi regola di sicurezza impostata per i client mobili. Se questo file venisse caricato su un repository pubblico o condiviso con terzi, chiunque ne entri in possesso avrebbe accesso incondizionato all'intera infrastruttura cloud del progetto.

### Cosa fare se la chiave finisce in un posto sbagliato

Se la chiave viene accidentalmente esposta, inclusa in un commit git o condivisa in canali non sicuri:

1. Accedere immediatamente alla [Console Google Cloud](https://console.cloud.google.com/).
2. Nel menu di navigazione, selezionare **IAM e amministrazione** → **Account di servizio**.
3. Individuare l'account di servizio Firebase Admin SDK associato al progetto e fare clic su di esso.
4. Aprire la scheda **Chiavi**.
5. Individuare la chiave compromessa (identificabile tramite l'ID chiave o la data di creazione) e fare clic sull'icona del cestino (**Elimina**) per revocarla all'istante. Una volta eliminata dalla console, la chiave non potrà più essere utilizzata per accedere ai servizi cloud.
6. Fare clic su **Aggiungi chiave** → **Crea nuova chiave** (formato JSON) per generare una nuova coppia di credenziali sicura e caricarla nel pannello dalle **Impostazioni**.

---

## 4. Funzioni del pannello

Il pannello è organizzato in tre schede principali: **Catalogo**, **Utenti** e **Impostazioni**.

### Sezione Catalogo

La sezione lavora su un utente alla volta:

* **Profilo utente**:
  * Selettore a tendina **Seleziona utente:** per scegliere il profilo su cui operare. Accanto al selettore, l'etichetta di riepilogo mostra il limite di download giornaliero e i brani scaricati oggi per l'utente selezionato.
* **Nuova canzone (Upload manuale)**:
  * Box di caricamento **Trascina l'mp3 qui oppure clicca per selezionarlo** per scegliere il file audio (limite massimo 100 MB).
  * Pulsante **Scegli copertina (opzionale)** per associare un'immagine (qualsiasi file accettato dal filtro `image/*`).
  * Campi di testo **Titolo** e **Artista** con precompilazione automatica dai metadati ID3 del file audio tramite la libreria `jsmediatags`.
  * Indicatori di sola lettura **Durata** e **Dimensione file**.
  * Sopra il modulo è sempre visibile l'avviso sulla responsabilità dei contenuti caricati.
  * Pulsante **Carica su Firebase**: normalizza il volume del file con `ffmpeg`, poi carica il file audio in `songs/` e l'eventuale copertina in `covers/` su Firebase Storage (generando un token UUID per il download sicuro), quindi crea il documento corrispondente nella collezione `songs` di Firestore.
* **Catalogo attuale**:
  * Tabella dei brani associati all'utente con colonne **Titolo**, **Artista**, **Durata**, **Dimensione** e **Azioni**.
  * Pulsante **Modifica** su ciascuna riga: apre la finestra modale **Modifica canzone** per modificare i campi **Titolo** e **Artista** su Firestore (con pulsanti **Annulla** e **Salva modifiche**).
  * Pulsante **Elimina** su ciascuna riga: rimuove il file audio e l'eventuale copertina da Firebase Storage ed elimina definitivamente il documento da Firestore.
  * Pulsante rosso **🗑 Elimina TUTTE le canzoni di questo utente**: apre la finestra modale di sicurezza **Attenzione: Eliminazione massiva**. L'operazione richiede la digitazione esatta della frase di conferma `EliminaTutteLeCanzoni` prima di abilitare il pulsante **Elimina tutto** (o **Annulla** per chiudere senza modifiche).

---

### Sezione Utenti

Consente la gestione completa dei profili abilitati all'accesso dall'app Android:

* **Nuovo utente**:
  * Modulo con campi **Username**, **Password** (in chiaro nel campo, trasformata istantaneamente in hash SHA-256 senza sale nel browser prima dell'invio) e **Limite giornaliero** (default 5).
  * Pulsante **Crea utente**: valida i dati, verifica l'assenza di duplicati di username e registra il nuovo utente su Firestore. La tabella utenti e il menu a tendina del Catalogo vengono sincronizzati immediatamente.
* **Utenti registrati**:
  * Tabella completa dei profili con colonne **Username**, **Limite / Oggi** (con badge colorati verde/giallo/rosso in base alla percentuale di limite consumata), **Ultimo download** e **Azioni**.
  * Pulsante **Azzera conteggio** su ciascuna riga: previa conferma del browser, reimposta a `0` il numero di brani scaricati oggi (`downloadedToday`) per l'utente, aggiornando la data odierna.
  * Pulsante **Modifica** su ciascuna riga: apre la modale **Modifica utente** per aggiornare **Username**, **Nuova password (lascia vuoto per non cambiarla)**, **Limite giornaliero** e **Scaricati oggi** (pulsanti **Annulla** e **Salva modifiche**).
  * Pulsante **Elimina** su ciascuna riga: previa conferma con riepilogo del nome utente, elimina definitivamente il profilo da Firestore e aggiorna la tabella e il Catalogo.

#### Regole di validazione dei campi utente

Durante la creazione o la modifica di un utente, il server applica le seguenti regole e restituisce un messaggio d'errore se non vengono rispettate:
* **Username**: gli spazi iniziali e finali vengono rimossi automaticamente (trim); non può essere vuoto e non può essere già assegnato a un altro profilo (controllo di unicità).
* **Password**: obbligatoria in creazione; in modifica può essere lasciata vuota per non alterare quella esistente. Viene convertita dal browser in hash esadecimale di 64 caratteri prima dell'invio.
* **Limite giornaliero**: se specificato, deve essere un numero intero maggiore o uguale a 1 (valore predefinito: 5).
* **Scaricati oggi** (in modifica): deve essere un numero intero maggiore o uguale a 0.

---

## 5. Avvertenze importanti

1. **Rinominare un utente non sposta i suoi brani**:
   Nella collezione `songs`, ogni brano è collegato al rispettivo proprietario tramite il campo testuale `userName`. La modifica dello username nella sezione **Utenti** aggiorna unicamente il documento del profilo nella collezione `users`; i brani precedentemente caricati continuano a mantenere il vecchio valore nel campo `userName` e pertanto **non compariranno più nel catalogo dell'utente rinominato**.
2. **Eliminare un utente non elimina i suoi brani**:
   La cancellazione di un utente dalla sezione **Utenti** elimina solo il documento dell'account in `users`. Tutti i file MP3, le copertine in Storage e i record in `songs` restano intatti nel cloud. Se si intende rimuovere completamente anche i contenuti musicali di un profilo, è necessario eseguire prima **🗑 Elimina TUTTE le canzoni di questo utente** dalla sezione **Catalogo** e solo successivamente procedere con l'eliminazione dell'account utente.
3. **L'eliminazione di tutte le canzoni è irreversibile**:
   L'operazione **🗑 Elimina TUTTE le canzoni di questo utente** rimuove in modo permanente e non recuperabile sia i file binari da Firebase Storage (audio e immagini) sia i documenti descrittivi da Firestore. Per prevenire cancellazioni accidentali, la finestra modale richiede obbligatoriamente l'inserimento testuale della parola di sicurezza `EliminaTutteLeCanzoni`.
