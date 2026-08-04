'use strict';

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0Sz7MgJp9m-bIoKZq5WCm0-UpFoUyxa4",
  authDomain: "baustellen-tracker-ebo.firebaseapp.com",
  projectId: "baustellen-tracker-ebo",
  storageBucket: "baustellen-tracker-ebo.firebasestorage.app",
  messagingSenderId: "1035472747084",
  appId: "1:1035472747084:web:9190c057f5375ade1512e9"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

const state = {
  user: null,
  tasks: [],
  todos: [],
  hours: [],
  unsubs: [],
  authMode: 'login'
};

const STATUS_LABEL = {
  pending: '⏳ Start ausstehend',
  blocked: '🚫 Blockiert',
  inprogress: '🔄 In Bearbeitung',
  done: '✅ Erledigt'
};

const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const loginSuccess = document.getElementById('login-success');
const authTitle = document.getElementById('auth-title');
const authSub = document.getElementById('auth-sub');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const linkForgot = document.getElementById('link-forgot');
const linkToggleMode = document.getElementById('link-toggle-mode') || null;

const appDiv = document.getElementById('app');

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

const modalTask = document.getElementById('modal-task');
const modalTodo = document.getElementById('modal-todo');
const modalHours = document.getElementById('modal-hours');
const modalPin = document.getElementById('modal-pin');

loginForm.addEventListener('submit', handleAuthSubmit);
linkForgot.addEventListener('click', handleForgotPassword);

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
document.getElementById('btn-logout-sidebar').addEventListener('click', () => signOut(auth));
document.getElementById('hamburger').addEventListener('click', toggleSidebar);
overlay.addEventListener('click', closeSidebar);
document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    link.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
    closeSidebar();

    if (page === 'calendar') renderGantt();
    else if (page === 'current') renderTodos();
    else if (page === 'hours') renderHours();
    else { renderStats(); renderTasks(); }
  });
});

document.getElementById('btn-add-task').addEventListener('click', () => openTaskModal());
document.getElementById('btn-cancel-task').addEventListener('click', () => modalTask.classList.add('hidden'));
modalTask.addEventListener('click', e => { if (e.target === modalTask) modalTask.classList.add('hidden'); });
document.getElementById('btn-save-task').addEventListener('click', saveTask);

document.getElementById('btn-add-todo').addEventListener('click', () => openTodoModal());
document.getElementById('btn-cancel-todo').addEventListener('click', () => modalTodo.classList.add('hidden'));
modalTodo.addEventListener('click', e => { if (e.target === modalTodo) modalTodo.classList.add('hidden'); });
document.getElementById('btn-save-todo').addEventListener('click', saveTodo);

document.getElementById('btn-add-hours').addEventListener('click', () => openHoursModal());
document.getElementById('btn-cancel-hours').addEventListener('click', () => modalHours.classList.add('hidden'));
modalHours.addEventListener('click', e => { if (e.target === modalHours) modalHours.classList.add('hidden'); });
document.getElementById('btn-save-hours').addEventListener('click', saveHoursEntry);
document.getElementById('hours-filter-worker').addEventListener('change', () => renderHours());
['hr-start','hr-end','hr-break'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateHoursPreview);
});

document.getElementById('btn-change-password').addEventListener('click', () => {
  ['pin-current','pin-new','pin-confirm'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('pin-error').classList.add('hidden');
  modalPin.classList.remove('hidden');
});
document.getElementById('btn-cancel-pin').addEventListener('click', () => modalPin.classList.add('hidden'));
modalPin.addEventListener('click', e => { if (e.target === modalPin) modalPin.classList.add('hidden'); });
document.getElementById('btn-save-pin').addEventListener('click', handleChangePassword);

document.getElementById('search-input').addEventListener('input', () => renderTasks());
document.getElementById('filter-status').addEventListener('change', () => renderTasks());
document.getElementById('filter-owner').addEventListener('change', () => renderTasks());

onAuthStateChanged(auth, user => {
  clearSubscriptions();
  state.user = user || null;

  if (user) {
    showApp();
    startLiveSync(user.uid);
  } else {
    showLogin();
  }
});

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('bt-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('bt-theme', 'light');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  clearMessages();
  if (!email || !password) return;

  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = mapAuthError(error);
    loginError.classList.remove('hidden');
    loginPassword.value = '';
    loginPassword.focus();
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  clearMessages();

  const email = loginEmail.value.trim();
  if (!email) {
    loginError.textContent = '❌ Bitte zuerst deine E-Mail-Adresse eingeben.';
    loginError.classList.remove('hidden');
    loginEmail.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    loginSuccess.textContent = '✅ E-Mail zum Zurücksetzen wurde an ' + email + ' gesendet.';
    loginSuccess.classList.remove('hidden');
  } catch (error) {
    loginError.textContent = mapAuthError(error);
    loginError.classList.remove('hidden');
  }
}

async function handleChangePassword() {
  const current = document.getElementById('pin-current').value;
  const nw = document.getElementById('pin-new').value.trim();
  const cf = document.getElementById('pin-confirm').value.trim();
  const errEl = document.getElementById('pin-error');

  errEl.classList.add('hidden');

  if (!nw || nw.length < 6) {
    errEl.textContent = '❌ Neues Passwort muss mind. 6 Zeichen haben.';
    errEl.classList.remove('hidden');
    return;
  }
  if (nw !== cf) {
    errEl.textContent = '❌ Passwörter stimmen nicht überein.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(state.user.email, current);
    await reauthenticateWithCredential(state.user, credential);
    await updatePassword(state.user, nw);
    modalPin.classList.add('hidden');
    alert('✅ Passwort erfolgreich geändert!');
  } catch (error) {
    errEl.textContent = mapAuthError(error);
    errEl.classList.remove('hidden');
  }
}

function clearMessages() {
  loginError.classList.add('hidden');
  loginError.textContent = '';
  loginSuccess.classList.add('hidden');
  loginSuccess.textContent = '';
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  appDiv.classList.add('hidden');
  state.tasks = [];
  state.todos = [];
  state.hours = [];
  renderStats();
  renderTasks();
  renderTodos();
  renderGantt();
  renderHours();
}

function showApp() {
  loginScreen.classList.add('hidden');
  appDiv.classList.remove('hidden');
  clearMessages();
  loginPassword.value = '';
}

function startLiveSync(uid) {
  const tasksUnsub = onSnapshot(collection(db, 'users', uid, 'tasks'), snap => {
    state.tasks = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderStats();
    renderTasks();
    renderGantt();
  });

  const todosUnsub = onSnapshot(collection(db, 'users', uid, 'todos'), snap => {
    state.todos = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderTodos();
  });

  const hoursUnsub = onSnapshot(collection(db, 'users', uid, 'hours'), snap => {
    state.hours = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderHours();
  });

  state.unsubs = [tasksUnsub, todosUnsub, hoursUnsub];
}

function clearSubscriptions() {
  state.unsubs.forEach(unsub => { try { unsub(); } catch (e) {} });
  state.unsubs = [];
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('hidden');
  overlay.classList.toggle('visible');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.add('hidden');
  overlay.classList.remove('visible');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mapAuthError(error) {
  const code = (error && error.code) || '';
  if (code.includes('invalid-credential')) return '❌ E-Mail oder Passwort ist falsch.';
  if (code.includes('invalid-email')) return '❌ Die E-Mail-Adresse ist ungültig.';
  if (code.includes('email-already-in-use')) return '❌ Diese E-Mail-Adresse wird bereits verwendet.';
  if (code.includes('weak-password')) return '❌ Das Passwort muss mind. 6 Zeichen haben.';
  if (code.includes('too-many-requests')) return '❌ Zu viele Versuche. Bitte kurz warten.';
  if (code.includes('user-not-found')) return '❌ Kein Konto mit dieser E-Mail-Adresse gefunden.';
  return '❌ Vorgang fehlgeschlagen. Bitte erneut versuchen.';
}

function taskDocRef(id) {
  return doc(db, 'users', state.user.uid, 'tasks', id);
}

function todoDocRef(id) {
  return doc(db, 'users', state.user.uid, 'todos', id);
}

function hoursDocRef(id) {
  return doc(db, 'users', state.user.uid, 'hours', id);
}

function renderStats() {
  const bar = document.getElementById('stats-bar');
  if (!bar) return;

  const mainTasks = state.tasks.filter(t => !t.parentId);
  const subTasks = state.tasks.filter(t => t.parentId);

  const openMain = mainTasks.filter(t => t.status !== 'done').length;
  const openSub = subTasks.filter(t => t.status !== 'done').length;
  const totalBudget = mainTasks.reduce((sum, t) => sum + (parseFloat(t.budget) || 0), 0);

  bar.innerHTML =
    '<div class="stat-card stat-main">' +
      '<span class="stat-label">Offene Hauptaufgaben</span>' +
      '<span class="stat-value">' + openMain + '</span>' +
    '</div>' +
    '<div class="stat-card stat-sub">' +
      '<span class="stat-label">Offene Unteraufgaben</span>' +
      '<span class="stat-value">' + openSub + '</span>' +
    '</div>' +
    '<div class="stat-card stat-budget">' +
      '<span class="stat-label">Gesamtbudget</span>' +
      '<span class="stat-value">' + totalBudget.toLocaleString('de-DE') + ' €</span>' +
    '</div>';
}

function populateOwnerFilter() {
  const sel = document.getElementById('filter-owner');
  const current = sel.value;
  const owners = [...new Set(state.tasks.map(t => t.owner).filter(Boolean))].sort();
  sel.innerHTML = '<option value="all">Alle Verantwortlichen</option>' +
    owners.map(o => '<option value="' + escHtml(o) + '">' + escHtml(o) + '</option>').join('');
  if (owners.includes(current)) sel.value = current;
}

function getFilteredMainTasks() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const statusFilter = document.getElementById('filter-status').value;
  const ownerFilter = document.getElementById('filter-owner').value;

  const filtered = state.tasks.filter(t => !t.parentId).filter(t => {
    const subtasks = state.tasks.filter(s => s.parentId === t.id);
    const haystacks = [t, ...subtasks];

    const matchesQuery = !q || haystacks.some(x =>
      (x.title || '').toLowerCase().includes(q) ||
      (x.note || '').toLowerCase().includes(q) ||
      (x.owner || '').toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' ||
      haystacks.some(x => x.status === statusFilter);
    const matchesOwner = ownerFilter === 'all' ||
      haystacks.some(x => x.owner === ownerFilter);

    return matchesQuery && matchesStatus && matchesOwner;
  });

  return filtered.sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
}

function renderTasks() {
  const container = document.getElementById('task-list');
  populateOwnerFilter();
  const tasks = getFilteredMainTasks();
  const filterActive =
    document.getElementById('search-input').value.trim() !== '' ||
    document.getElementById('filter-status').value !== 'all' ||
    document.getElementById('filter-owner').value !== 'all';

  if (!tasks.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div>Keine Aufgaben gefunden. Passe ggf. Suche/Filter an oder lege eine neue Aufgabe an!</div>';
    return;
  }

  container.innerHTML = tasks.map(taskCardHTML).join('');
  bindTaskEvents();

  container.querySelectorAll('.task-card').forEach(card => {
    card.setAttribute('draggable', filterActive ? 'false' : 'true');
    card.classList.toggle('draggable-mode', !filterActive);
  });
}

function taskCardHTML(task) {
  const subtasks = state.tasks.filter(t => t.parentId === task.id);
  const hasSubs = subtasks.length > 0;

  const dateTag = (task.startDate || task.endDate)
    ? '<span class="tag">📅 ' + (task.startDate||'?') + ' → ' + (task.endDate||'?') + '</span>' : '';
  const budgetTag = task.budget
    ? '<span class="tag budget">💶 ' + Number(task.budget).toLocaleString('de-DE') + ' €</span>' : '';
  const ownerTag = task.owner
    ? '<span class="tag task-owner">👤 ' + escHtml(task.owner) + '</span>' : '';

  const subsHTML = subtasks.map(st =>
    '<div class="subtask-card" data-id="' + st.id + '">' +
    '<div class="status-dot ' + st.status + '"></div>' +
    '<span class="task-title" data-action="edit" data-id="' + st.id + '">' + escHtml(st.title) + '</span>' +
    '<div class="task-meta">' +
    (st.budget ? '<span class="tag budget">💶 ' + Number(st.budget).toLocaleString('de-DE') + ' €</span>' : '') +
    (st.startDate ? '<span class="tag">📅 ' + st.startDate + '</span>' : '') +
    (st.owner ? '<span class="tag task-owner">👤 ' + escHtml(st.owner) + '</span>' : '') +
    '</div>' +
    '<div class="task-actions">' +
    '<button class="icon-btn" data-action="edit" data-id="' + st.id + '" title="Bearbeiten">✏️</button>' +
    '<button class="icon-btn delete" data-action="delete" data-id="' + st.id + '" title="Löschen">🗑️</button>' +
    '</div></div>'
  ).join('');

  const attachmentHTML = task.attachmentUrl
    ? '<div class="task-attachment"><a href="' + escHtml(task.attachmentUrl) + '" target="_blank" rel="noopener">📎 Anhang öffnen</a></div>' : '';

  return '<div class="task-card" data-id="' + task.id + '" draggable="true">' +
    '<div class="task-header">' +
    '<span class="drag-handle" title="Ziehen zum Sortieren">⠿</span>' +
    '<span class="task-toggle ' + (hasSubs ? '' : 'invisible') + '">▶</span>' +
    '<div class="status-dot ' + task.status + '"></div>' +
    '<span class="task-title" data-action="edit" data-id="' + task.id + '">' + escHtml(task.title) + '</span>' +
    '<div class="task-meta">' +
    '<span class="tag">' + (STATUS_LABEL[task.status]||task.status) + '</span>' +
    dateTag + budgetTag + ownerTag +
    '</div>' +
    '<div class="task-actions">' +
    '<button class="icon-btn" data-action="add-sub" data-id="' + task.id + '" title="Unteraufgabe">➕</button>' +
    '<button class="icon-btn" data-action="edit" data-id="' + task.id + '" title="Bearbeiten">✏️</button>' +
    '<button class="icon-btn delete" data-action="delete" data-id="' + task.id + '" title="Löschen">🗑️</button>' +
    '</div></div>' +
    '<div class="task-body">' +
    '<div class="task-detail">' +
    (task.note ? '<span>📝 ' + escHtml(task.note) + '</span>' : '') +
    (task.link ? '<span>🔗 <a href="' + escHtml(task.link) + '" target="_blank" rel="noopener">' + escHtml(task.link) + '</a></span>' : '') +
    (task.file ? '<span>📁 ' + escHtml(task.file) + '</span>' : '') +
    '</div>' +
    attachmentHTML +
    '<div class="subtask-section">' +
    (hasSubs ? '<div class="subtask-label">Unteraufgaben (' + subtasks.length + ')</div>' : '') +
    subsHTML +
    '<button class="add-subtask-btn" data-action="add-sub" data-id="' + task.id + '">+ Unteraufgabe hinzufügen</button>' +
    '</div></div></div>';
}

function bindTaskEvents() {
  document.querySelectorAll('.task-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.task-actions')) return;
      if (e.target.closest('.task-title')) return;
      if (e.target.closest('.drag-handle')) return;
      const card = header.closest('.task-card');
      const body = card.querySelector('.task-body');
      const toggle = header.querySelector('.task-toggle');
      body.classList.toggle('open');
      if (toggle) toggle.classList.toggle('open');
    });
  });
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'edit') openTaskModal(id);
      else if (action === 'delete') deleteTask(id);
      else if (action === 'add-sub') openTaskModal(null, id);
    });
  });
  bindDragEvents();
}

function bindDragEvents() {
  const container = document.getElementById('task-list');
  let dragSrc = null;

  container.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      container.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (card === dragSrc) return;
      container.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });

    card.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || card === dragSrc) return;

      const rect = card.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      container.insertBefore(dragSrc, before ? card : card.nextSibling);

      card.classList.remove('drag-over');
      persistNewOrder();
    });
  });
}

async function persistNewOrder() {
  const cards = [...document.querySelectorAll('#task-list .task-card')];
  const updates = cards.map((card, index) => {
    const id = card.dataset.id;
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    return setDoc(taskDocRef(id), Object.assign({}, task, { order: index }), { merge: true });
  }).filter(Boolean);

  await Promise.all(updates);
}

function openTaskModal(id, parentId) {
  id = id || null; parentId = parentId || null;
  const isNew = !id;
  document.getElementById('modal-task-title').textContent =
    isNew ? (parentId ? 'Neue Unteraufgabe' : 'Neue Aufgabe') : 'Aufgabe bearbeiten';

  document.getElementById('ti-file-upload').value = '';
  document.getElementById('ti-file-list').textContent = '';

  if (!isNew) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    document.getElementById('ti-id').value = t.id;
    document.getElementById('ti-parent').value = t.parentId || '';
    document.getElementById('ti-title').value = t.title || '';
    document.getElementById('ti-status').value = t.status || 'pending';
    document.getElementById('ti-start').value = t.startDate || '';
    document.getElementById('ti-end').value = t.endDate || '';
    document.getElementById('ti-budget').value = t.budget || '';
    document.getElementById('ti-owner').value = t.owner || '';
    document.getElementById('ti-note').value = t.note || '';
    document.getElementById('ti-link').value = t.link || '';
    document.getElementById('ti-file').value = t.file || '';
    window.currentTaskAttachmentUrl = t.attachmentUrl || null;
    if (t.attachmentUrl) document.getElementById('ti-file-list').textContent = '📎 Anhang bereits vorhanden';
  } else {
    ['ti-id','ti-title','ti-start','ti-end','ti-budget','ti-owner','ti-note','ti-link','ti-file']
      .forEach(i => { document.getElementById(i).value = ''; });
    document.getElementById('ti-status').value = 'pending';
    document.getElementById('ti-parent').value = parentId || '';
    window.currentTaskAttachmentUrl = null;
  }

  modalTask.classList.remove('hidden');
  document.getElementById('ti-title').focus();
}

async function uploadTaskFile(file, taskId) {
  if (!file) return null;
  const path = 'users/' + state.user.uid + '/tasks/' + taskId + '/' + Date.now() + '_' + file.name;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

async function saveTask() {
  if (!state.user) return;

  const title = document.getElementById('ti-title').value.trim();
  if (!title) { alert('Bitte einen Titel eingeben.'); return; }

  const id = document.getElementById('ti-id').value || uid();
  const existing = state.tasks.find(t => t.id === id);
  const newStatus = document.getElementById('ti-status').value;
  const wasNotDone = !existing || existing.status !== 'done';

  const fileInput = document.getElementById('ti-file-upload');
  let attachmentUrl = window.currentTaskAttachmentUrl || (existing && existing.attachmentUrl) || null;

  if (fileInput && fileInput.files[0]) {
    try {
      attachmentUrl = await uploadTaskFile(fileInput.files[0], id);
    } catch (err) {
      alert('❌ Datei-Upload fehlgeschlagen: ' + (err && err.message ? err.message : 'Unbekannter Fehler'));
    }
  }

  const task = {
    id,
    parentId: document.getElementById('ti-parent').value || null,
    title,
    status: newStatus,
    order: (existing && existing.order !== undefined) ? existing.order : state.tasks.filter(t => !t.parentId).length,
    startDate: document.getElementById('ti-start').value || null,
    endDate: document.getElementById('ti-end').value || null,
    budget: document.getElementById('ti-budget').value || null,
    owner: document.getElementById('ti-owner').value.trim() || null,
    note: document.getElementById('ti-note').value.trim() || null,
    link: document.getElementById('ti-link').value.trim() || null,
    file: document.getElementById('ti-file').value.trim() || null,
    attachmentUrl: attachmentUrl,
    createdAt: (existing && existing.createdAt) || Date.now(),
    completedAt: (existing && existing.completedAt) || null
  };

  if (newStatus === 'done' && wasNotDone) {
    task.completedAt = new Date().toISOString().split('T')[0];
  } else if (newStatus !== 'done') {
    task.completedAt = null;
  }

  await setDoc(taskDocRef(id), task);
  modalTask.classList.add('hidden');
}

async function deleteTask(id) {
  if (!state.user || !confirm('Aufgabe wirklich löschen?')) return;

  const ids = state.tasks
    .filter(t => t.id === id || t.parentId === id)
    .map(t => t.id);

  await Promise.all(ids.map(taskId => deleteDoc(taskDocRef(taskId))));
}

function renderGantt() {
  const container = document.getElementById('gantt-container');
  const mainTasks = state.tasks.filter(t => !t.parentId);

  const ordered = [];
  mainTasks.forEach(main => {
    const subtasks = state.tasks.filter(t => t.parentId === main.id);
    if (main.startDate || main.endDate) ordered.push({ task: main, isMain: true });
    subtasks.forEach(st => {
      if (st.startDate || st.endDate) ordered.push({ task: st, isMain: false });
    });
  });

  if (!ordered.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📅</div>Noch keine Aufgaben mit Daten vorhanden.</div>';
    return;
  }

  const allDates = ordered
    .flatMap(o => [o.task.startDate, o.task.endDate].filter(Boolean))
    .map(d => new Date(d));
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalMs = Math.max(maxDate - minDate, 1);

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayInRange = today >= minDate && today <= maxDate;
  const todayLeft = ((today - minDate) / totalMs * 100).toFixed(2);

  const rows = ordered.map(o => {
    const t = o.task;
    const s = t.startDate ? new Date(t.startDate) : minDate;
    const e = t.endDate ? new Date(t.endDate) : s;
    const left = ((s - minDate) / totalMs * 100).toFixed(1);
    const width = Math.max(((e - s) / totalMs * 100), 0.8).toFixed(1);
    const rowClass = o.isMain ? 'gantt-main' : 'gantt-sub';

    const todayLine = todayInRange
      ? '<div class="gantt-today-line" style="left:' + todayLeft + '%"></div>' : '';

    return '<tr class="' + rowClass + '">' +
      '<td>' + (o.isMain ? '' : ' ↳ ') + escHtml(t.title) + '</td>' +
      '<td><span class="tag">' + (STATUS_LABEL[t.status]||t.status) + '</span></td>' +
      '<td>' + (t.startDate||'—') + '</td>' +
      '<td>' + (t.endDate||'—') + '</td>' +
      '<td class="gantt-bar-cell"><div class="gantt-bar-outer"><div class="gantt-bar ' + t.status + '" style="left:' + left + '%;width:' + width + '%">' + (width > 8 ? escHtml(t.title) : '') + '</div>' + todayLine + '</div></td>' +
      '</tr>';
  }).join('');

  const legend = todayInRange
    ? '<div class="gantt-today-legend"><span class="dot"></span>Heute (' + fmtDate(today) + ')</div>' : '';

  container.innerHTML = legend + '<div class="gantt-wrapper"><table class="gantt-table"><thead><tr><th>Aufgabe</th><th>Status</th><th>Start</th><th>Ende</th><th>Zeitstrahl (' + fmtDate(minDate) + ' – ' + fmtDate(maxDate) + ')</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function fmtDate(d) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderTodos() {
  const container = document.getElementById('todo-list');
  const todos = state.todos;

  if (!todos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Keine To-Dos vorhanden. Super!</div>';
    return;
  }

  const active = todos.filter(t => !t.done).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const done = todos.filter(t => t.done).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  const today = new Date().toISOString().split('T')[0];

  const renderItem = td => {
    const overdue = td.dueDate && td.dueDate < today && !td.done;
    return '<div class="todo-item ' + (td.done ? 'is-done' : '') + '" data-id="' + td.id + '">' +
      '<div class="todo-check ' + (td.done ? 'checked' : '') + '" data-action="toggle-todo" data-id="' + td.id + '"></div>' +
      '<div class="todo-content">' +
      '<div class="todo-title ' + (td.done ? 'done-text' : '') + '">' + escHtml(td.title) + '</div>' +
      (td.dueDate ? '<div class="todo-due ' + (overdue ? 'overdue' : '') + '">📅 Fällig: ' + td.dueDate + (overdue ? ' ⚠️ Überfällig' : '') + '</div>' : '') +
      (td.done && td.completedAt ? '<div class="todo-completed">✅ Erledigt am: ' + td.completedAt + '</div>' : '') +
      (td.note ? '<div class="todo-note">' + escHtml(td.note) + '</div>' : '') +
      '</div>' +
      '<div class="task-actions">' +
      '<button class="icon-btn" data-action="edit-todo" data-id="' + td.id + '" title="Bearbeiten">✏️</button>' +
      '<button class="icon-btn delete" data-action="delete-todo" data-id="' + td.id + '" title="Löschen">🗑️</button>' +
      '</div></div>';
  };

  let html = '';
  if (active.length) {
    html += '<div class="todo-section-label">Aktiv (' + active.length + ')</div>';
    html += active.map(renderItem).join('');
  }
  if (done.length) {
    html += '<div class="todo-section-label">Erledigt (' + done.length + ')</div>';
    html += done.map(renderItem).join('');
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'toggle-todo') toggleTodo(id);
      else if (action === 'edit-todo') openTodoModal(id);
      else if (action === 'delete-todo') deleteTodo(id);
    });
  });
}

function openTodoModal(id) {
  id = id || null;
  document.getElementById('modal-todo-title').textContent = id ? 'To-Do bearbeiten' : 'Neues To-Do';

  if (id) {
    const t = state.todos.find(t => t.id === id);
    if (!t) return;
    document.getElementById('td-id').value = t.id;
    document.getElementById('td-title').value = t.title || '';
    document.getElementById('td-due').value = t.dueDate || '';
    document.getElementById('td-note').value = t.note || '';
  } else {
    ['td-id','td-title','td-due','td-note'].forEach(i => { document.getElementById(i).value = ''; });
  }

  modalTodo.classList.remove('hidden');
  document.getElementById('td-title').focus();
}

async function saveTodo() {
  if (!state.user) return;

  const title = document.getElementById('td-title').value.trim();
  if (!title) { alert('Bitte einen Titel eingeben.'); return; }

  const id = document.getElementById('td-id').value || uid();
  const existing = state.todos.find(t => t.id === id);

  const todo = {
    id,
    title,
    dueDate: document.getElementById('td-due').value || null,
    note: document.getElementById('td-note').value.trim() || null,
    done: (existing && existing.done) || false,
    completedAt: (existing && existing.completedAt) || null,
    createdAt: (existing && existing.createdAt) || Date.now()
  };

  await setDoc(todoDocRef(id), todo);
  modalTodo.classList.add('hidden');
}

async function toggleTodo(id) {
  if (!state.user) return;
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;

  const nowDone = !todo.done;
  const update = {
    done: nowDone,
    completedAt: nowDone ? new Date().toISOString().split('T')[0] : null
  };

  await setDoc(todoDocRef(id), Object.assign({}, todo, update), { merge: true });
}

async function deleteTodo(id) {
  if (!state.user || !confirm('To-Do löschen?')) return;
  await deleteDoc(todoDocRef(id));
}

function calcHours(start, end, breakMin) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60;
  diffMin -= (parseInt(breakMin) || 0);
  return Math.max(diffMin, 0) / 60;
}

function updateHoursPreview() {
  const start = document.getElementById('hr-start').value;
  const end = document.getElementById('hr-end').value;
  const brk = document.getElementById('hr-break').value;
  const total = calcHours(start, end, brk);
  document.getElementById('hr-total-preview').textContent =
    'Gesamtstunden: ' + total.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' Std';
}

function populateHoursWorkerFilter() {
  const sel = document.getElementById('hours-filter-worker');
  const current = sel.value;
  const workers = [...new Set(state.hours.map(h => h.worker).filter(Boolean))].sort();
  sel.innerHTML = '<option value="all">Alle Helfer</option>' +
    workers.map(w => '<option value="' + escHtml(w) + '">' + escHtml(w) + '</option>').join('');
  if (workers.includes(current)) sel.value = current;

  const datalist = document.getElementById('hr-worker-list');
  datalist.innerHTML = workers.map(w => '<option value="' + escHtml(w) + '">').join('');
}

function populateHoursTaskSelect() {
  const sel = document.getElementById('hr-task');
  const mainTasks = state.tasks.filter(t => !t.parentId);
  sel.innerHTML = '<option value="">– Keine –</option>' +
    mainTasks.map(t => '<option value="' + t.id + '">' + escHtml(t.title) + '</option>').join('');
}

function renderHours() {
  const container = document.getElementById('hours-list');
  populateHoursWorkerFilter();

  const filterWorker = document.getElementById('hours-filter-worker').value;
  const entries = state.hours.filter(h => filterWorker === 'all' || h.worker === filterWorker);

  const bar = document.getElementById('hours-stats-bar');
  const totalHours = entries.reduce((sum, h) => sum + (h.totalHours || 0), 0);
  const uniqueWorkers = new Set(entries.map(h => h.worker)).size;
  bar.innerHTML =
    '<div class="stat-card stat-main"><span class="stat-label">Gesamtstunden</span><span class="stat-value">' +
    totalHours.toLocaleString('de-DE', { minimumFractionDigits: 1 }) + ' Std</span></div>' +
    '<div class="stat-card stat-sub"><span class="stat-label">Helfer</span><span class="stat-value">' + uniqueWorkers + '</span></div>';

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🕒</div>Noch keine Stunden erfasst.</div>';
    return;
  }

  const grouped = {};
  entries.forEach(h => {
    const key = h.worker || 'Unbekannt';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });

  const workerNames = Object.keys(grouped).sort();

  container.innerHTML = workerNames.map(worker => {
    const items = grouped[worker].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const subtotal = items.reduce((sum, h) => sum + (h.totalHours || 0), 0);

    const itemsHTML = items.map(h => {
      const task = state.tasks.find(t => t.id === h.taskId);
      return '<div class="hours-card" data-id="' + h.id + '">' +
        '<div class="hours-info">' +
        '<div class="hours-meta">📅 ' + (h.date || '—') + ' · ⏰ ' + (h.start || '?') + ' – ' + (h.end || '?') +
        (h.breakMin ? ' · ☕ ' + h.breakMin + ' Min Pause' : '') +
        (task ? ' · 🔧 ' + escHtml(task.title) : '') + '</div>' +
        '</div>' +
        '<div class="hours-total">' + (h.totalHours || 0).toLocaleString('de-DE', { minimumFractionDigits: 1 }) + ' Std</div>' +
        '<div class="task-actions">' +
        '<button class="icon-btn" data-action="edit-hours" data-id="' + h.id + '" title="Bearbeiten">✏️</button>' +
        '<button class="icon-btn delete" data-action="delete-hours" data-id="' + h.id + '" title="Löschen">🗑️</button>' +
        '</div></div>';
    }).join('');

    return '<div class="hours-group">' +
      '<div class="hours-group-header">' +
      '<span class="hours-worker">👤 ' + escHtml(worker) + '</span>' +
      '<span class="hours-subtotal">Σ ' + subtotal.toLocaleString('de-DE', { minimumFractionDigits: 1 }) + ' Std</span>' +
      '</div>' +
      itemsHTML +
      '</div>';
  }).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'edit-hours') openHoursModal(id);
      else if (action === 'delete-hours') deleteHoursEntry(id);
    });
  });
}

function openHoursModal(id) {
  id = id || null;
  populateHoursTaskSelect();
  document.getElementById('modal-hours-title').textContent = id ? 'Zeiteintrag bearbeiten' : 'Neuer Zeiteintrag';

  if (id) {
    const h = state.hours.find(h => h.id === id);
    if (!h) return;
    document.getElementById('hr-id').value = h.id;
    document.getElementById('hr-worker').value = h.worker || '';
    document.getElementById('hr-date').value = h.date || '';
    document.getElementById('hr-start').value = h.start || '';
    document.getElementById('hr-end').value = h.end || '';
    document.getElementById('hr-break').value = h.breakMin || '';
    document.getElementById('hr-task').value = h.taskId || '';
  } else {
    ['hr-id','hr-worker','hr-start','hr-end','hr-break'].forEach(i => { document.getElementById(i).value = ''; });
    document.getElementById('hr-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('hr-task').value = '';
  }

  updateHoursPreview();
  modalHours.classList.remove('hidden');
  document.getElementById('hr-worker').focus();
}

async function saveHoursEntry() {
  if (!state.user) return;

  const worker = document.getElementById('hr-worker').value.trim();
  const date = document.getElementById('hr-date').value;
  const start = document.getElementById('hr-start').value;
  const end = document.getElementById('hr-end').value;
  const breakMin = parseInt(document.getElementById('hr-break').value) || 0;

  if (!worker || !date || !start || !end) {
    alert('Bitte Helfer, Datum, Beginn und Ende ausfüllen.');
    return;
  }

  const id = document.getElementById('hr-id').value || uid();
  const existing = state.hours.find(h => h.id === id);

  const entry = {
    id,
    worker,
    date,
    start,
    end,
    breakMin,
    totalHours: calcHours(start, end, breakMin),
    taskId: document.getElementById('hr-task').value || null,
    createdAt: (existing && existing.createdAt) || Date.now()
  };

  await setDoc(hoursDocRef(id), entry);
  modalHours.classList.add('hidden');
}

async function deleteHoursEntry(id) {
  if (!state.user || !confirm('Zeiteintrag löschen?')) return;
  await deleteDoc(hoursDocRef(id));
}
