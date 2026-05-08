import { useState, useCallback, useEffect } from 'react';
import { loginRequest, logoutRequest, verifyToken } from '../api/auth.js';
import { USE_BACKEND } from '../api/client.js';

export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('763_user') || 'null'); } catch { return null; }
  });

  // On mount, if we're talking to a real backend and have a cached token,
  // confirm it's still valid. A revoked or expired token clears local state.
  useEffect(() => {
    if (!USE_BACKEND) return;
    const token = localStorage.getItem('763_token');
    if (!token) return;
    let cancelled = false;
    verifyToken(token).then((u) => {
      if (cancelled) return;
      if (!u) {
        localStorage.removeItem('763_user');
        localStorage.removeItem('763_token');
        setUser(null);
      } else {
        localStorage.setItem('763_user', JSON.stringify(u));
        setUser(u);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await loginRequest(username, password);
    if (!res.ok) return res;
    localStorage.setItem('763_user', JSON.stringify(res.user));
    if (res.token) localStorage.setItem('763_token', res.token);
    setUser(res.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('763_token');
    try { await logoutRequest(token); } catch {}
    localStorage.removeItem('763_user');
    localStorage.removeItem('763_token');
    setUser(null);
  }, []);

  return { user, login, logout };
}
