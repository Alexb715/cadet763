export function LangToggle({ lang, setLang }) {
  return (
    <div className="lang-toggle" role="group" aria-label={lang === 'fr' ? 'Langue' : 'Language'}>
      <span className="thumb" style={{ left: lang === 'en' ? '3px' : 'calc(50%)' }} />
      <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
      <button type="button" className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
    </div>
  );
}
