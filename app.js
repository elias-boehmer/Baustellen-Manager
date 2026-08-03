'use strict';

// --- AUTH ---
const DEFAULT_PASSWORD = '1234';
const SESSION_KEY = 'bt_session';
const PASSWORD_KEY = 'bt_password';
const SESSION_DAYS = 30;

function getPassword() {
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
}
function isLoggedIn() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const { ts } = JSON.parse(raw);
    return (Date.now() - ts) < SESSION_DAYS * 86400000;
  } catch { return false; }
}
function doLogin(password) {
  if (password === getPassword()) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
    return true;
  }
  return false;
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

// --- BOOT ---
const loginScreen = document.getElementById('login-screen');
const appDiv = document.getElementById('app');

if (isLoggedIn()) {
  loginScreen.style.display = 'none';
  appDiv.classList.remove('hidden');
  renderTasks();
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const field = document.getElementById('login-password');
  const err = document.getElementById('login-error');
  const val = field.value;
  if (!val.trim()) return;
  if (doLogin(val)) {
    loginScreen.style.display = 'none';
    appDiv.classList.remove('hidden');
    err.classList.add('hidden');
    renderTasks();
  } else {
    err.classList.remove('hidden');
    field.value = '';
    field.focus();
  }
});

document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-logout-sidebar').addEventListener('click', logout);

// --- CHANGE PASSWORD ---
const modalPin = document.getElementById('modal-pin');
document.getElementById('btn-change-password').addEventListener('click', () => {
  ['pin-current','pin-new','pin-confirm'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('pin-error').classList.add('hidden');
  modalPin.classList.remove('hidden');
});
document.getElementById('btn-cancel-pin').addEventListener('click', () => modalPin.classList.add('hidden'));
modalPin.addEventListener('click', e => { if (e.target === modalPin) modalPin.classList.add('hidden'); });
document.getElementById('btn-save-pin').addEventListener('click', () => {
  const cur = document.getElementById('pin-current').value;
  const nw = document.getElementById('pin-new').value.trim();
  const cf = document.getElementById('pin-confirm').value.trim();
  if (cur !== getPassword()) { setPinError('Aktuelles Passwort ist falsch.'); return; }
  if (!nw || nw.length < 4) { setPinError('Neues Passwort muss mind. 4 Zeichen haben.'); return; }
  if (nw !== cf) { setPinError('Passwörter stimmen nicht überein.'); return; }
  localStorage.setItem(PASSWORD_KEY, nw);
  modalPin.classList.add('hidden');
  alert('✅ Passwort erfolgreich geändert!');
});
function setPinError(msg) {
  const el = document.getElementById('pin-error');
  el.textContent = '❌ ' + msg;
  el.classList.remove('hidden');
}

// --- MOBILE SIDEBAR ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
document.getElementById('hamburger').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
});
overlay.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
}

// --- NAVIGATION ---
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
    else renderTasks();
  });
});

// --- DATA STORE ---
const DB = {
  get tasks() { return JSON.parse(localStorage.getItem('bt_tasks') || '[]'); },
  set tasks(v) { localStorage.setItem('bt_tasks', JSON.stringify(v)); },
  get todos() { return JSON.parse(localStorage.getItem('bt_todos') || '[]'); },
  set todos(v) { localStorage.setItem('bt_todos', JSON.stringify(v)); },
};
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const STATUS_LABEL = {
  pending: '⏳ Start ausstehend',
  blocked: '🚫 Blockiert',
  inprogress: '🔄 In Bearbeitung',
  done: '✅ Erledigt',
};

// --- TASKS ---
function renderTasks() {
  const container = document.getElementById('task-list');
  const tasks = DB.tasks.filter(t => !t.parentId);
  if (!tasks.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div>Noch keine Aufgaben. Lege jetzt deine erste an!</div>';
    return;
  }
  container.innerHTML = tasks.map(taskCardHTML).join('');
  bindTaskEvents();
}

function taskCardHTML(task) {
  const subtasks = DB.tasks.filter(t => t.parentId === task.id);
  const hasSubs = subtasks.length > 0;
  const dateTag = (task.startDate || task.endDate)
    ? '<span class="tag">📅 ' + (task.startDate||'?') + ' → ' + (task.endDate||'?') + '</span>' : '';
  const budgetTag = task.budget
    ? '<span class="tag budget">💶 ' + Number(task.budget).toLocaleString('de-DE') + ' €</span>' : '';

  const subsHTML = subtasks.map(st =>
    '<div class="subtask-card" data-id="' + st.id + '">' +
    '<div class="status-dot ' + st.status + '"></div>' +
    '<span class="task-title">' + escHtml(st.title) + '</span>' +
    '<div class="task-meta">' +
    (st.budget ? '<span class="tag budget">💶 ' + Number(st.budget).toLocaleString('de-DE') + ' €</span>' : '') +
    (st.startDate ? '<span class="tag">📅 ' + st.startDate + '</span>' : '') +
    '</div>' +
    '<div class="task-actions">' +
    '<button class="icon-btn" data-action="edit" data-id="' + st.id + '" title="Bearbeiten">✏️</button>' +
    '<button class="icon-btn delete" data-action="delete" data-id="' + st.id + '" title="Löschen">🗑️</button>' +
    '</div></div>'
  ).join('');

  return '<div class="task-card" data-id="' + task.id + '">' +
    '<div class="task-header">' +
    '<span class="task-toggle ' + (hasSubs ? '' : 'invisible') + '">▶</span>' +
    '<div class="status-dot ' + task.status + '"></div>' +
    '<span class="task-title">' + escHtml(task.title) + '</span>' +
    '<div class="task-meta">' +
    '<span class="tag">' + (STATUS_LABEL[task.status]||task.status) + '</span>' +
    dateTag + budgetTag +
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
}

function deleteTask(id) {
  if (!confirm('Aufgabe wirklich löschen?')) return;
  DB.tasks = DB.tasks.filter(t => t.id !== id && t.parentId !== id);
  renderTasks();
}

// --- TASK MODAL ---
const modalTask = document.getElementById('modal-task');
function openTaskModal(id, parentId) {
  id = id || null; parentId = parentId || null;
  const isNew = !id;
  document.getElementById('modal-task-title').textContent =
    isNew ? (parentId ? 'Neue Unteraufgabe' : 'Neue Aufgabe') : 'Aufgabe bearbeiten';
  if (!isNew) {
    const t = DB.tasks.find(t => t.id === id);
    if (!t) return;
    document.getElementById('ti-id').value = t.id;
    document.getElementById('ti-parent').value = t.parentId || '';
    document.getElementById('ti-title').value = t.title;
    document.getElementById('ti-status').value = t.status;
    document.getElementById('ti-start').value = t.startDate || '';
    document.getElementById('ti-end').value = t.endDate || '';
    document.getElementById('ti-budget').value = t.budget || '';
    document.getElementById('ti-note').value = t.note || '';
    document.getElementById('ti-link').value = t.link || '';
    document.getElementById('ti-file').value = t.file || '';
  } else {
    ['ti-id','ti-title','ti-start','ti-end','ti-budget','ti-note','ti-link','ti-file']
      .forEach(i => { document.getElementById(i).value = ''; });
    document.getElementById('ti-status').value = 'pending';
    document.getElementById('ti-parent').value = parentId || '';
  }
  modalTask.classList.remove('hidden');
  document.getElementById('ti-title').focus();
}
document.getElementById('btn-add-task').addEventListener('click', () => openTaskModal());
document.getElementById('btn-cancel-task').addEventListener('click', () => modalTask.classList.add('hidden'));
modalTask.addEventListener('click', e => { if (e.target === modalTask) modalTask.classList.add('hidden'); });
document.getElementById('btn-save-task').addEventListener('click', () => {
  const title = document.getElementById('ti-title').value.trim();
  if (!title) { alert('Bitte einen Titel eingeben.'); return; }
  const id = document.getElementById('ti-id').value || uid();
  const parentId = document.getElementById('ti-parent').value || null;
  const task = { id, parentId, title,
    status: document.getElementById('ti-status').value,
    startDate: document.getElementById('ti-start').value || null,
    endDate: document.getElementById('ti-end').value || null,
    budget: document.getElementById('ti-budget').value || null,
    note: document.getElementById('ti-note').value.trim() || null,
    link: document.getElementById('ti-link').value.trim() || null,
    file: document.getElementById('ti-file').value.trim() || null,
    createdAt: Date.now() };
  const tasks = DB.tasks;
  const idx = tasks.findIndex(t => t.id === id);
  if (idx >= 0) tasks[idx] = { ...tasks[idx], ...task };
  else tasks.push(task);
  DB.tasks = tasks;
  modalTask.classList.add('hidden');
  renderTasks();
});

// --- GANTT ---
function renderGantt() {
  const container = document.getElementById('gantt-container');
  const dated = DB.tasks.filter(t => t.startDate || t.endDate);
  if (!dated.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📅</div>Noch keine Aufgaben mit Daten vorhanden.</div>';
    return;
  }
  const allDates = dated.flatMap(t => [t.startDate, t.endDate].filter(Boolean)).map(d => new Date(d));
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalMs = maxDate - minDate || 1;
  const rows = dated.map(t => {
    const s = t.startDate ? new Date(t.startDate) : minDate;
    const e = t.endDate ? new Date(t.endDate) : s;
    const left = ((s - minDate) / totalMs * 100).toFixed(1);
    const width = Math.max(((e - s) / totalMs * 100), 0.5).toFixed(1);
    return '<tr>' +
      '<td>' + (t.parentId ? ' ↳ ' : '') + escHtml(t.title) + '</td>' +
      '<td><span class="tag">' + (STATUS_LABEL[t.status]||t.status) + '</span></td>' +
      '<td>' + (t.startDate||'—') + '</td>' +
      '<td>' + (t.endDate||'—') + '</td>' +
      '<td class="gantt-bar-cell"><div class="gantt-bar-outer"><div class="gantt-bar ' + t.status + '" style="left:' + left + '%;width:' + width + '%">' + (width > 8 ? escHtml(t.title) : '') + '</div></div></td>' +
      '</tr>';
  }).join('');
  container.innerHTML = '<div class="gantt-wrapper"><table class="gantt-table"><thead><tr><th>Aufgabe</th><th>Status</th><th>Start</th><th>Ende</th><th>Zeitstrahl (' + fmtDate(minDate) + ' – ' + fmtDate(maxDate) + ')</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
function fmtDate(d) { return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

// --- TODOS ---
function renderTodos() {
  const container = document.getElementById('todo-list');
  const todos = DB.todos;
  if (!todos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">✅</div>Keine To-Dos vorhanden. Super!</div>';
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  container.innerHTML = todos.map(td => {
    const overdue = td.dueDate && td.dueDate < today && !td.done;
    return '<div class="todo-item" data-id="' + td.id + '">' +
      '<div class="todo-check ' + (td.done ? 'checked' : '') + '" data-action="toggle-todo" data-id="' + td.id + '"></div>' +
      '<div class="todo-content">' +
      '<div class="todo-title ' + (td.done ? 'done-text' : '') + '">' + escHtml(td.title) + '</div>' +
      (td.dueDate ? '<div class="todo-due ' + (overdue ? 'overdue' : '') + '">📅 Fällig: ' + td.dueDate + (overdue ? ' ⚠️ Überfällig' : '') + '</div>' : '') +
      (td.note ? '<div class="todo-note">' + escHtml(td.note) + '</div>' : '') +
      '</div>' +
      '<div class="task-actions">' +
      '<button class="icon-btn" data-action="edit-todo" data-id="' + td.id + '" title="Bearbeiten">✏️</button>' +
      '<button class="icon-btn delete" data-action="delete-todo" data-id="' + td.id + '" title="Löschen">🗑️</button>' +
      '</div></div>';
  }).join('');
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'toggle-todo') toggleTodo(id);
      else if (action === 'edit-todo') openTodoModal(id);
      else if (action === 'delete-todo') deleteTodo(id);
    });
  });
}
function toggleTodo(id) {
  const todos = DB.todos;
  const t = todos.find(t => t.id === id);
  if (t) t.done = !t.done;
  DB.todos = todos;
  renderTodos();
}
function deleteTodo(id) {
  if (!confirm('To-Do löschen?')) return;
  DB.todos = DB.todos.filter(t => t.id !== id);
  renderTodos();
}

// --- TODO MODAL ---
const modalTodo = document.getElementById('modal-todo');
function openTodoModal(id) {
  id = id || null;
  document.getElementById('modal-todo-title').textContent = id ? 'To-Do bearbeiten' : 'Neues To-Do';
  if (id) {
    const t = DB.todos.find(t => t.id === id);
    if (!t) return;
    document.getElementById('td-id').value = t.id;
    document.getElementById('td-title').value = t.title;
    document.getElementById('td-due').value = t.dueDate || '';
    document.getElementById('td-note').value = t.note || '';
  } else {
    ['td-id','td-title','td-due','td-note'].forEach(i => { document.getElementById(i).value = ''; });
  }
  modalTodo.classList.remove('hidden');
  document.getElementById('td-title').focus();
}
document.getElementById('btn-add-todo').addEventListener('click', () => openTodoModal());
document.getElementById('btn-cancel-todo').addEventListener('click', () => modalTodo.classList.add('hidden'));
modalTodo.addEventListener('click', e => { if (e.target === modalTodo) modalTodo.classList.add('hidden'); });
document.getElementById('btn-save-todo').addEventListener('click', () => {
  const title = document.getElementById('td-title').value.trim();
  if (!title) { alert('Bitte einen Titel eingeben.'); return; }
  const id = document.getElementById('td-id').value || uid();
  const todo = { id, title,
    dueDate: document.getElementById('td-due').value || null,
    note: document.getElementById('td-note').value.trim() || null,
    done: false, createdAt: Date.now() };
  const todos = DB.todos;
  const idx = todos.findIndex(t => t.id === id);
  if (idx >= 0) todos[idx] = { ...todos[idx], ...todo, done: todos[idx].done };
  else todos.push(todo);
  DB.todos = todos;
  modalTodo.classList.add('hidden');
  renderTodos();
});

// --- UTILS ---
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
