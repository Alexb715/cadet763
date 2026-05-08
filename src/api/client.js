// Thin wrapper around fetch for the (future) backend.
// Toggle USE_BACKEND=true once you have one up; until then the auth/content/posts
// modules fall back to localStorage so the site is fully usable on its own.

export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}
