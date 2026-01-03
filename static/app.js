// API Configuration
const API_URL = '/api/todos';
const CONFIG = {
    appName: 'DevFlow',
    version: '1.1.0',
    developer: 'Yuvraj'
};

// DOM Elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');

// New metric elements
const totalElement = document.querySelector('.metric-value.total');
const completedElement = document.querySelector('.metric-value.completed');
const pendingElement = document.querySelector('.metric-value.pending');
const productivityElement = document.querySelector('.metric-value.productivity');
const productivityFill = document.querySelector('.productivity-fill');

const filterButtons = document.querySelectorAll('.filter-btn');

// Application State
let todos = [];
let currentFilter = 'all';

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    console.log(`${CONFIG.appName} v${CONFIG.version} initialized`);
});

// Core Application Functions
async function initializeApp() {
    setupEventListeners();
    await loadTodos();
    setupFiltering();
    
    // Initialize Typed.js
    initializeTypedText();
}

function setupEventListeners() {
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // Real-time input validation
    todoInput.addEventListener('input', debounce(validateInput, 300));
}

function setupFiltering() {
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
}

// Initialize Typed.js text animation
function initializeTypedText() {
    var typed = new Typed('#typed-text', {
        strings: [
            'Professional task management for developers',
            'Ship quality code faster',
            'Organize your workflow efficiently',
            'Boost your productivity'
        ],
        typeSpeed: 40,
        backSpeed: 30,
        backDelay: 1500,
        startDelay: 500,
        loop: true,
        showCursor: true,
        cursorChar: '|',
        smartBackspace: true
    });
}

// API Operations
async function loadTodos() {
    try {
        showLoading(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch todos');
        todos = await response.json() || [];
        renderTodos();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Failed to load tasks. Please check your connection.', 'error');
        // Fallback to localStorage
        const localData = localStorage.getItem('devflow_todos');
        if (localData) {
            todos = JSON.parse(localData);
            renderTodos();
        }
    } finally {
        showLoading(false);
    }
}

async function addTodo() {
    const title = todoInput.value.trim();
    
    if (!validateTaskTitle(title)) {
        showInputError('Please enter a valid task title (min 3 characters)');
        return;
    }

    const newTodo = {
        title,
        completed: false,
        createdAt: new Date().toISOString(),
        priority: 'medium'
    };

    try {
        setButtonLoading(true);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newTodo)
        });

        if (response.ok) {
            const savedTodo = await response.json();
            todos.push(savedTodo);
            
            // Sync to localStorage as backup
            syncToLocalStorage();
            
            todoInput.value = '';
            renderTodos();
            showNotification('Task added successfully!', 'success');
            
            // Analytics event
            trackEvent('task_added');
        } else {
            throw new Error('Failed to save task');
        }
    } catch (error) {
        console.error('Add Todo Error:', error);
        
        // Fallback: Add to local state
        newTodo.id = Date.now();
        todos.push(newTodo);
        syncToLocalStorage();
        renderTodos();
        
        showNotification('Task added locally (offline mode)', 'warning');
    } finally {
        setButtonLoading(false);
    }
}

async function toggleTodo(id) {
    const todoIndex = todos.findIndex(t => t.id === id);
    if (todoIndex === -1) return;

    const originalState = todos[todoIndex].completed;
    todos[todoIndex].completed = !originalState;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(todos[todoIndex])
        });

        if (!response.ok) {
            // Revert on error
            todos[todoIndex].completed = originalState;
            throw new Error('Failed to update task');
        }
        
        // Sync to localStorage
        syncToLocalStorage();
        
        renderTodos();
        trackEvent('task_toggled');
    } catch (error) {
        console.error('Toggle Error:', error);
        showNotification('Failed to update task status', 'error');
        // Re-render to show correct state
        renderTodos();
    }
}

async function deleteTodo(id) {
    if (!await showConfirmation('Delete Task', 'Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }

    const todoIndex = todos.findIndex(t => t.id === id);
    if (todoIndex === -1) return;

    const deletedTodo = todos[todoIndex];
    todos = todos.filter(t => t.id !== id);

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            // Restore if delete failed
            todos.splice(todoIndex, 0, deletedTodo);
            throw new Error('Failed to delete task');
        }
        
        // Sync to localStorage
        syncToLocalStorage();
        
        renderTodos();
        showNotification('Task deleted successfully', 'info');
        trackEvent('task_deleted');
    } catch (error) {
        console.error('Delete Error:', error);
        showNotification('Failed to delete task', 'error');
        // Re-render to show correct state
        renderTodos();
    }
}

// UI Rendering
function renderTodos() {
    todoList.innerHTML = '';
    
    // Filter tasks based on current filter
    let filteredTodos = todos;
    if (currentFilter === 'pending') {
        filteredTodos = todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = todos.filter(t => t.completed);
    }

    if (filteredTodos.length === 0) {
        emptyState.style.display = 'block';
        todoList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        todoList.style.display = 'block';

        filteredTodos.forEach(todo => {
            const taskElement = createTaskElement(todo);
            todoList.appendChild(taskElement);
        });
    }

    updateMetrics();
}

function createTaskElement(todo) {
    const li = document.createElement('li');
    li.className = `task-item ${todo.completed ? 'completed' : ''}`;
    li.setAttribute('data-testid', `todo-item-${todo.id}`);
    li.setAttribute('data-priority', todo.priority || 'medium');

    const date = new Date(todo.createdAt || Date.now());
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    li.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox"
            ${todo.completed ? 'checked' : ''} 
            onchange="toggleTodo(${todo.id})"
            data-testid="todo-checkbox-${todo.id}"
        />
        <div class="task-content">
            <div class="task-title">${escapeHtml(todo.title)}</div>
            <div class="task-meta">
                <span class="task-date">${formattedDate}</span>
                <span class="task-priority">${getPriorityBadge(todo.priority)}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn edit-btn" onclick="editTodo(${todo.id})" title="Edit task">
                <i class="fas fa-edit"></i>
            </button>
            <button 
                class="action-btn delete-btn" 
                onclick="deleteTodo(${todo.id})"
                data-testid="delete-button-${todo.id}"
                title="Delete task"
            >
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return li;
}

// Update Metrics
function updateMetrics() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    const productivity = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update metric values
    animateCounter(totalElement, total);
    animateCounter(completedElement, completed);
    animateCounter(pendingElement, pending);
    animateCounter(productivityElement, productivity, '%');
    
    // Update productivity bar
    productivityFill.style.width = `${productivity}%`;
    
    // Color coding for productivity
    if (productivity >= 80) {
        productivityElement.style.color = '#10b981';
        productivityFill.style.background = '#10b981';
    } else if (productivity >= 50) {
        productivityElement.style.color = '#f59e0b';
        productivityFill.style.background = '#f59e0b';
    } else {
        productivityElement.style.color = '#ef4444';
        productivityFill.style.background = '#ef4444';
    }
}

// Utility Functions
function validateTaskTitle(title) {
    return title.length >= 3 && title.length <= 200;
}

function showInputError(message) {
    todoInput.style.borderColor = 'var(--danger)';
    todoInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    
    setTimeout(() => {
        todoInput.style.borderColor = '';
        todoInput.style.boxShadow = '';
    }, 3000);
    
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function animateCounter(element, target, suffix = '') {
    const current = parseInt(element.textContent) || 0;
    if (current === target && suffix === element.textContent.slice(-1)) return;
    
    const duration = 500;
    const steps = 60;
    const increment = (target - current) / steps;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        const value = Math.round(current + (increment * step));
        element.textContent = value + suffix;
        
        if (step >= steps) {
            element.textContent = target + suffix;
            clearInterval(timer);
        }
    }, duration / steps);
}

function setButtonLoading(loading) {
    if (loading) {
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        addBtn.disabled = true;
    } else {
        addBtn.innerHTML = '<i class="fas fa-rocket"></i> Add Task';
        addBtn.disabled = false;
    }
}

function showLoading(show) {
    // Could be extended for a more sophisticated loading state
}

function getPriorityBadge(priority) {
    const badges = {
        high: '<span style="color:#ef4444;font-weight:600">HIGH</span>',
        medium: '<span style="color:#f59e0b;font-weight:600">MEDIUM</span>',
        low: '<span style="color:#10b981;font-weight:600">LOW</span>'
    };
    return badges[priority] || badges.medium;
}

function syncToLocalStorage() {
    localStorage.setItem('devflow_todos', JSON.stringify(todos));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function validateInput() {
    const value = todoInput.value.trim();
    if (value.length > 0 && value.length < 3) {
        todoInput.style.borderColor = 'var(--warning)';
    } else {
        todoInput.style.borderColor = '';
    }
}

async function showConfirmation(title, message) {
    return new Promise((resolve) => {
        if (window.confirm(`${title}\n\n${message}`)) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

function trackEvent(eventName, data = {}) {
    console.log(`[Analytics] ${eventName}:`, data);
}

// Placeholder functions for future features
function editTodo(id) {
    showNotification('Edit feature coming in v2.2!', 'info');
}


// Dark Mode Toggle
function initDarkMode() {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
        <span class="toggle-icon">🌙</span>
        <span class="toggle-text">Dark Mode</span>
    `;
    
    document.body.appendChild(themeToggle);
    
    // Check for saved theme or OS preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');
    
    // Apply saved theme or OS preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateToggleButton(true);
    }
    
    // Toggle dark mode on button click
    themeToggle.addEventListener('click', function() {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkMode) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            updateToggleButton(false);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            updateToggleButton(true);
        }
    });
    
    // Update button text and icon
    function updateToggleButton(isDarkMode) {
        const icon = themeToggle.querySelector('.toggle-icon');
        const text = themeToggle.querySelector('.toggle-text');
        
        if (isDarkMode) {
            icon.textContent = '☀️';
            text.textContent = 'Light Mode';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Dark Mode';
        }
    }
    
    // Listen for OS theme changes
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
                updateToggleButton(true);
            } else {
                document.documentElement.removeAttribute('data-theme');
                updateToggleButton(false);
            }
        }
    });
}