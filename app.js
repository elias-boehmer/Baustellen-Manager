// Baustellen-Manager App

let tasks = [];
let currentUser = null;

// Login functionality
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.loading-spinner');
    const errorMsg = document.getElementById('login-error');
    
    // Show loading state
    loginBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
    errorMsg.textContent = '';
    
    // Simulate login delay
    setTimeout(() => {
        if (username && password) {
            currentUser = username;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            loadTasks();
            updateDate();
        } else {
            errorMsg.textContent = 'Bitte Benutzername und Passwort eingeben';
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
        }
    }, 1500);
});

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

// Update current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.querySelector('.current-date').textContent = now.toLocaleDateString('de-DE', options);
}

// Load tasks from localStorage
function loadTasks() {
    const stored = localStorage.getItem('tasks_' + currentUser);
    tasks = stored ? JSON.parse(stored) : [];
    renderTasks();
    updateStats();
    updateTodayTasks();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks_' + currentUser, JSON.stringify(tasks));
    renderTasks();
    updateStats();
    updateTodayTasks();
}

// Get current sort option
function getSortOption() {
    return document.getElementById('sort-category').value;
}

// Sort tasks based on selected option
function sortTasks(tasksToSort) {
    const sortOption = getSortOption();
    
    if (sortOption === 'category') {
        return tasksToSort.sort((a, b) => {
            if (a.category < b.category) return -1;
            if (a.category > b.category) return 1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    } else if (sortOption === 'due-date-asc') {
        return tasksToSort.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (sortOption === 'due-date-desc') {
        return tasksToSort.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    }
    return tasksToSort;
}

// Render tasks list
function renderTasks() {
    const container = document.getElementById('tasks-list');
    const sortedTasks = sortTasks([...tasks]);
    
    if (sortedTasks.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Keine Aufgaben vorhanden</p>';
        return;
    }
    
    container.innerHTML = sortedTasks.map(task => {
        const statusClass = task.status.replace(' ', '-');
        const subtasksHTML = task.subtasks && task.subtasks.length > 0 ? `
            <div class="subtasks">
                ${task.subtasks.map((subtask, idx) => `
                    <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
                        <span>${subtask.title} (${formatDate(subtask.dueDate)})</span>
                        <input type="checkbox" ${subtask.completed ? 'checked' : ''} onchange="toggleSubtask(${task.id}, ${idx})">
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        return `
            <div class="task-item">
                <div class="task-header">
                    <span class="task-title" onclick="openEditModal(${task.id})">${task.title}</span>
                    <div class="task-actions">
                        <button onclick="openEditModal(${task.id})" title="Bearbeiten">✏️</button>
                        <button onclick="addSubtask(${task.id})" title="Unteraufgabe">➕</button>
                        <button onclick="deleteTask(${task.id})" title="Loeschen">🗑️</button>
                    </div>
                </div>
                <div class="task-meta">
                    <span>${task.category}</span>
                    <span class="priority-${task.priority}">${task.priority}</span>
                    <span class="status-${statusClass}">${task.status}</span>
                    <span>📅 ${formatDate(task.dueDate)}</span>
                </div>
                ${subtasksHTML}
            </div>
        `;
    }).join('');
}

// Format date to German format
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Update stats
function updateStats() {
    const total = tasks.length;
    const open = tasks.filter(t => t.status === 'Offen').length;
    const inProgress = tasks.filter(t => t.status === 'In Arbeit').length;
    const completed = tasks.filter(t => t.status === 'Erledigt').length;
    
    document.getElementById('stats').innerHTML = `
        <div><strong>Gesamt:</strong> ${total}</div>
        <div><strong>Offen:</strong> ${open}</div>
        <div><strong>In Arbeit:</strong> ${inProgress}</div>
        <div><strong>Erledigt:</strong> ${completed}</div>
    `;
}

// Update today's tasks
function updateTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === today);
    
    const container = document.getElementById('today-tasks');
    if (todayTasks.length === 0) {
        container.innerHTML = '<p style="color: #666;">Keine Aufgaben fuer heute</p>';
    } else {
        container.innerHTML = todayTasks.map(t => `
            <div class="task-item" style="padding: 0.5rem;">
                <strong>${t.title}</strong> - ${t.category}
            </div>
        `).join('');
    }
}

// Modal functionality
const taskModal = document.getElementById('task-modal');
const subtaskModal = document.getElementById('subtask-modal');
const closeBtns = document.querySelectorAll('.close');

closeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        taskModal.style.display = 'none';
        subtaskModal.style.display = 'none';
    });
});

window.addEventListener('click', function(e) {
    if (e.target === taskModal) taskModal.style.display = 'none';
    if (e.target === subtaskModal) subtaskModal.style.display = 'none';
});

// Add task button
document.getElementById('add-task-btn').addEventListener('click', function() {
    document.getElementById('modal-title').textContent = 'Aufgabe hinzufuegen';
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    taskModal.style.display = 'block';
});

// Task form submit
document.getElementById('task-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const category = document.getElementById('task-category').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const status = document.getElementById('task-status').value;
    
    if (taskId) {
        // Edit existing task
        const task = tasks.find(t => t.id == taskId);
        if (task) {
            task.title = title;
            task.description = description;
            task.category = category;
            task.dueDate = dueDate;
            task.priority = priority;
            task.status = status;
        }
    } else {
        // Add new task
        const newTask = {
            id: Date.now(),
            title,
            description,
            category,
            dueDate,
            priority,
            status,
            subtasks: []
        };
        tasks.push(newTask);
    }
    
    saveTasks();
    taskModal.style.display = 'none';
});

// Open edit modal
function openEditModal(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    document.getElementById('modal-title').textContent = 'Aufgabe bearbeiten';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-due-date').value = task.dueDate;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    
    taskModal.style.display = 'block';
}

// Delete task
function deleteTask(taskId) {
    if (confirm('Aufgabe wirklich loeschen?')) {
        tasks = tasks.filter(t => t.id != taskId);
        saveTasks();
    }
}

// Add subtask
function addSubtask(taskId) {
    document.getElementById('subtask-modal-title').textContent = 'Unteraufgabe hinzufuegen';
    document.getElementById('subtask-form').reset();
    document.getElementById('subtask-parent-id').value = taskId;
    document.getElementById('subtask-id').value = '';
    subtaskModal.style.display = 'block';
}

// Subtask form submit
document.getElementById('subtask-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const parentId = parseInt(document.getElementById('subtask-parent-id').value);
    const subtaskId = document.getElementById('subtask-id').value;
    const title = document.getElementById('subtask-title').value;
    const description = document.getElementById('subtask-description').value;
    const dueDate = document.getElementById('subtask-due-date').value;
    const status = document.getElementById('subtask-status').value;
    
    const task = tasks.find(t => t.id === parentId);
    if (!task) return;
    
    if (subtaskId) {
        // Edit existing subtask
        const subtask = task.subtasks.find(s => s.id == subtaskId);
        if (subtask) {
            subtask.title = title;
            subtask.description = description;
            subtask.dueDate = dueDate;
            subtask.status = status;
        }
    } else {
        // Add new subtask
        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push({
            id: Date.now(),
            title,
            description,
            dueDate,
            status,
            completed: false
        });
    }
    
    saveTasks();
    subtaskModal.style.display = 'none';
});

// Toggle subtask completion
function toggleSubtask(taskId, subtaskIdx) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks[subtaskIdx]) return;
    
    task.subtasks[subtaskIdx].completed = !task.subtasks[subtaskIdx].completed;
    saveTasks();
}

// Sort dropdown change listener
document.getElementById('sort-category').addEventListener('change', function() {
    renderTasks();
});
