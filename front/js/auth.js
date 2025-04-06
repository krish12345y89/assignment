const API = 'http://localhost:5000/api/v1';

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(registerForm));
  const res = await fetch(`${API}/users/new`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  alert((await res.json()).message);
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  alert(result.message);
  if (res.ok) {
    window.location.href = 'tasks.html';
  }
});
