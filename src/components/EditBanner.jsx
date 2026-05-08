import { pickT } from '../i18n.js';

export function EditBanner({ user, lang, onDone, onShowHistory, onShowUsers, onShowPassword, onReset }) {
  const t = pickT(lang);
  if (!user) return null;
  const isAdmin = user.role === 'admin';
  return (
    <div className="edit-banner">
      <span className="pulse"></span>
      <span className="role-tag">{user.role}</span>
      <span>{t({ en: 'Editing as', fr: 'Édition en tant que' })} <b>{user.name}</b></span>
      {onShowPassword && (
        <button
          className="btn btn-sm btn-ghost-light"
          onClick={onShowPassword}
          title={t({ en: 'Change your password', fr: 'Changer votre mot de passe' })}
        >
          {t({ en: 'Password', fr: 'Mot de passe' })}
        </button>
      )}
      {isAdmin && onShowUsers && (
        <button
          className="btn btn-sm btn-ghost-light"
          onClick={onShowUsers}
          title={t({ en: 'Manage users', fr: 'Gérer les utilisateurs' })}
        >
          {t({ en: 'Users', fr: 'Utilisateurs' })}
        </button>
      )}
      {isAdmin && onShowHistory && (
        <button
          className="btn btn-sm btn-ghost-light"
          onClick={onShowHistory}
          title={t({ en: 'View revision history', fr: 'Voir l’historique des révisions' })}
        >
          {t({ en: 'History', fr: 'Historique' })}
        </button>
      )}
      {onReset && (
        <button
          className="btn btn-sm btn-ghost-light"
          onClick={() => {
            if (confirm(t({ en: 'Reset all editable text to defaults?', fr: 'Réinitialiser tous les textes?' }))) {
              onReset();
            }
          }}
          title={t({ en: 'Reset all editable text to defaults', fr: 'Réinitialiser tous les textes' })}
        >
          {t({ en: 'Reset', fr: 'Réinit.' })}
        </button>
      )}
      <button className="btn btn-sm btn-accent" onClick={onDone}>
        {t({ en: 'Done', fr: 'Terminé' })}
      </button>
    </div>
  );
}
