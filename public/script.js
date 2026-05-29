const API_URL = '/api/tasks';
let currentEditId = null;
let currentFilter = 'all';

// DOM Elements
const taskForm = document.getElementById('taskForm');
const tasksList = document.getElementById('tasksList');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const feedback = document.getElementById('feedback');

// Load tasks on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupFilters();
});

// Setup filter buttons
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadTasks();
        });
    });
}

// Load all tasks
async function loadTasks() {
    try {
        showLoading();
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (result.success) {
            displayTasks(result.data);
        } else {
            showError('Failed to load tasks');
        }
    } catch (error) {
        showError('Network error: Could not load tasks');
    }
}

// Display tasks
function displayTasks(tasks) {
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="loading">No tasks found. Create your first task!</p>';
        return;
    }
    
    // Apply filter
    let filteredTasks = tasks;
    if (currentFilter !== 'all') {
        filteredTasks = tasks.filter(task => task.status === currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `<p class="loading">No ${currentFilter} tasks found.</p>`;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-card" data-id="${task.id}">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div style="margin-top: 8px;">
                        <span class="priority priority-${task.priority}">${task.priority}</span>
                        <span class="status status-${task.status.replace(' ', '')}">${task.status}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-edit" onclick="editTask(${task.id})">Edit</button>
                    <button class="btn btn-delete" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div>Created: ${new Date(task.createdAt).toLocaleDateString()}</div>
                ${task.updatedAt !== task.createdAt ? `<div>Updated: ${new Date(task.updatedAt).toLocaleDateString()}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show loading state
function showLoading() {
    tasksList.innerHTML = '<p class="loading">Loading...</p>';
}

// Show feedback message
function showMessage(message, type) {
    feedback.innerHTML = `<div class="feedback ${type}">${message}</div>`;
    setTimeout(() => {
        feedback.innerHTML = '';
    }, 3000);
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

// Client-side validation
function validateForm(title, description) {
    const errors = {};
    
    if (!title || title.trim().length === 0) {
        errors.title = 'Title is required';
    } else if (title.length < 3) {
        errors.title = 'Title must be at least 3 characters';
    } else if (title.length > 100) {
        errors.title = 'Title must be less than 100 characters';
    }
    
    if (description && description.length > 500) {
        errors.description = 'Description must be less than 500 characters';
    }
    
    // Display errors
    document.getElementById('titleError').textContent = errors.title || '';
    document.getElementById('descriptionError').textContent = errors.description || '';
    
    return Object.keys(errors).length === 0;
}

// Handle form submission
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const priority = document.getElementById('priority').value;
    const status = document.getElementById('status').value;
    
    // Client-side validation
    if (!validateForm(title, description)) {
        return;
    }
    
    const taskData = { title, description, priority, status };
    
    try {
        let response;
        if (currentEditId) {
            // Update existing task
            response = await fetch(`${API_URL}/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            // Create new task
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(currentEditId ? 'Task updated successfully!' : 'Task created successfully!');
            resetForm();
            loadTasks();
        } else {
            if (result.errors) {
                showError(result.errors.join(', '));
            } else {
                showError(result.error || 'Operation failed');
            }
        }
    } catch (error) {
        showError('Network error: Could not save task');
    }
});

// Edit task
async function editTask(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const task = result.data;
            currentEditId = task.id;
            
            // Fill form with task data
            document.getElementById('title').value = task.title;
            document.getElementById('description').value = task.description || '';
            document.getElementById('priority').value = task.priority;
            document.getElementById('status').value = task.status;
            
            formTitle.textContent = 'Edit Task';
            submitBtn.textContent = 'Update Task';
            cancelBtn.style.display = 'inline-block';
            
            // Scroll to form
            document.getElementById('formContainer').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        showError('Could not load task for editing');
    }
}

// Delete task
async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Task deleted successfully!');
            loadTasks();
            if (currentEditId === id) {
                resetForm();
            }
        } else {
            showError(result.error || 'Failed to delete task');
        }
    } catch (error) {
        showError('Network error: Could not delete task');
    }
}

// Reset form
function resetForm() {
    taskForm.reset();
    currentEditId = null;
    formTitle.textContent = 'Add New Task';
    submitBtn.textContent = 'Add Task';
    cancelBtn.style.display = 'none';
    
    // Clear validation errors
    document.getElementById('titleError').textContent = '';
    document.getElementById('descriptionError').textContent = '';
}

// Cancel edit
cancelBtn.addEventListener('click', resetForm);

// Real-time validation
document.getElementById('title').addEventListener('input', (e) => {
    const title = e.target.value;
    if (title && title.length < 3) {
        document.getElementById('titleError').textContent = 'Title must be at least 3 characters';
    } else if (title && title.length > 100) {
        document.getElementById('titleError').textContent = 'Title must be less than 100 characters';
    } else {
        document.getElementById('titleError').textContent = '';
    }
});