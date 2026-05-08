import { useEffect, useState } from 'react';
import { PAGES } from '../config.js';
import { detectLang } from '../i18n.js';

export function useLang(initial) {
  const [lang, setLangState] = useState(() => {
    if (initial === 'en' || initial === 'fr') return initial;
    return detectLang();
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('763_lang', l); } catch {}
  };
  return [lang, setLang];
}

export function usePage() {
  const [page, setPageState] = useState(() => {
    const h = (window.location.hash || '').replace('#', '');
    return PAGES.includes(h) ? h : 'home';
  });

  const setPage = (p) => {
    setPageState(p);
    window.location.hash = p;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHash = () => {
      const h = (window.location.hash || '').replace('#', '');
      if (PAGES.includes(h)) setPageState(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return [page, setPage];
}
