// TaskManager — Task list with status indicators, direction badges, and creation form
import { API_BASE } from '../main.js';

export function renderTaskManager(container, tasks, onRefresh) {
  const rawTasks = Array.isArray(tasks) ? tasks : [];
  const allTasks = rawTasks.map(t => ({
    title: t.title || 'Untitled',
    type: t.type || t.source || 'manual',
    status: t.status || 'pending',
    direction: t.direction || t.source || 'manual',
    source: t.source || 'manual',
    time: t.time || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : 'Now'),
    priority: t.priority || 'medium',
  }));

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Task Manager</h2>
        <p class="section-subtitle">Create and track tasks for your NAOS system</p>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-refresh-tasks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
        Refresh
      </button>
    </div>

    <div class="task-form">
      <input type="text" class="task-input" id="task-input" placeholder="Type a task name and press Enter or click Add Task..." />
      <select class="task-input" id="task-priority" style="flex: 0 0 120px;">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btn-create-task">Add Task</button>
    </div>

    <div class="task-list" id="task-list-container">
      ${allTasks.length > 0 ? allTasks.map(renderTaskItem).join('') : renderDemoTasks()}
    </div>
  `;

  // --- Create task ---
  const btnCreate = container.querySelector('#btn-create-task');
  const taskInput = container.querySelector('#task-input');
  const prioritySelect = container.querySelector('#task-priority');

  if (btnCreate && taskInput) {
    const createTask = async () => {
      const title = taskInput.value.trim();
      if (!title) {
        taskInput.style.borderColor = 'var(--accent-red)';
        taskInput.placeholder = 'Please enter a task name...';
        setTimeout(() => {
          taskInput.style.borderColor = '';
          taskInput.placeholder = 'Type a task name and press Enter or click Add Task...';
        }, 2000);
        return;
      }

      // Show loading
      btnCreate.disabled = true;
      btnCreate.textContent = 'Adding...';

      try {
        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            priority: prioritySelect?.value || 'medium',
            source: 'manual',
          }),
        });

        if (res.ok) {
          const newTask = await res.json();
          taskInput.value = '';

          // Add the new task to the list immediately
          const listContainer = container.querySelector('#task-list-container');
          const taskEl = document.createElement('div');
          taskEl.innerHTML = renderTaskItem({
            title: newTask.title || title,
            type: 'manual',
            status: newTask.status || 'pending',
            direction: 'manual',
            source: 'manual',
            time: 'Just now',
            priority: newTask.priority || prioritySelect?.value || 'medium',
          });
          // Remove demo tasks if present
          const demoMarker = listContainer.querySelector('.demo-tasks');
          if (demoMarker) demoMarker.remove();
          listContainer.prepend(taskEl.firstElementChild);

          // Flash green border on input as feedback
          taskInput.style.borderColor = 'var(--accent-green)';
          taskInput.style.boxShadow = '0 0 0 3px var(--accent-green-glow)';
          setTimeout(() => {
            taskInput.style.borderColor = '';
            taskInput.style.boxShadow = '';
          }, 1000);
        } else {
          const err = await res.json().catch(() => ({}));
          console.error('Task creation failed:', err);
          taskInput.style.borderColor = 'var(--accent-red)';
          setTimeout(() => { taskInput.style.borderColor = ''; }, 2000);
        }
      } catch (e) {
        console.error('Failed to create task:', e);
      }

      btnCreate.disabled = false;
      btnCreate.textContent = 'Add Task';
    };

    btnCreate.addEventListener('click', createTask);
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') createTask();
    });
    // Auto-focus input
    taskInput.focus();
  }

  // --- Refresh ---
  const btnRefresh = container.querySelector('#btn-refresh-tasks');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      if (onRefresh) await onRefresh();
    });
  }
}

function renderDemoTasks() {
  const demoTasks = [
    { title: 'Project Tracker', type: 'notion→github', status: 'done', direction: 'notion→github', source: 'sync', time: 'Demo' },
    { title: 'Issue #42: Fix auth bug', type: 'github→notion', status: 'done', direction: 'github→notion', source: 'sync', time: 'Demo' },
    { title: 'Sprint Board', type: 'notion→github', status: 'done', direction: 'notion→github', source: 'sync', time: 'Demo' },
    { title: 'Status mismatch', type: 'conflict', status: 'done', direction: 'conflict', source: 'sync', time: 'Demo' },
    { title: 'Bug Reports', type: 'notion→github', status: 'pending', direction: 'notion→github', source: 'sync', time: 'Demo' },
  ];
  return `<div class="demo-tasks">${demoTasks.map(renderTaskItem).join('')}</div>`;
}

function renderTaskItem(task) {
  const statusIcon = {
    pending: '◯',
    running: '◎',
    done: '✓',
    error: '✕',
  }[task.status] || '◯';

  const priorityColor = {
    critical: 'var(--accent-red)',
    high: 'var(--accent-orange)',
    medium: 'var(--accent-cyan)',
    low: 'var(--text-tertiary)',
  }[task.priority] || '';

  return `
    <div class="task-item">
      <div class="task-status-icon ${task.status}">${statusIcon}</div>
      <div class="task-info">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">${task.source} • ${task.time}${task.priority ? ` • <span style="color: ${priorityColor}">${task.priority}</span>` : ''}</div>
      </div>
      <div class="task-direction">${task.direction}</div>
    </div>
  `;
}
