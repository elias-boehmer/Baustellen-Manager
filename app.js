// Baustellen-Manager App.js - Version 4.19.1
// Kategorien: ein-/ausklappbar, abgeschlossene Aufgaben separat, Datum-Anzeige
// WICHTIG: app-container wird verwendet (nicht app), damit Login funktioniert

// Global state
let currentUser = null;
let currentView = 'tasks';
const db = firebase.firestore();

// Collapse state für Kategorien (pro User speicherbar)
let collapsedCategories = new Set();
let collapsedCompletedByCategory = new Set();

// Hilfsfunktion: Datum formatieren
function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Auth State observer
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        setupNavigation();
    } else {
        currentUser = null;
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
    }
});

// Login
async function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login fehlgeschlagen: ' + error.message);
    }
}

// Logout
async function logout() {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// User data laden
async function loadUserData() {
    if (!currentUser) return;
    loadTasks();
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            
            document.querySelectorAll('.view-section').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(currentView + '-view').style.display = 'block';
            
            if (currentView === 'tasks') {
                loadTasks();
            } else if (currentView === 'helpers') {
                loadHelpers();
            }
        });
    });
}

// ============================================
// AUFGABEN (TASKS)
// ============================================

function loadTasks() {
    if (!currentUser) return;
    
    const tasksRef = db.collection('users').doc(currentUser.uid).collection('tasks');
    tasksRef.onSnapshot((snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        renderTasks(tasks);
    });
}

function renderTasks(tasks) {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    
    // Aufgaben nach Kategorie gruppieren
    const tasksByCategory = {};
    tasks.forEach(task => {
        const cat = task.category || 'Unkategorisiert';
        if (!tasksByCategory[cat]) {
            tasksByCategory[cat] = [];
        }
        tasksByCategory[cat].push(task);
    });
    
    // Alle Kategorienamen sammeln und alphabetisch sortieren
    const allCategories = Object.keys(tasksByCategory);
    const sortedCategories = [...allCategories].sort((a, b) => a.localeCompare(b));
    
    container.innerHTML = '';
    
    sortedCategories.forEach(categoryName => {
        const categoryTasks = tasksByCategory[categoryName];
        
        // Offene und abgeschlossene Aufgaben trennen
        const openTasks = categoryTasks.filter(t => t.status !== 'abgeschlossen');
        const completedTasks = categoryTasks.filter(t => t.status === 'abgeschlossen');
        
        // Kategorie-Container
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section';
        categoryDiv.style.marginBottom = '24px';
        
        // Kategorie-Header (ein-/ausklappbar)
        const isCategoryCollapsed = collapsedCategories.has(categoryName);
        const headerDiv = document.createElement('div');
        headerDiv.className = 'category-header';
        headerDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f5f5f5;border-radius:8px;cursor:pointer;margin-bottom:8px;';
        headerDiv.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:20px;cursor:pointer;">${isCategoryCollapsed ? '▸' : '▾'}</span>
                <span style="font-weight:600;font-size:16px;">${categoryName}</span>
                <span style="background:#e0e0e0;padding:2px 8px;border-radius:12px;font-size:12px;">${openTasks.length} offen</span>
            </div>
        `;
        headerDiv.addEventListener('click', () => {
            if (collapsedCategories.has(categoryName)) {
                collapsedCategories.delete(categoryName);
            } else {
                collapsedCategories.add(categoryName);
            }
            renderTasks(tasks);
        });
        
        categoryDiv.appendChild(headerDiv);
        
        // Aufgaben-Container (offene Aufgaben)
        if (!isCategoryCollapsed) {
            const openTasksContainer = document.createElement('div');
            openTasksContainer.style.cssText = 'margin-bottom:12px;';
            
            openTasks.forEach(task => {
                const taskElement = createTaskElement(task, tasks);
                openTasksContainer.appendChild(taskElement);
            });
            
            categoryDiv.appendChild(openTasksContainer);
            
            // Abgeschlossene Aufgaben (separat, ein-/ausklappbar)
            const completedHeaderDiv = document.createElement('div');
            const isCompletedCollapsed = collapsedCompletedByCategory.has(categoryName);
            completedHeaderDiv.className = 'completed-header';
            completedHeaderDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fafafa;border-radius:8px;cursor:pointer;margin-bottom:8px;border:1px solid #eee;';
            completedHeaderDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;cursor:pointer;color:#888;">${isCompletedCollapsed ? '▸' : '▾'}</span>
                    <span style="font-weight:500;font-size:14px;color:#666;">Abgeschlossen</span>
                    <span style="background:#e8e8e8;padding:2px 8px;border-radius:12px;font-size:11px;color:#666;">${completedTasks.length}</span>
                </div>
            `;
            completedHeaderDiv.addEventListener('click', () => {
                if (collapsedCompletedByCategory.has(categoryName)) {
                    collapsedCompletedByCategory.delete(categoryName);
                } else {
                    collapsedCompletedByCategory.add(categoryName);
                }
                renderTasks(tasks);
            });
            
            categoryDiv.appendChild(completedHeaderDiv);
            
            if (!isCompletedCollapsed) {
                const completedTasksContainer = document.createElement('div');
                completedTasksContainer.style.cssText = 'margin-left:16px;';
                
                completedTasks.forEach(task => {
                    const taskElement = createTaskElement(task, tasks);
                    completedTasksContainer.appendChild(taskElement);
                });
                
                categoryDiv.appendChild(completedTasksContainer);
            }
        }
        
        container.appendChild(categoryDiv);
    });
    
    updateNewTaskForm();
}

function createTaskElement(task, allTasks) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    taskDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;';
    
    const leftDiv = document.createElement('div');
    leftDiv.style.cssText = 'display:flex;align-items:center;gap:12px;flex:1;';
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.status === 'abgeschlossen';
    checkbox.style.cssText = 'width:20px;height:20px;cursor:pointer;';
    checkbox.addEventListener('change', () => {
        toggleTaskStatus(task.id, checkbox.checked);
    });
    
    // Titel
    const titleSpan = document.createElement('span');
    titleSpan.textContent = task.title || 'Ohne Titel';
    titleSpan.style.cssText = 'font-size:15px;flex:1;';
    if (task.status === 'abgeschlossen') {
        titleSpan.style.textDecoration = 'line-through';
        titleSpan.style.color = '#888';
    }
    
    // Datum anzeigen (falls vorhanden)
    const dateSpan = document.createElement('span');
    const dateValue = task.dueDate || task.createdAt || task.updatedAt;
    if (dateValue) {
        dateSpan.textContent = formatDate(dateValue);
        dateSpan.style.cssText = 'font-size:12px;color:#888;margin-left:8px;';
    }
    
    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(titleSpan);
    if (dateValue) {
        leftDiv.appendChild(dateSpan);
    }
    
    // Rechte Seite: Bearbeiten/L löschen
    const rightDiv = document.createElement('div');
    rightDiv.style.cssText = 'display:flex;gap:8px;';
    
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;padding:4px;';
    editBtn.addEventListener('click', () => {
        editTask(task);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;padding:4px;';
    deleteBtn.addEventListener('click', () => {
        deleteTask(task.id);
    });
    
    rightDiv.appendChild(editBtn);
    rightDiv.appendChild(deleteBtn);
    
    taskDiv.appendChild(leftDiv);
    taskDiv.appendChild(rightDiv);
    
    return taskDiv;
}

function updateNewTaskForm() {
    const categorySelect = document.getElementById('task-category');
    if (!categorySelect) return;
    
    // Kategorien aus vorhandenen Aufgaben extrahieren
    const categorySet = new Set();
    categorySet.add('Unkategorisiert');
    
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => {
        const header = section.querySelector('.category-header span:nth-child(2)');
        if (header) {
            categorySet.add(header.textContent);
        }
    });
    
    categorySelect.innerHTML = '';
    const sortedCategories = Array.from(categorySet).sort();
    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
    
    const newCatOption = document.createElement('option');
    newCatOption.value = '__new__';
    newCatOption.textContent = '+ Neue Kategorie';
    categorySelect.appendChild(newCatOption);
    
    categorySelect.addEventListener('change', () => {
        if (categorySelect.value === '__new__') {
            const newCatName = prompt('Name der neuen Kategorie:');
            if (newCatName && newCatName.trim()) {
                const newCat = newCatName.trim();
                const option = document.createElement('option');
                option.value = newCat;
                option.textContent = newCat;
                categorySelect.insertBefore(option, newCatOption);
                categorySelect.value = newCat;
            } else {
                categorySelect.value = 'Unkategorisiert';
            }
        }
    });
}

async function addTask() {
    if (!currentUser) return;
    
    const titleInput = document.getElementById('task-title');
    const categorySelect = document.getElementById('task-category');
    const dueDateInput = document.getElementById('task-due-date');
    
    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const dueDate = dueDateInput.value ? new Date(dueDateInput.value) : null;
    
    if (!title) {
        alert('Bitte einen Titel eingeben');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('tasks').add({
            title,
            category,
            dueDate: dueDate ? firebase.firestore.Timestamp.fromDate(dueDate) : null,
            status: 'offen',
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now()
        });
        
        titleInput.value = '';
        dueDateInput.value = '';
    } catch (error) {
        console.error('Fehler beim Hinzufgen:', error);
        alert('Fehler: ' + error.message);
    }
}

async function toggleTaskStatus(taskId, isCompleted) {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).update({
            status: isCompleted ? 'abgeschlossen' : 'offen',
            updatedAt: firebase.firestore.Timestamp.now()
        });
    } catch (error) {
        console.error('Fehler beim Update:', error);
    }
}

function editTask(task) {
    const newTitle = prompt('Neuer Titel:', task.title);
    if (newTitle === null) return;
    
    const newCategory = prompt('Neue Kategorie:', task.category || 'Unkategorisiert');
    if (newCategory === null) return;
    
    updateTask(task.id, {
        title: newTitle.trim(),
        category: newCategory.trim(),
        updatedAt: firebase.firestore.Timestamp.now()
    });
}

async function updateTask(taskId, data) {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).update(data);
    } catch (error) {
        console.error('Fehler beim Update:', error);
    }
}

async function deleteTask(taskId) {
    if (!currentUser) return;
    
    if (!confirm('Aufgabe wirklich löschen?')) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete();
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
    }
}

// ============================================
// HELFER (HELPERS)
// ============================================

function loadHelpers() {
    const container = document.getElementById('helpers-container');
    if (container) {
        container.innerHTML = '<p>Helfer-Verwaltung kommt in Version 4.20</p>';
    }
}

// Initialisierung
window.addEventListener('DOMContentLoaded', () => {
    console.log('Baustellen-Manager v4.19.1 initialized');
});
