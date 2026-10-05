// Logica frontend per il Pannello di Amministrazione (Catalogo, Utenti, Impostazioni)

// ==================== NAVIGAZIONE TAB PRINCIPALE ====================
const tabs = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

function switchTab(tabId) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
  tabContents.forEach((c) => {
    c.style.display = c.id === `${tabId}Section` ? 'block' : 'none';
  });
  if (tabId === 'users') {
    loadUsersTable();
  }
}

// ==================== SEZIONE IMPOSTAZIONI (TASK 10) ====================
const statusBadge = document.getElementById('statusBadge');
const connectionDetails = document.getElementById('connectionDetails');
const projectIdVal = document.getElementById('projectIdVal');
const storageBucketVal = document.getElementById('storageBucketVal');
const alertBox = document.getElementById('alertBox');

const formTitle = document.getElementById('formTitle');
const keyForm = document.getElementById('keyForm');
const keyFileInput = document.getElementById('keyFileInput');
const customBucketGroup = document.getElementById('customBucketGroup');
const customBucketInput = document.getElementById('customBucketInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const deleteKeyBtn = document.getElementById('deleteKeyBtn');

function showAlert(message, type = 'error') {
  alertBox.style.display = 'block';
  alertBox.className = `alert-box alert-${type}`;
  alertBox.textContent = message;
}

function clearAlert() {
  alertBox.style.display = 'none';
  alertBox.textContent = '';
  alertBox.className = 'alert-box';
}

async function fetchStatus() {
  clearAlert();
  try {
    const res = await fetch('/api/settings/status');
    const data = await res.json();

    if (data.connected) {
      statusBadge.textContent = 'Connesso';
      statusBadge.className = 'badge badge-connected';
      connectionDetails.style.display = 'block';
      projectIdVal.textContent = data.projectId || '—';
      storageBucketVal.textContent = data.storageBucket || '—';

      formTitle.textContent = 'Sostituisci chiave del database';
      saveKeyBtn.textContent = 'Sostituisci chiave';
      deleteKeyBtn.style.display = 'inline-block';
      customBucketGroup.style.display = 'none';

      // Carica utenti per il catalogo e per la sezione utenti se connesso
      loadUsers();
      loadUsersTable();
    } else {
      statusBadge.textContent = 'Non connesso';
      statusBadge.className = 'badge badge-disconnected';
      connectionDetails.style.display = 'none';
      projectIdVal.textContent = '—';
      storageBucketVal.textContent = '—';

      formTitle.textContent = 'Carica chiave del database';
      saveKeyBtn.textContent = 'Salva chiave';
      deleteKeyBtn.style.display = 'none';

      // Mostra le impostazioni se non connesso
      switchTab('settings');

      if (data.error && data.error !== 'Nessuna chiave configurata') {
        showAlert(data.error, 'error');
      }
    }
  } catch (err) {
    statusBadge.textContent = 'Errore server';
    statusBadge.className = 'badge badge-disconnected';
    showAlert('Impossibile contattare il server locale.', 'error');
  }
}

keyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const file = keyFileInput.files[0];
  if (!file) {
    showAlert('Seleziona un file JSON di credenziali.', 'error');
    return;
  }

  saveKeyBtn.disabled = true;
  saveKeyBtn.textContent = 'Verifica in corso…';

  const formData = new FormData();
  formData.append('keyFile', file);
  if (customBucketInput.value.trim()) {
    formData.append('customBucket', customBucketInput.value.trim());
  }

  try {
    const res = await fetch('/api/settings/key', {
      method: 'POST',
      headers: { 'X-Admin-Panel': 'true' },
      body: formData
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAlert('✓ Connessione al database riuscita!', 'success');
      keyFileInput.value = '';
      customBucketInput.value = '';
      await fetchStatus();
    } else if (res.status === 422 && data.needCustomBucket) {
      customBucketGroup.style.display = 'flex';
      showAlert(data.error || 'Bucket non trovato. Inserisci il nome del bucket manualmente.', 'warning');
    } else {
      showAlert(`✗ ${data.error || 'Errore durante la configurazione della chiave.'}`, 'error');
    }
  } catch (err) {
    showAlert(`✗ Errore di rete: ${err.message}`, 'error');
  } finally {
    saveKeyBtn.disabled = false;
    saveKeyBtn.textContent = formTitle.textContent.includes('Sostituisci') ? 'Sostituisci chiave' : 'Salva chiave';
  }
});

deleteKeyBtn.addEventListener('click', async () => {
  if (!confirm('Sei sicuro di voler eliminare la chiave salvata? La connessione al database verrà interrotta.')) {
    return;
  }

  clearAlert();
  deleteKeyBtn.disabled = true;

  try {
    const res = await fetch('/api/settings/key', {
      method: 'DELETE',
      headers: { 'X-Admin-Panel': 'true' }
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAlert('Chiave eliminata con successo.', 'success');
      await fetchStatus();
    } else {
      showAlert(`✗ ${data.error || 'Errore durante l\'eliminazione della chiave.'}`, 'error');
    }
  } catch (err) {
    showAlert(`✗ Errore di rete: ${err.message}`, 'error');
  } finally {
    deleteKeyBtn.disabled = false;
  }
});

// ==================== FORMATTAZIONE UTILITY ====================
function fmtDuration(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function fmtSize(bytes) {
  if (!bytes || isNaN(bytes)) return '—';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ==================== STATO CATALOGO E UTENTI ====================
let usersList = [];
let currentUser = null;

// ==================== CARICAMENTO UTENTI ====================
const userSelect = document.getElementById('userSelect');
const userInfo = document.getElementById('userInfo');
const singleContent = document.getElementById('singleContent');

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) {
      if (res.status === 503) {
        userSelect.innerHTML = '<option value="">— Database non configurato —</option>';
        return;
      }
      throw new Error('Errore durante il caricamento degli utenti');
    }
    usersList = await res.json();

    // Popola dropdown utente singolo (N3: creazione elementi sicura)
    userSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '— Seleziona un profilo —';
    userSelect.appendChild(defaultOption);

    usersList.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = u.username;
      userSelect.appendChild(opt);
    });

    if (currentUser) {
      const exists = usersList.find((u) => u.username === currentUser.username);
      if (exists) {
        userSelect.value = exists.username;
        selectUser(exists);
      } else {
        currentUser = null;
        userSelect.value = '';
        singleContent.style.display = 'none';
        userInfo.textContent = '';
      }
    }
  } catch (err) {
    userSelect.innerHTML = '<option value="">— Errore caricamento —</option>';
  }
}

userSelect.addEventListener('change', () => {
  const selectedUsername = userSelect.value;
  const user = usersList.find((u) => u.username === selectedUsername);
  selectUser(user);
});

function selectUser(user) {
  currentUser = user || null;
  if (!currentUser) {
    singleContent.style.display = 'none';
    userInfo.textContent = '';
    return;
  }

  singleContent.style.display = 'block';
  userInfo.textContent = `Limite: ${currentUser.dailyDownloadLimit} | Scaricati oggi: ${currentUser.downloadedToday || 0}`;

  loadSongs();
}

// ==================== UPLOAD MANUALE BRANO ====================
const dropZone = document.getElementById('dropZone');
const dropZoneText = document.getElementById('dropZoneText');
const mp3Input = document.getElementById('mp3Input');
const coverPickBtn = document.getElementById('coverPickBtn');
const coverInput = document.getElementById('coverInput');
const coverThumb = document.getElementById('coverThumb');
const titleInput = document.getElementById('titleInput');
const artistInput = document.getElementById('artistInput');
const durationReadout = document.getElementById('durationReadout');
const sizeReadout = document.getElementById('sizeReadout');
const submitBtn = document.getElementById('submitBtn');
const uploadStatusLine = document.getElementById('uploadStatusLine');

let selectedMp3File = null;
let selectedCoverFile = null;
let calculatedDurationMs = 0;

dropZone.addEventListener('click', () => mp3Input.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) {
    handleMp3Selection(e.dataTransfer.files[0]);
  }
});

mp3Input.addEventListener('change', () => {
  if (mp3Input.files?.[0]) {
    handleMp3Selection(mp3Input.files[0]);
  }
});

coverPickBtn.addEventListener('click', () => coverInput.click());
coverInput.addEventListener('change', () => {
  if (coverInput.files?.[0]) {
    handleCoverSelection(coverInput.files[0]);
  }
});

function handleMp3Selection(file) {
  selectedMp3File = file;
  dropZoneText.textContent = `Selezionato: ${file.name}`;
  sizeReadout.value = fmtSize(file.size);
  submitBtn.disabled = false;

  // Calcolo durata tramite elemento Audio nativo del browser
  const audio = new Audio();
  audio.src = URL.createObjectURL(file);
  audio.onloadedmetadata = () => {
    calculatedDurationMs = Math.round(audio.duration * 1000);
    durationReadout.value = fmtDuration(calculatedDurationMs);
    URL.revokeObjectURL(audio.src);
  };
  audio.onerror = () => {
    calculatedDurationMs = 0;
    durationReadout.value = '—';
  };

  // Estrazione tag ID3 (se jsmediatags è caricato)
  if (window.jsmediatags) {
    window.jsmediatags.read(file, {
      onSuccess: (tag) => {
        const tags = tag.tags;
        if (tags.title && !titleInput.value) titleInput.value = tags.title;
        if (tags.artist && !artistInput.value) artistInput.value = tags.artist;
        if (tags.picture && !selectedCoverFile) {
          const { data, format } = tags.picture;
          const base64 = data.map((char) => String.fromCharCode(char)).join('');
          coverThumb.style.backgroundImage = `url('data:${format};base64,${btoa(base64)}')`;
        }
      },
      onError: () => {}
    });
  }

  if (!titleInput.value) {
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    titleInput.value = rawName;
  }
}

function handleCoverSelection(file) {
  selectedCoverFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    coverThumb.style.backgroundImage = `url('${e.target.result}')`;
  };
  reader.readAsDataURL(file);
}

submitBtn.addEventListener('click', async () => {
  if (!selectedMp3File || !currentUser) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Caricamento in corso…';
  uploadStatusLine.className = 'status-line';
  uploadStatusLine.textContent = 'Invio file e salvataggio metadati…';

  const formData = new FormData();
  formData.append('mp3', selectedMp3File);
  if (selectedCoverFile) {
    formData.append('cover', selectedCoverFile);
  }
  formData.append('title', titleInput.value.trim() || selectedMp3File.name);
  formData.append('artist', artistInput.value.trim() || 'Sconosciuto');
  formData.append('duration', calculatedDurationMs || 0);
  formData.append('fileSizeBytes', selectedMp3File.size);
  formData.append('userName', currentUser.username);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-Admin-Panel': 'true' },
      body: formData
    });
    const data = await res.json();

    if (res.ok && data.success) {
      uploadStatusLine.className = 'status-line ok';
      uploadStatusLine.textContent = '✓ Brano caricato con successo nel catalogo!';
      resetUploadForm();
      loadSongs();
    } else {
      uploadStatusLine.className = 'status-line err';
      uploadStatusLine.textContent = `✗ ${data.error || 'Errore durante il caricamento'}`;
    }
  } catch (err) {
    uploadStatusLine.className = 'status-line err';
    uploadStatusLine.textContent = `✗ Errore di rete: ${err.message}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Carica su Firebase';
  }
});

function resetUploadForm() {
  selectedMp3File = null;
  selectedCoverFile = null;
  calculatedDurationMs = 0;
  mp3Input.value = '';
  coverInput.value = '';
  dropZoneText.innerHTML = '<strong>Trascina l\'mp3 qui</strong> oppure clicca per selezionarlo';
  coverThumb.style.backgroundImage = '';
  titleInput.value = '';
  artistInput.value = '';
  durationReadout.value = '—';
  sizeReadout.value = '—';
  submitBtn.disabled = true;
}

// ==================== VISUALIZZAZIONE CATALOGO BRANI ====================
const songsBody = document.getElementById('songsBody');
const deleteAllSection = document.getElementById('deleteAllSection');
const deleteAllBtn = document.getElementById('deleteAllBtn');

async function loadSongs() {
  if (!currentUser) return;

  songsBody.innerHTML = '';
  const tr = document.createElement('tr');
  tr.className = 'empty-row';
  const td = document.createElement('td');
  td.colSpan = 5;
  td.textContent = 'Caricamento canzoni in corso…';
  tr.appendChild(td);
  songsBody.appendChild(tr);

  try {
    const res = await fetch(`/api/songs?userName=${encodeURIComponent(currentUser.username)}`);
    if (!res.ok) throw new Error('Errore durante la lettura delle canzoni');
    const songs = await res.json();

    songsBody.innerHTML = '';
    if (!songs.length) {
      const emptyTr = document.createElement('tr');
      emptyTr.className = 'empty-row';
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = 5;
      emptyTd.textContent = 'Nessuna canzone nel catalogo per questo utente';
      emptyTr.appendChild(emptyTd);
      songsBody.appendChild(emptyTr);
      deleteAllSection.style.display = 'none';
      return;
    }

    deleteAllSection.style.display = 'block';

    songs.forEach((s) => {
      const row = document.createElement('tr');

      const titleTd = document.createElement('td');
      titleTd.textContent = s.title || 'Senza titolo';
      row.appendChild(titleTd);

      const artistTd = document.createElement('td');
      artistTd.textContent = s.artist || 'Sconosciuto';
      row.appendChild(artistTd);

      const durTd = document.createElement('td');
      durTd.className = 'mono';
      durTd.textContent = fmtDuration(s.duration);
      row.appendChild(durTd);

      const sizeTd = document.createElement('td');
      sizeTd.className = 'mono';
      sizeTd.textContent = fmtSize(s.fileSizeBytes);
      row.appendChild(sizeTd);

      const actionTd = document.createElement('td');
      const actionDiv = document.createElement('div');
      actionDiv.className = 'action-btns';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Modifica';
      editBtn.dataset.id = s.id;
      editBtn.dataset.title = s.title || '';
      editBtn.dataset.artist = s.artist || '';
      editBtn.addEventListener('click', () => {
        openEditModal(editBtn.dataset.id, editBtn.dataset.title, editBtn.dataset.artist);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'del-btn';
      delBtn.textContent = 'Elimina';
      delBtn.dataset.id = s.id;
      delBtn.dataset.title = s.title || '';
      delBtn.addEventListener('click', () => {
        deleteSong(delBtn.dataset.id, delBtn.dataset.title);
      });

      actionDiv.appendChild(editBtn);
      actionDiv.appendChild(delBtn);
      actionTd.appendChild(actionDiv);
      row.appendChild(actionTd);

      songsBody.appendChild(row);
    });
  } catch (err) {
    songsBody.innerHTML = '';
    const errTr = document.createElement('tr');
    errTr.className = 'empty-row';
    const errTd = document.createElement('td');
    errTd.colSpan = 5;
    errTd.textContent = `Errore nel caricamento del catalogo: ${err.message}`;
    errTr.appendChild(errTd);
    songsBody.appendChild(errTr);
    deleteAllSection.style.display = 'none';
  }
}

// ==================== MODIFICA CANZONE ====================
const editModal = document.getElementById('editModal');
const editTitleInput = document.getElementById('editTitleInput');
const editArtistInput = document.getElementById('editArtistInput');
const editCancelBtn = document.getElementById('editCancelBtn');
const editSaveBtn = document.getElementById('editSaveBtn');
let currentEditingId = null;

function openEditModal(id, title, artist) {
  currentEditingId = id;
  editTitleInput.value = title;
  editArtistInput.value = artist;
  editModal.classList.add('active');
  editTitleInput.focus();
}

function closeEditModal() {
  editModal.classList.remove('active');
  currentEditingId = null;
  editTitleInput.value = '';
  editArtistInput.value = '';
}

editCancelBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

editSaveBtn.addEventListener('click', async () => {
  if (!currentEditingId) return;

  const newTitle = editTitleInput.value.trim();
  const newArtist = editArtistInput.value.trim();
  if (!newTitle) {
    editTitleInput.focus();
    return;
  }

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = 'Salvataggio…';

  try {
    const res = await fetch(`/api/songs/${currentEditingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': 'true'
      },
      body: JSON.stringify({ title: newTitle, artist: newArtist || 'Sconosciuto' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio');

    closeEditModal();
    loadSongs();
  } catch (err) {
    alert(`Errore: ${err.message}`);
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = 'Salva modifiche';
  }
});

// ==================== ELIMINAZIONE SINGOLA CANZONE ====================
async function deleteSong(id, title) {
  if (!confirm(`Eliminare "${title}" dal catalogo?`)) return;

  try {
    const res = await fetch(`/api/songs/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Panel': 'true' }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Errore durante l\'eliminazione');
    }
    loadSongs();
  } catch (err) {
    alert(`Errore eliminazione: ${err.message}`);
  }
}

// ==================== ELIMINAZIONE MASSIVA CANZONI ====================
const deleteAllModal = document.getElementById('deleteAllModal');
const deleteAllUsername = document.getElementById('deleteAllUsername');
const deleteAllConfirmInput = document.getElementById('deleteAllConfirmInput');
const deleteAllCancelBtn = document.getElementById('deleteAllCancelBtn');
const deleteAllConfirmBtn = document.getElementById('deleteAllConfirmBtn');

deleteAllBtn.addEventListener('click', () => {
  if (!currentUser) return;
  deleteAllUsername.textContent = currentUser.username;
  deleteAllConfirmInput.value = '';
  deleteAllConfirmBtn.disabled = true;
  deleteAllModal.classList.add('active');
  deleteAllConfirmInput.focus();
});

deleteAllConfirmInput.addEventListener('input', () => {
  const isValid = deleteAllConfirmInput.value === 'EliminaTutteLeCanzoni';
  deleteAllConfirmBtn.disabled = !isValid;
});

function closeDeleteAllModal() {
  deleteAllModal.classList.remove('active');
  deleteAllConfirmInput.value = '';
  deleteAllConfirmBtn.disabled = true;
}

deleteAllCancelBtn.addEventListener('click', closeDeleteAllModal);
deleteAllModal.addEventListener('click', (e) => {
  if (e.target === deleteAllModal) closeDeleteAllModal();
});

deleteAllConfirmBtn.addEventListener('click', async () => {
  if (!currentUser || deleteAllConfirmInput.value !== 'EliminaTutteLeCanzoni') return;

  deleteAllConfirmBtn.disabled = true;
  deleteAllConfirmBtn.textContent = 'Eliminazione in corso…';

  try {
    const res = await fetch(`/api/songs/user/${encodeURIComponent(currentUser.username)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Panel': 'true' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore');

    closeDeleteAllModal();
    alert(`✅ Eliminate ${data.deleted} canzoni di "${currentUser.username}"`);
    loadSongs();
  } catch (err) {
    alert(`✗ Errore: ${err.message}`);
    deleteAllConfirmBtn.disabled = false;
    deleteAllConfirmBtn.textContent = 'Elimina tutto';
  }
});

// ==================== SEZIONE GESTIONE UTENTI (TASK 12) ====================

// Funzione calcolo hash SHA-256 (D4)
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Elementi DOM Sezione Utenti
const newUsernameInput = document.getElementById('newUsername');
const newPasswordInput = document.getElementById('newPassword');
const newLimitInput = document.getElementById('newLimit');
const createUserBtn = document.getElementById('createUserBtn');
const createUserStatus = document.getElementById('createUserStatus');

const usersTableBody = document.getElementById('usersTableBody');

// Elementi Modale Modifica Utente
const modalEditUser = document.getElementById('modalEditUser');
const modalEditUserTitle = document.getElementById('modalEditUserTitle');
const editUserUsernameInput = document.getElementById('editUserUsername');
const editUserPasswordInput = document.getElementById('editUserPassword');
const editUserLimitInput = document.getElementById('editUserLimit');
const editUserDownloadedTodayInput = document.getElementById('editUserDownloadedToday');
const editUserCancelBtn = document.getElementById('editUserCancelBtn');
const editUserSaveBtn = document.getElementById('editUserSaveBtn');
const editUserStatus = document.getElementById('editUserStatus');

let currentEditingUserId = null;

// Calcolo classe badge limite
function getLimitBadgeClass(downloaded, limit) {
  const d = Number(downloaded) || 0;
  const l = Number(limit) || 5;
  if (d >= l) return 'badge limit-full';
  if (d >= l * 0.7) return 'badge limit-warn';
  return 'badge limit-ok';
}

// Caricamento tabella utenti
async function loadUsersTable() {
  if (!usersTableBody) return;

  usersTableBody.innerHTML = '';
  const loadingTr = document.createElement('tr');
  loadingTr.className = 'empty-row';
  const loadingTd = document.createElement('td');
  loadingTd.colSpan = 4;
  loadingTd.textContent = 'Caricamento utenti…';
  loadingTr.appendChild(loadingTd);
  usersTableBody.appendChild(loadingTr);

  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Errore durante la lettura degli utenti');
    const userList = await res.json();

    usersTableBody.innerHTML = '';
    if (!userList.length) {
      const emptyTr = document.createElement('tr');
      emptyTr.className = 'empty-row';
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = 4;
      emptyTd.textContent = 'Nessun utente registrato';
      emptyTr.appendChild(emptyTd);
      usersTableBody.appendChild(emptyTr);
      return;
    }

    userList.forEach((u) => {
      const tr = document.createElement('tr');

      // Colonna 1: Username
      const tdUsername = document.createElement('td');
      const strongUsername = document.createElement('strong');
      strongUsername.textContent = u.username || '';
      tdUsername.appendChild(strongUsername);
      tr.appendChild(tdUsername);

      // Colonna 2: Limite / Oggi
      const tdLimit = document.createElement('td');
      const limitBadge = document.createElement('span');
      limitBadge.className = getLimitBadgeClass(u.downloadedToday, u.dailyDownloadLimit);
      limitBadge.textContent = `${u.downloadedToday} / ${u.dailyDownloadLimit}`;
      tdLimit.appendChild(limitBadge);

      const remaining = Number(u.dailyDownloadLimit) - Number(u.downloadedToday);
      if (remaining > 0) {
        const remSpan = document.createElement('span');
        remSpan.style.color = 'var(--text-dim)';
        remSpan.style.fontSize = '11px';
        remSpan.style.marginLeft = '6px';
        remSpan.textContent = `(${remaining} rimasti)`;
        tdLimit.appendChild(remSpan);
      }
      tr.appendChild(tdLimit);

      // Colonna 3: Ultimo download
      const tdLast = document.createElement('td');
      tdLast.className = 'mono';
      tdLast.textContent = u.lastDownloadDate || '—';
      tr.appendChild(tdLast);

      // Colonna 4: Azioni
      const tdActions = document.createElement('td');
      const actionDiv = document.createElement('div');
      actionDiv.className = 'action-btns';

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'reset-btn';
      resetBtn.textContent = 'Azzera conteggio';
      resetBtn.dataset.id = u.id;
      resetBtn.addEventListener('click', () => {
        resetUserDownloads(u.id);
      });

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Modifica';
      editBtn.addEventListener('click', () => {
        openEditUserModal(u);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'del-btn';
      delBtn.textContent = 'Elimina';
      delBtn.dataset.id = u.id;
      delBtn.dataset.username = u.username || '';
      delBtn.addEventListener('click', () => {
        deleteUserAccount(u.id, u.username || '');
      });

      actionDiv.appendChild(resetBtn);
      actionDiv.appendChild(editBtn);
      actionDiv.appendChild(delBtn);
      tdActions.appendChild(actionDiv);
      tr.appendChild(tdActions);

      usersTableBody.appendChild(tr);
    });
  } catch (err) {
    usersTableBody.innerHTML = '';
    const errTr = document.createElement('tr');
    errTr.className = 'empty-row';
    const errTd = document.createElement('td');
    errTd.colSpan = 4;
    errTd.textContent = `Errore caricamento utenti: ${err.message}`;
    errTr.appendChild(errTd);
    usersTableBody.appendChild(errTr);
  }
}

// Creazione utente
createUserBtn.addEventListener('click', async () => {
  const username = newUsernameInput.value.trim();
  const password = newPasswordInput.value;
  const limitVal = newLimitInput.value;

  createUserStatus.style.display = 'block';
  createUserStatus.className = 'status-line';

  if (!username) {
    createUserStatus.className = 'status-line err';
    createUserStatus.textContent = '✗ Inserisci un username';
    return;
  }
  if (!password) {
    createUserStatus.className = 'status-line err';
    createUserStatus.textContent = '✗ Inserisci una password';
    return;
  }

  createUserBtn.disabled = true;
  createUserStatus.textContent = '⏳ Calcolo hash e creazione utente…';

  try {
    const passwordHash = await sha256(password);
    newPasswordInput.value = '';

    const payload = {
      username,
      passwordHash,
      dailyDownloadLimit: limitVal !== '' ? Number(limitVal) : 5
    };

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': 'true'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Errore durante la creazione dell\'utente');
    }

    createUserStatus.className = 'status-line ok';
    createUserStatus.textContent = `✓ Utente "${username}" creato con successo`;

    newUsernameInput.value = '';
    newPasswordInput.value = '';
    newLimitInput.value = '5';

    // Ricarica la tabella utenti e il selettore utenti del Catalogo
    await loadUsersTable();
    await loadUsers();
  } catch (err) {
    createUserStatus.className = 'status-line err';
    createUserStatus.textContent = `✗ Errore: ${err.message}`;
  } finally {
    createUserBtn.disabled = false;
  }
});

// Apertura modale modifica utente
function openEditUserModal(u) {
  currentEditingUserId = u.id;
  modalEditUserTitle.textContent = `Modifica utente: ${u.username || ''}`;
  editUserUsernameInput.value = u.username || '';
  editUserPasswordInput.value = '';
  editUserLimitInput.value = u.dailyDownloadLimit !== undefined ? u.dailyDownloadLimit : 5;
  editUserDownloadedTodayInput.value = u.downloadedToday !== undefined ? u.downloadedToday : 0;
  editUserStatus.style.display = 'none';
  editUserStatus.textContent = '';
  modalEditUser.classList.add('active');
  editUserUsernameInput.focus();
}

editUserCancelBtn.addEventListener('click', () => {
  modalEditUser.classList.remove('active');
  currentEditingUserId = null;
});

modalEditUser.addEventListener('click', (e) => {
  if (e.target === modalEditUser) {
    modalEditUser.classList.remove('active');
    currentEditingUserId = null;
  }
});

// Salvataggio modifiche utente
editUserSaveBtn.addEventListener('click', async () => {
  if (!currentEditingUserId) return;

  const username = editUserUsernameInput.value.trim();
  const password = editUserPasswordInput.value;
  const limitVal = editUserLimitInput.value;
  const downloadedVal = editUserDownloadedTodayInput.value;

  editUserStatus.style.display = 'block';
  editUserStatus.className = 'status-line';

  if (!username) {
    editUserStatus.className = 'status-line err';
    editUserStatus.textContent = '✗ Lo username non può essere vuoto';
    return;
  }

  editUserSaveBtn.disabled = true;
  editUserStatus.textContent = '⏳ Salvataggio modifiche…';

  try {
    const updateData = {
      username,
      dailyDownloadLimit: limitVal,
      downloadedToday: downloadedVal
    };

    if (password) {
      updateData.passwordHash = await sha256(password);
      editUserPasswordInput.value = '';
    }

    const res = await fetch(`/api/users/${encodeURIComponent(currentEditingUserId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': 'true'
      },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Errore durante l\'aggiornamento dell\'utente');
    }

    modalEditUser.classList.remove('active');
    currentEditingUserId = null;

    await loadUsersTable();
    await loadUsers();
  } catch (err) {
    editUserStatus.className = 'status-line err';
    editUserStatus.textContent = `✗ Errore: ${err.message}`;
  } finally {
    editUserSaveBtn.disabled = false;
  }
});

// Azzeramento download giornalieri utente
async function resetUserDownloads(userId) {
  if (!confirm('Azzerare il conteggio download di oggi per questo utente?')) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': 'true'
      },
      body: JSON.stringify({ downloadedToday: 0, lastDownloadDate: today })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore reset');

    await loadUsersTable();
    await loadUsers();
  } catch (err) {
    alert(`✗ Errore: ${err.message}`);
  }
}

// Eliminazione utente
async function deleteUserAccount(userId, username) {
  if (!confirm(`Eliminare definitivamente l'utente "${username}"?`)) return;
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Panel': 'true'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore eliminazione');

    await loadUsersTable();
    await loadUsers();
    if (currentUser && currentUser.username === username) {
      currentUser = null;
      userSelect.value = '';
      userInfo.textContent = '';
      singleContent.style.display = 'none';
    }
  } catch (err) {
    alert(`✗ Errore: ${err.message}`);
  }
}

// ==================== INIZIALIZZAZIONE ====================
fetchStatus();
