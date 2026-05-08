import { useState } from 'react';
import { pickT } from '../i18n.js';
import { changePassword } from '../api/auth.js';

const MIN_LEN = 12;

// Cheap strength heuristic: length + character class diversity. Returns
// {score: 0..4, label}. NIST/OWASP 2024 guidance prioritises length over
// complexity, so length is the dominant signal here.
function rate(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (pw.length >= 16) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (classes >= 2) score += 1;
  if (classes >= 3) score += 1;
  return { score };
}

export function PasswordModal({ onClose, onChanged, lang = 'en' }) {
  const t = pickT(lang);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const strength = rate(next);
  const strengthLabel = [
    t({ en: 'Too short', fr: 'Trop court' }),
    t({ en: 'Weak', fr: 'Faible' }),
    t({ en: 'OK', fr: 'Correct' }),
    t({ en: 'Strong', fr: 'Fort' }),
    t({ en: 'Very strong', fr: 'Très fort' }),
  ][strength.score];
  const strengthColor = ['#c0392b', '#c0392b', '#d97706', '#16a34a', '#0d8a3e'][strength.score];

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (next.length < MIN_LEN) {
      setErr(t({ en: `New password must be at least ${MIN_LEN} characters.`, fr: `Le nouveau mot de passe doit comporter au moins ${MIN_LEN} caractères.` }));
      return;
    }
    if (next !== confirm) {
      setErr(t({ en: 'Confirmation does not match.', fr: 'La confirmation ne correspond pas.' }));
      return;
    }
    if (next === current) {
      setErr(t({ en: 'New password must differ from the current one.', fr: 'Le nouveau mot de passe doit différer de l’actuel.' }));
      return;
    }
    setBusy(true);
    const token = localStorage.getItem('763_token');
    const r = await changePassword(current, next, token);
    setBusy(false);
    if (!r?.ok) {
      if (r?.error === 'wrong_password') {
        setErr(t({ en: 'Current password is incorrect.', fr: 'Mot de passe actuel incorrect.' }));
      } else if (r?.error === 'weak_password') {
        setErr(t({ en: 'New password is too weak.', fr: 'Nouveau mot de passe trop faible.' }));
      } else {
        setErr(t({ en: 'Could not change password. Try again.', fr: 'Impossible de changer le mot de passe. Réessayez.' }));
      }
      return;
    }
    setOk(true);
    onChanged?.();
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{t({ en: 'Change password', fr: 'Changer le mot de passe' })}</h3>
        <p>{t({
          en: `Use at least ${MIN_LEN} characters. A passphrase of 4–5 random words is easier to remember and harder to guess than a short scrambled password.`,
          fr: `Utilisez au moins ${MIN_LEN} caractères. Une phrase de 4 à 5 mots aléatoires est plus facile à retenir et plus difficile à deviner qu’un mot de passe court mélangé.`,
        })}</p>
        <form onSubmit={submit} autoComplete="off">
          <div className="field">
            <label>{t({ en: 'Current password', fr: 'Mot de passe actuel' })}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus autoComplete="current-password" />
          </div>
          <div className="field">
            <label>{t({ en: 'New password', fr: 'Nouveau mot de passe' })}</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            {next && (
              <div style={{ marginTop: 6, fontSize: 12, color: strengthColor, fontWeight: 600 }}>
                {strengthLabel}
              </div>
            )}
          </div>
          <div className="field">
            <label>{t({ en: 'Confirm new password', fr: 'Confirmer le nouveau' })}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {ok && <div style={{ color: '#0d8a3e', fontSize: 13, marginBottom: 12 }}>{t({ en: 'Password changed.', fr: 'Mot de passe changé.' })}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy
              ? t({ en: 'Saving…', fr: 'Enregistrement…' })
              : t({ en: 'Change password', fr: 'Changer le mot de passe' })}
          </button>
        </form>
      </div>
    </div>
  );
}
