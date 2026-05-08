import { api, USE_BACKEND } from './client.js';

const KEY = '763_content_v1';

export async function loadContent() {
  if (USE_BACKEND) {
    return api('/content');
  }
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null') || {};
  } catch {
    return {};
  }
}

export async function saveContent(content, token) {
  if (USE_BACKEND) {
    return api('/content', { method: 'PUT', body: content, token });
  }
  localStorage.setItem(KEY, JSON.stringify(content));
  return { ok: true };
}

export async function clearContent(token) {
  if (USE_BACKEND) {
    return api('/content', { method: 'DELETE', token });
  }
  localStorage.removeItem(KEY);
  return { ok: true };
}

// Admin-only: list/get/restore historical revisions of the content document.
// In demo mode there is no history, so these resolve to empty/no-ops.
export async function listContentHistory(token) {
  if (!USE_BACKEND) return { ok: true, items: [] };
  return api('/content/history', { token });
}

export async function getContentRevision(id, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  return api(`/content/history/${encodeURIComponent(id)}`, { token });
}

export async function restoreContentRevision(id, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  return api(`/content/restore/${encodeURIComponent(id)}`, { method: 'POST', token });
}
