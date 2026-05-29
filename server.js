const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Helper function to read tasks
const readTasks = () => {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
};

// Helper function to write tasks
const writeTasks = (tasks) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
};

// Validation functions
const validateTask = (task, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || task.title !== undefined) {
        if (!task.title || task.title.trim().length === 0) {
            errors.push('Title is required');
        } else if (task.title.length < 3) {
            errors.push('Title must be at least 3 characters');
        } else if (task.title.length > 100) {
            errors.push('Title must be less than 100 characters');
        }
    }
    
    if (!isUpdate || task.description !== undefined) {
        if (task.description && task.description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
    }
    
    if (!isUpdate || task.priority !== undefined) {
        const validPriorities = ['Low', 'Medium', 'High'];
        if (task.priority && !validPriorities.includes(task.priority)) {
            errors.push('Priority must be Low, Medium, or High');
        }
    }
    
    if (!isUpdate || task.status !== undefined) {
        const validStatuses = ['Pending', 'In Progress', 'Completed'];
        if (task.status && !validStatuses.includes(task.status)) {
            errors.push('Status must be Pending, In Progress, or Completed');
        }
    }
    
    return errors;
};

// API Routes

// GET all tasks
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = readTasks();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to read tasks' });
    }
});

// GET single task
app.get('/api/tasks/:id', (req, res) => {
    try {
        const tasks = readTasks();
        const task = tasks.find(t => t.id === parseInt(req.params.id));
        
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to read task' });
    }
});

// POST create new task
app.post('/api/tasks', (req, res) => {
    try {
        const tasks = readTasks();
        const newTask = req.body;
        
        // Server-side validation
        const validationErrors = validateTask(newTask);
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                errors: validationErrors 
            });
        }
        
        // Create new task
        const task = {
            id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            title: newTask.title.trim(),
            description: newTask.description ? newTask.description.trim() : '',
            priority: newTask.priority || 'Medium',
            status: newTask.status || 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tasks.push(task);
        writeTasks(tasks);
        
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create task' });
    }
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
    try {
        const tasks = readTasks();
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        
        if (taskIndex === -1) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        const updateData = req.body;
        
        // Server-side validation for update
        const validationErrors = validateTask(updateData, true);
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                errors: validationErrors 
            });
        }
        
        // Update task
        const updatedTask = {
            ...tasks[taskIndex],
            title: updateData.title !== undefined ? updateData.title.trim() : tasks[taskIndex].title,
            description: updateData.description !== undefined ? updateData.description.trim() : tasks[taskIndex].description,
            priority: updateData.priority || tasks[taskIndex].priority,
            status: updateData.status || tasks[taskIndex].status,
            updatedAt: new Date().toISOString()
        };
        
        tasks[taskIndex] = updatedTask;
        writeTasks(tasks);
        
        res.json({ success: true, data: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update task' });
    }
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const tasks = readTasks();
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        
        if (taskIndex === -1) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        const deletedTask = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        writeTasks(tasks);
        
        res.json({ success: true, data: deletedTask });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/tasks`);
});