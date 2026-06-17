import { api, USE_BACKEND } from './client.js';

// Demo accounts used when no backend is wired up. Swap for real credentials
// once your backend is online - the contract is documented in BACKEND.md.
const DEMO_ACCOUNTS = [
  { user: 'admin',  pass: 'cadet763', role: 'admin',  name: 'Capt. Cormier' },
  { user: 'editor', pass: 'cadet763', role: 'editor', name: 'Lt. LeBlanc' },
];

export async function loginRequest(username, password) {
  if (USE_BACKEND) {
    try {
      return await api('/auth/login', { method: 'POST', body: { username, password } });
    } catch (e) {
      // Backend returns 401 with {ok:false,error:"invalid"} on bad creds; surface uniformly.
      return { ok: false, error: 'invalid' };
    }
  }
  const found = DEMO_ACCOUNTS.find((a) => a.user === username && a.pass === password);
  if (!found) return { ok: false, error: 'invalid' };
  return { ok: true, user: { user: found.user, role: found.role, name: found.name } };
}

export async function logoutRequest(token) {
  if (USE_BACKEND) {
    return api('/auth/logout', { method: 'POST', token });
  }
  return { ok: true };
}

// verifyToken validates a stored token against the backend. Returns the user
// object on success, or null if the token is missing/expired/invalid. Used by
// useAuth on mount so we don't trust localStorage indefinitely.
export async function verifyToken(token) {
  if (!USE_BACKEND) return null;
  if (!token) return null;
  try {
    const res = await api('/auth/me', { token });
    return res?.user || null;
  } catch {
    return null;
  }
}

// changePassword lets the signed-in user rotate their own password. The
// backend revokes all OTHER sessions but keeps the calling one alive.
export async function changePassword(currentPassword, newPassword, token) {
  if (!USE_BACKEND) return { ok: false, error: 'no_backend' };
  try {
    return await api('/auth/password', {
      method: 'POST',
      token,
      body: { current_password: currentPassword, new_password: newPassword },
    });
  } catch (e) {
    const msg = (e && e.message) || '';
    if (msg.includes('401')) return { ok: false, error: 'wrong_password' };
    if (msg.includes('weak_password')) return { ok: false, error: 'weak_password' };
    return { ok: false, error: 'failed' };
  }
}
