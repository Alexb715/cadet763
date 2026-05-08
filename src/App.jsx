import { useEffect, useState } from 'react';
import { SITE_PALETTE, SITE_DENSITY, SITE_HERO, SITE_BLOG } from './config.js';

import { useAuth } from './hooks/useAuth.js';
import { useContent } from './hooks/useContent.js';
import { useLang, usePage } from './hooks/useNavState.js';

import { Nav } from './components/Nav.jsx';
import { Footer } from './components/Footer.jsx';
import { ContactBand } from './components/ContactBand.jsx';
import { LoginModal } from './components/LoginModal.jsx';
import { EditBanner } from './components/EditBanner.jsx';
import { HistoryModal } from './components/HistoryModal.jsx';
import { PasswordModal } from './components/PasswordModal.jsx';
import { UsersModal } from './components/UsersModal.jsx';
import { Hero } from './components/Hero.jsx';
import { PillarsSection } from './components/Pillars.jsx';
import { HomeNewsTeaser } from './components/HomeNewsTeaser.jsx';

import { AboutPage } from './components/pages/AboutPage.jsx';
import { TrainingPage } from './components/pages/TrainingPage.jsx';
import { NewsPage } from './components/pages/NewsPage.jsx';
import { StaffPage } from './components/pages/StaffPage.jsx';
import { JoinPage } from './components/pages/JoinPage.jsx';

export default function App() {
  const [lang, setLang] = useLang(null);
  const [page, setPage] = usePage();
  const { content, set, reset } = useContent();
  const { user, login, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', SITE_PALETTE);
    document.documentElement.setAttribute('data-density', SITE_DENSITY);
    document.body.classList.toggle('edit-mode', editing && !!user);
    document.documentElement.lang = lang;
  }, [editing, user, lang]);

  const setImage = (slot, url) => set('images', { ...(content.images || {}), [slot]: url });
  const pageProps = { lang, content, editing: editing && !!user, set, setImage };

  return (
    <>
      <Nav
        page={page} setPage={setPage}
        lang={lang} setLang={setLang}
        user={user}
        onSignIn={() => setShowLogin(true)}
        onSignOut={() => { logout(); setEditing(false); }}
        editing={editing}
        onToggleEdit={() => setEditing(!editing)}
      />

      {page === 'home' && (
        <>
          <Hero which={SITE_HERO} {...pageProps} />
          <PillarsSection {...pageProps} />
          <HomeNewsTeaser lang={lang} layout={SITE_BLOG} setPage={setPage} />
          <ContactBand {...pageProps} />
        </>
      )}
      {page === 'about'    && <AboutPage    {...pageProps} />}
      {page === 'training' && <TrainingPage {...pageProps} />}
      {page === 'news'     && <NewsPage     lang={lang} layout={SITE_BLOG} />}
      {page === 'staff'    && <StaffPage    {...pageProps} />}
      {page === 'join'     && <JoinPage     {...pageProps} />}
      {page !== 'home' && <ContactBand {...pageProps} />}

      <Footer lang={lang} setPage={setPage} />

      {showLogin && (
        <LoginModal
          lang={lang}
          onClose={() => setShowLogin(false)}
          onLogin={async (u, p) => {
            const r = await login(u, p);
            if (r.ok) { setShowLogin(false); setEditing(true); }
            return r;
          }}
        />
      )}

      {editing && user && (
        <EditBanner
          user={user}
          lang={lang}
          onDone={() => setEditing(false)}
          onShowHistory={user.role === 'admin' ? () => setShowHistory(true) : undefined}
          onShowUsers={user.role === 'admin' ? () => setShowUsers(true) : undefined}
          onShowPassword={() => setShowPassword(true)}
          onReset={reset}
        />
      )}

      {showHistory && user?.role === 'admin' && (
        <HistoryModal
          lang={lang}
          onClose={() => setShowHistory(false)}
          onRestored={() => {
            // Reload the live content from the server so the page reflects the restore.
            window.location.reload();
          }}
        />
      )}

      {showPassword && user && (
        <PasswordModal
          lang={lang}
          onClose={() => setShowPassword(false)}
        />
      )}

      {showUsers && user?.role === 'admin' && (
        <UsersModal
          lang={lang}
          currentUser={user}
          onClose={() => setShowUsers(false)}
        />
      )}
    </>
  );
}
