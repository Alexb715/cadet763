import { useEffect, useState } from 'react';
import { pickT } from '../i18n.js';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users.js';

const MIN_LEN = 12;

function genPassword() {
  // Browser-safe random passphrase. 24 base64url chars ≈ 144 bits of entropy.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=/g, '')
    .slice(0, 18);
}

function CreateForm({ lang, onCreated, onError, busy, setBusy }) {
  const t = pickT(lang);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [password, setPassword] = useState(genPassword());

  const submit = async (e) => {
    e.preventDefault();
    onError('');
    if (!username.trim() || !name.trim()) {
      onError(t({ en: 'Username and display name are required.', fr: 'Identifiant et nom d’affichage requis.' }));
      return;
    }
    if (password.length < MIN_LEN) {
      onError(t({ en: `Password must be at least ${MIN_LEN} characters.`, fr: `Le mot de passe doit comporter au moins ${MIN_LEN} caractères.` }));
      return;
    }
    setBusy(true);
    const token = localStorage.getItem('763_token');
    const r = await createUser({ username: username.trim(), password, role, name: name.trim() }, token).catch((e) => ({ ok: false, error: String(e?.message || e) }));
    setBusy(false);
    if (!r?.ok) {
      if (String(r?.error || '').includes('username_taken')) {
        onError(t({ en: 'A user with that username already exists.', fr: 'Un utilisateur avec cet identifiant existe déjà.' }));
      } else {
        onError(t({ en: 'Could not create user.', fr: 'Impossible de créer l’utilisateur.' }));
      }
      return;
    }
    // Show generated password to admin so they can pass it on.
    onCreated({ username: username.trim(), password });
    setUsername('');
    setName('');
    setRole('editor');
    setPassword(genPassword());
  };

  return (
    <form onSubmit={submit} style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
      <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
        {t({ en: 'Add a user', fr: 'Ajouter un utilisateur' })}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>{t({ en: 'Username', fr: 'Identifiant' })}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>{t({ en: 'Display name', fr: 'Nom d’affichage' })}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lt. J. Doe" autoComplete="off" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>{t({ en: 'Role', fr: 'Rôle' })}</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit', background: 'var(--bg)' }}>
            <option value="editor">{t({ en: 'Editor', fr: 'Éditeur' })}</option>
            <option value="admin">{t({ en: 'Admin', fr: 'Administrateur' })}</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>{t({ en: 'Initial password', fr: 'Mot de passe initial' })}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={password} onChange={(e) => setPassword(e.target.value)} style={{ flex: 1 }} />
            <button type="button" onClick={() => setPassword(genPassword())}
                    style={{ padding: '0 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', fontSize: 12, cursor: 'pointer' }}
                    title={t({ en: 'Regenerate', fr: 'Régénérer' })}>↻</button>
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
        {busy ? t({ en: 'Creating…', fr: 'Création…' }) : t({ en: 'Create user', fr: 'Créer l’utilisateur' })}
      </button>
    </form>
  );
}

function UserRow({ u, lang, currentUser, onChange, onError, busy, setBusy }) {
  const t = pickT(lang);
  const isSelf = currentUser?.user === u.username;

  const resetPw = async () => {
    const fresh = prompt(t({
      en: 'New password (12+ chars). Cancel to auto-generate one.',
      fr: 'Nouveau mot de passe (12+ caractères). Annuler pour en générer un.',
    }));
    let pw;
    if (fresh === null) {
      pw = genPassword();
    } else if (fresh.length < MIN_LEN) {
      onError(t({ en: `Password must be at least ${MIN_LEN} characters.`, fr: `Au moins ${MIN_LEN} caractères requis.` }));
      return;
    } else {
      pw = fresh;
    }
    setBusy(true);
    const token = localStorage.getItem('763_token');
    const r = await updateUser(u.id, { password: pw }, token).catch((e) => ({ ok: false }));
    setBusy(false);
    if (!r?.ok) {
      onError(t({ en: 'Reset failed.', fr: 'Réinitialisation échouée.' }));
      return;
    }
    alert(t({
      en: `Password reset for ${u.username}. New password: ${pw}\nAll their existing sessions have been invalidated.`,
      fr: `Mot de passe réinitialisé pour ${u.username}. Nouveau : ${pw}\nLeurs sessions ont été invalidées.`,
    }));
    onChange();
  };

  const toggleDisabled = async () => {
    setBusy(true);
    const token = localStorage.getItem('763_token');
    const r = await updateUser(u.id, { disabled: !u.disabled }, token).catch((e) => ({ ok: false }));
    setBusy(false);
    if (!r?.ok) {
      onError(t({ en: 'Update failed.', fr: 'Mise à jour échouée.' }));
      return;
    }
    onChange();
  };

  const remove = async () => {
    if (!confirm(t({
      en: `Permanently delete ${u.username}? This cannot be undone.`,
      fr: `Supprimer ${u.username} définitivement ? Action irréversible.`,
    }))) return;
    setBusy(true);
    const token = localStorage.getItem('763_token');
    const r = await deleteUser(u.id, token).catch((e) => ({ ok: false }));
    setBusy(false);
    if (!r?.ok) {
      onError(t({ en: 'Delete failed.', fr: 'Suppression échouée.' }));
      return;
    }
    onChange();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 13 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{u.name}</div>
        <div style={{ color: 'var(--ink-soft)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{u.username}</div>
      </div>
      <div>
        <span className="role-tag" style={{ background: u.role === 'admin' ? 'var(--accent)' : 'var(--line)', color: u.role === 'admin' ? 'var(--navy)' : 'var(--ink)', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{u.role}</span>
        {u.disabled && <span style={{ marginLeft: 6, fontSize: 11, color: '#c0392b' }}>{t({ en: 'disabled', fr: 'désactivé' })}</span>}
      </div>
      <button type="button" onClick={resetPw} disabled={busy} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)', cursor: 'pointer' }}>
        {t({ en: 'Reset password', fr: 'Réinit. mot de passe' })}
      </button>
      <button type="button" onClick={toggleDisabled} disabled={busy || isSelf} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)', cursor: isSelf ? 'not-allowed' : 'pointer' }}
              title={isSelf ? t({ en: 'You cannot disable yourself', fr: 'Impossible de se désactiver soi-même' }) : ''}>
        {u.disabled ? t({ en: 'Enable', fr: 'Activer' }) : t({ en: 'Disable', fr: 'Désactiver' })}
      </button>
      <button type="button" onClick={remove} disabled={busy || isSelf} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #c0392b', color: '#c0392b', borderRadius: 6, background: 'transparent', cursor: isSelf ? 'not-allowed' : 'pointer' }}
              title={isSelf ? t({ en: 'You cannot delete yourself', fr: 'Impossible de se supprimer soi-même' }) : ''}>
        {t({ en: 'Delete', fr: 'Supprimer' })}
      </button>
    </div>
  );
}

export function UsersModal({ onClose, lang = 'en', currentUser }) {
  const t = pickT(lang);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('763_token');
      const res = await listUsers(token);
      setItems(res?.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{t({ en: 'Users', fr: 'Utilisateurs' })}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {t({
            en: 'Create new editors and admins, reset passwords, disable accounts. Newly generated passwords appear once — copy them somewhere safe before closing the dialog.',
            fr: 'Créez éditeurs et administrateurs, réinitialisez mots de passe, désactivez comptes. Les mots de passe générés apparaissent une seule fois — copiez-les avant de fermer.',
          })}
        </p>

        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {created && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {t({ en: 'Created', fr: 'Créé' })}: <b>{created.username}</b><br/>
            {t({ en: 'Initial password', fr: 'Mot de passe initial' })}: <code style={{ fontFamily: 'JetBrains Mono, monospace', userSelect: 'all' }}>{created.password}</code><br/>
            <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
              {t({
                en: 'Share this with the user securely. They should change it on first login.',
                fr: 'Transmettez-le à l’utilisateur en sécurité. Il devrait le changer dès la première connexion.',
              })}
            </span>{' '}
            <button type="button" onClick={() => setCreated(null)} style={{ fontSize: 12, marginLeft: 8, padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>
              {t({ en: 'Dismiss', fr: 'Fermer' })}
            </button>
          </div>
        )}

        {loading && <div style={{ padding: 16, color: 'var(--ink-mute)' }}>…</div>}
        {!loading && items.length === 0 && (
          <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 13 }}>
            {t({ en: 'No users yet.', fr: 'Aucun utilisateur.' })}
          </div>
        )}
        {items.map((u) => (
          <UserRow key={u.id} u={u} lang={lang} currentUser={currentUser}
                   onChange={reload} onError={setErr} busy={busy} setBusy={setBusy} />
        ))}

        <CreateForm lang={lang}
                    onCreated={(c) => { setCreated(c); reload(); }}
                    onError={setErr}
                    busy={busy}
                    setBusy={setBusy} />
      </div>
    </div>
  );
}
