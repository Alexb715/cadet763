import { pickT } from '../i18n.js';

export function Footer({ lang, setPage }) {
  const t = pickT(lang);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="t1">763 Bouctouche</div>
            <p>{t({
              en: 'Royal Canadian Air Cadet Squadron serving Kent County since 1971. A registered partner of the Air Cadet League of Canada.',
              fr: 'Escadron des Cadets de l’Aviation royale du Canada au service du comté de Kent depuis 1971. Partenaire officiel de la Ligue des Cadets de l’Air.',
            })}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="pill pill-on-dark">Facebook</a>
              <a href="https://cadets.ca/" target="_blank" rel="noopener noreferrer" className="pill pill-on-dark">cadets.ca</a>
            </div>
          </div>
          <div>
            <h4>{t({ en: 'Explore', fr: 'Explorer' })}</h4>
            <ul>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); setPage('about'); }}>{t({ en: 'About', fr: 'À propos' })}</a></li>
              <li><a href="#training" onClick={(e) => { e.preventDefault(); setPage('training'); }}>{t({ en: 'Training', fr: 'Programme' })}</a></li>
              <li><a href="#news" onClick={(e) => { e.preventDefault(); setPage('news'); }}>{t({ en: 'News', fr: 'Nouvelles' })}</a></li>
              <li><a href="#staff" onClick={(e) => { e.preventDefault(); setPage('staff'); }}>{t({ en: 'Staff', fr: 'Officiers' })}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t({ en: 'Visit', fr: 'Visiter' })}</h4>
            <ul>
              <li>1545 Route 525, Unit 2</li>
              <li>Ste-Marie-de-Kent, NB</li>
              <li>{t({ en: 'Tuesdays 18:30', fr: 'Mardis 18 h 30' })}</li>
              <li>{t({ en: 'Sept – June', fr: 'Sept. – juin' })}</li>
            </ul>
          </div>
          <div>
            <h4>{t({ en: 'Contact', fr: 'Contact' })}</h4>
            <ul>
              <li><a href="mailto:763air@cadets.gc.ca">763air@cadets.gc.ca</a></li>
              <li><a href="tel:+15065551971">(506) 555-1971</a></li>
              <li>{t({ en: 'Squadron office', fr: 'Bureau de l’escadron' })}</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 · 763 Bouctouche RCACS</span>
          <span>{t({ en: 'A registered Canadian non-profit', fr: 'Organisme canadien sans but lucratif' })}</span>
        </div>
      </div>
    </footer>
  );
}
