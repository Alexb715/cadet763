import { api, USE_BACKEND, API_BASE } from './client.js';

// Returns array of {id, url, thumbUrl, mime, width, height, alt_en, alt_fr, uploadedAt}.
export async function listImages(token) {
  if (!USE_BACKEND) return [];
  const res = await api('/images', { token });
  return res?.items || [];
}

// Uploads via multipart/form-data. Skips the JSON `api()` wrapper so we can
// send a FormData body. Returns the created image record.
export async function uploadImage(file, { altEn = '', altFr = '' } = {}, token) {
  if (!USE_BACKEND) {
    throw new Error('uploads require a backend');
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('alt_en', altEn);
  fd.append('alt_fr', altFr);
  const res = await fetch(`${API_BASE}/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
    credentials: 'include',
  });
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch {}
  if (!res.ok || !body?.ok) {
    const err = new Error(body?.message || body?.error || `upload failed (${res.status})`);
    err.code = body?.error;
    err.status = res.status;
    throw err;
  }
  return body.image;
}

export async function deleteImage(id, token) {
  if (!USE_BACKEND) return { ok: true };
  return api(`/images/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function updateImageAlt(id, { altEn, altFr }, token) {
  if (!USE_BACKEND) return { ok: true };
  const body = {};
  if (altEn !== undefined) body.alt_en = altEn;
  if (altFr !== undefined) body.alt_fr = altFr;
  return api(`/images/${encodeURIComponent(id)}`, { method: 'PATCH', body, token });
}
