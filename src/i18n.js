export function pickT(lang) {
  return (obj) => {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] ?? obj.en ?? '';
  };
}

export function detectLang() {
  try {
    const stored = localStorage.getItem('763_lang');
    if (stored === 'en' || stored === 'fr') return stored;
  } catch {}
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}
