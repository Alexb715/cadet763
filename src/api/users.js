import { api, USE_BACKEND } from './client.js';

export async function listUsers(token) {
  if (!USE_BACKEND) return { ok: true, items: [] };
  return api('/users', { token });
}

export async function createUser({ username, password, role, name }, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  return api('/users', { method: 'POST', token, body: { username, password, role, name } });
}

export async function updateUser(id, patch, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  return api(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: patch });
}

export async function deleteUser(id, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  return api(`/users/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}
