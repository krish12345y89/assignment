const API = 'http://localhost:5000/api/v1';
const taskForm = document.getElementById('taskForm');
const tasksContainer = document.getElementById('tasks');
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn?.addEventListener('click', async () => {
  const res = await fetch(`${API}/users/logout`, {
    credentials: 'include'
  });
  alert((await res.json()).message);
  window.location.href = 'index.html';
});

taskForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(taskForm);
  const data = Object.fromEntries(formData);
  const taskId = data.taskId;
  delete data.taskId;

  const method = taskId ? 'PUT' : 'POST';
  const endpoint = taskId ? `${API}/task/${taskId}` : `${API}/task/new`;

  const res = await fetch(endpoint, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  alert((await res.json()).message);
  taskForm.reset();
  document.getElementById('taskId').value = '';
  loadTasks();
});

async function loadTasks() {
  const res = await fetch(`${API}/task/my`, { credentials: 'include' });
  const data = await res.json();
  tasksContainer.innerHTML = '';
  data.tasks?.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
    taskEl.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.description}</p>
      <p>Priority: ${task.priority}</p>
      <p>Status: ${task.isCompleted ? 'Completed' : 'Pending'}</p>
      <div class="task-actions">
        <button onclick="updateTask('${task._id}', ${!task.isCompleted})">Toggle Complete</button>
        <button onclick="editTask(${JSON.stringify(task).replace(/"/g, '&quot;')})">Edit</button>
        <button onclick="deleteTask('${task._id}')">Delete</button>
      </div>
    `;
    tasksContainer.appendChild(taskEl);
  });
}

window.updateTask = async (id, isCompleted) => {
  const res = await fetch(`${API}/task/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isCompleted }),
  });
  alert((await res.json()).message);
  loadTasks();
};

window.deleteTask = async (id) => {
  const res = await fetch(`${API}/task/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  alert((await res.json()).message);
  loadTasks();
};

window.editTask = (task) => {
  document.getElementById('taskId').value = task._id;
  document.querySelector('[name="title"]').value = task.title;
  document.querySelector('[name="description"]').value = task.description;
  document.querySelector('[name="priority"]').value = task.priority;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

loadTasks();
