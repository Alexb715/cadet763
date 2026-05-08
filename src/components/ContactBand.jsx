import { pickT } from '../i18n.js';
import { EditableText } from './EditableText.jsx';

// Only the headline and lead paragraph are editable. The address, hours,
// phone, and email are intentionally static — they back tel:/mailto: links
// and have formatting (line breaks, dashes, "h" for French hours) that's
// easy for a non-technical editor to break. To change those, edit this file.
export function ContactBand({ lang, content, editing, set }) {
  const t = pickT(lang);
  const editable = !!(editing && content && set);
  return (
    <section className="contact-band" id="contact">
      <div className="container">
        <div className="contact-grid">
          <div>
            <span className="pill pill-on-dark" style={{ marginBottom: 16 }}>
              {t({ en: 'Visit · Call · Email', fr: 'Visiter · Appeler · Écrire' })}
            </span>
            {editable && content.contactTitle ? (
              <EditableText
                tag="h2"
                editing={editing}
                value={t(content.contactTitle)}
                onChange={(v) => set('contactTitle', { ...content.contactTitle, [lang]: v })}
              />
            ) : (
              <h2>
                {t(content?.contactTitle || { en: 'Drop in any Wednesday night.', fr: 'Passez nous voir un mercredi soir.' })}
              </h2>
            )}
            {editable && content.contactBody ? (
              <EditableText
                tag="p" multiline className="lead"
                editing={editing}
                value={t(content.contactBody)}
                onChange={(v) => set('contactBody', { ...content.contactBody, [lang]: v })}
              />
            ) : (
              <p className="lead">
                {t(content?.contactBody || {
                  en: 'No appointment needed. Bring your son or daughter to a parade night — we’ll show you around, introduce the staff, and answer any questions.',
                  fr: 'Aucun rendez-vous requis. Amenez votre jeune un mercredi soir — visite guidée, présentation du personnel, et réponses à vos questions.',
                })}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <a className="btn btn-accent" href="mailto:763air@cadets.gc.ca">
                {t({ en: 'Email the squadron', fr: 'Écrire à l’escadron' })}
              </a>
              <a className="btn btn-ghost-light" href="tel:+15065551971">(506) 555-1971</a>
            </div>
          </div>
          <div className="contact-info">
            <div className="contact-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div>
                <div className="lbl">{t({ en: 'Address', fr: 'Adresse' })}</div>
                <div className="val">1545 Route 525, Unit 2<br/>Ste-Marie-de-Kent, NB</div>
              </div>
            </div>
            <div className="contact-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <div className="lbl">{t({ en: 'Parade night', fr: 'Soirée d’entraînement' })}</div>
                <div className="val">
                  {t({ en: 'Wednesdays · 18:30 – 21:00', fr: 'Mercredis · 18 h 30 – 21 h' })}<br/>
                  <span style={{ opacity: 0.6, fontSize: 13 }}>{t({ en: 'September through June', fr: 'De septembre à juin' })}</span>
                </div>
              </div>
            </div>
            <div className="contact-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92V21a1 1 0 0 1-1.11 1A19.79 19.79 0 0 1 2 4.18 1 1 0 0 1 3 3h4.09a1 1 0 0 1 1 .75l1.13 4.52a1 1 0 0 1-.29 1L7.21 11a16 16 0 0 0 6 6l1.74-1.74a1 1 0 0 1 1-.29l4.52 1.13a1 1 0 0 1 .75 1z"/></svg>
              <div>
                <div className="lbl">{t({ en: 'Phone', fr: 'Téléphone' })}</div>
                <div className="val"><a href="tel:+15065551971">(506) 555-1971</a></div>
              </div>
            </div>
            <div className="contact-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <div>
                <div className="lbl">Email</div>
                <div className="val"><a href="mailto:763air@cadets.gc.ca">763air@cadets.gc.ca</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
