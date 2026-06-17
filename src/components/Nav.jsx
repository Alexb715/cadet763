import { useState } from 'react';
import { pickT } from '../i18n.js';
import { Logo } from './Logo.jsx';
import { LangToggle } from './LangToggle.jsx';

const LINKS = [
  ['home',     { en: 'Home',     fr: 'Accueil' }],
  ['about',    { en: 'About',    fr: 'À propos' }],
  ['training', { en: 'Training', fr: 'Programme' }],
  ['news',     { en: 'News',     fr: 'Nouvelles' }],
  ['staff',    { en: 'Staff',    fr: 'Officiers' }],
  ['join',     { en: 'Join us',  fr: 'Adhésion' }],
];

export function Nav({ page, setPage, lang, setLang, user, onSignIn, onSignOut, editing, onToggleEdit }) {
  const t = pickT(lang);
  const [open, setOpen] = useState(false);
  return (
    <header className={'nav' + (open ? ' nav-mobile-open' : '')}>
      <div className="nav-inner">
        <div
          className="brand"
          onClick={() => { setPage('home'); setOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPage('home'); setOpen(false); } }}
          role="button"
          tabIndex={0}
          aria-label={t({ en: '763 Bouctouche, home', fr: '763 Bouctouche, accueil' })}
        >
          <Logo />
          <div className="brand-text">
            <div className="t1">763 Bouctouche</div>
            <div className="t2">{t({ en: 'Royal Canadian Air Cadets', fr: 'Cadets de l’Aviation' })}</div>
          </div>
        </div>
        <nav className="nav-links">
          {LINKS.map(([k, label]) => (
            <button
              key={k}
              className={'nav-link' + (page === k ? ' active' : '')}
              onClick={() => { setPage(k); setOpen(false); }}
            >
              {t(label)}
            </button>
          ))}
        </nav>
        <div className="nav-right">
          <LangToggle lang={lang} setLang={setLang} />
          {user ? (
            <>
              <button
                className={'btn btn-sm ' + (editing ? 'btn-accent' : 'btn-ghost')}
                onClick={onToggleEdit}
              >
                {editing
                  ? t({ en: 'Done', fr: 'Terminé' })
                  : t({ en: 'Edit', fr: 'Modifier' })}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={onSignOut}>
                {t({ en: 'Sign out', fr: 'Déconnexion' })}
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={onSignIn}>
              {t({ en: 'Sign in', fr: 'Connexion' })}
            </button>
          )}
          <button
            className="nav-burger"
            onClick={() => setOpen(!open)}
            aria-label={t({ en: 'Menu', fr: 'Menu' })}
            aria-expanded={open}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
