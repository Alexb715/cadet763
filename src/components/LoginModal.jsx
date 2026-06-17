import { useEffect, useState } from 'react';
import { pickT } from '../i18n.js';
import { USE_BACKEND } from '../api/client.js';

export function LoginModal({ onClose, onLogin, lang = 'en' }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const t = pickT(lang);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const r = await onLogin(u, p);
    if (!r.ok) setErr(t({ en: 'Invalid username or password', fr: 'Identifiant ou mot de passe invalide' }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button className="modal-close" onClick={onClose} aria-label={t({ en: 'Close', fr: 'Fermer' })}>✕</button>
        <h3 id="login-title">{t({ en: 'Staff sign-in', fr: 'Connexion du personnel' })}</h3>
        <p>{t({
          en: 'Restricted to squadron officers and editors. Used to keep the website current.',
          fr: 'Réservé aux officiers et éditeurs de l’escadron. Sert à garder le site à jour.',
        })}</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t({ en: 'Username', fr: 'Identifiant' })}</label>
            <input value={u} onChange={(e) => setU(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t({ en: 'Password', fr: 'Mot de passe' })}</label>
            <input type="password" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {t({ en: 'Sign in', fr: 'Se connecter' })}
          </button>
        </form>
        {!USE_BACKEND && (
          <div className="modal-hint">
            {t({ en: 'Demo accounts', fr: 'Comptes de démonstration' })}<br/>
            admin / cadet763 · editor / cadet763
          </div>
        )}
      </div>
    </div>
  );
}
