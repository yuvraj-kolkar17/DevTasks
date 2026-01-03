// API Base URL
const API_URL = '/api/todos';

// DOM Elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const pendingCount = document.getElementById('pendingCount');

// State
let todos = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
}


// Load todos from API
async function loadTodos() {
    try {
        showLoading(true);
        const response = await fetch(API_URL);
        
        // Check if response is ok
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server is not returning JSON. Make sure Go server is running!');
        }
        
        todos = await response.json() || [];
        renderTodos();
    } catch (error) {
        console.error('Failed to load todos:', error);
        showError(`⚠️ Connection Error!\n\n${error.message}\n\nMake sure the Go server is running:\ngo run cmd/server/main.go`);
        
        // Show empty state instead of loading
        showLoading(false);
        emptyState.innerHTML = `
            <div style="color: #ef4444;">
                <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: #dc2626;">Cannot Connect to Server</h3>
                <p style="color: #991b1b; margin-top: 10px;">
                    Make sure the backend is running:<br>
                    <code style="background: #fee; padding: 5px 10px; border-radius: 5px; display: inline-block; margin-top: 10px;">
                        go run cmd/server/main.go
                    </code>
                </p>
            </div>
        `;
        emptyState.style.display = 'block';
    } finally {
        showLoading(false);
    }
}

// Add new todo
async function addTodo() {
    const title = todoInput.value.trim();

    if (!title) {
        todoInput.focus();
        todoInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            todoInput.style.borderColor = '';
        }, 500);
        return;
    }

    try {
        addBtn.disabled = true;
        addBtn.textContent = '➕ Adding...';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                completed: false
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create todo: ${response.status}`);
        }

        const newTodo = await response.json();
        todos.push(newTodo);
        todoInput.value = '';
        renderTodos();
    } catch (error) {
        console.error('Failed to add todo:', error);
        showError('Failed to add task. Please try again.');
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = '➕ Add Task';
    }
}

// Toggle todo completion
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...todo,
                completed: !todo.completed
            })
        });

        if (response.ok) {
            todo.completed = !todo.completed;
            renderTodos();
        }
    } catch (error) {
        console.error('Failed to toggle todo:', error);
        showError('Failed to update task.');
    }
}

// Delete todo
async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }
    } catch (error) {
        console.error('Failed to delete todo:', error);
        showError('Failed to delete task.');
    }
}

// Render todos to DOM
function renderTodos() {
    todoList.innerHTML = '';

    if (todos.length === 0) {
        emptyState.innerHTML = `
            <div class="empty-state-icon">🎯</div>
            <h3>No tasks yet!</h3>
            <p>Add a task above to get started on your goals</p>
        `;
        emptyState.style.display = 'block';
        todoList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        todoList.style.display = 'block';

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-testid', `todo-item-${todo.id}`);

            li.innerHTML = `
                <input 
                    type="checkbox" 
                    class="todo-checkbox"
                    ${todo.completed ? 'checked' : ''} 
                    onchange="toggleTodo(${todo.id})"
                    data-testid="todo-checkbox-${todo.id}"
                />
                <span class="todo-title">${escapeHtml(todo.title)}</span>
                <div class="todo-actions">
                    <button 
                        class="delete-btn" 
                        onclick="deleteTodo(${todo.id})"
                        data-testid="delete-button-${todo.id}"
                        title="Delete task"
                    >
                        🗑️
                    </button>
                </div>
            `;

            todoList.appendChild(li);
        });
    }

    updateStats();
}

// Update statistics
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;

    animateValue(totalCount, parseInt(totalCount.textContent), total);
    animateValue(completedCount, parseInt(completedCount.textContent), completed);
    animateValue(pendingCount, parseInt(pendingCount.textContent), pending);
}

// Animate number changes
function animateValue(element, start, end) {
    if (start === end) return;
    
    const duration = 300;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Show/hide loading state
function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        emptyState.style.display = 'none';
        todoList.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    alert(message);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}