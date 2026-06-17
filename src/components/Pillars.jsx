import { pickT } from '../i18n.js';
import { EditableText } from './EditableText.jsx';

const PILLAR_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 16l8-3 8 3M12 3v18M5 21h14"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 14 12 8 18 14"/><polyline points="6 19 12 13 18 19"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16 8 14 14 8 16 10 10"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>,
];

export function PillarsSection({ lang, content, editing, set }) {
  const t = pickT(lang);
  const items = [
    { en: 'Aviation',              fr: 'Aviation' },
    { en: 'Leadership',            fr: 'Leadership' },
    { en: 'Fitness & adventure',   fr: 'Forme et aventure' },
    { en: 'Citizenship',           fr: 'Civisme' },
  ];
  const bodies = [
    { en: 'Ground school, gliding, and the path to a Transport Canada pilot scholarship.',
      fr: 'École au sol, planeur et accès à la bourse de pilote de Transport Canada.' },
    { en: 'Drill, instructional technique, and progressive command opportunities.',
      fr: 'Exercice, technique d’instruction et postes de commandement progressifs.' },
    { en: 'Survival exercises, biathlon, hiking, and the annual field training weekend.',
      fr: 'Exercices de survie, biathlon, randonnée et fin de semaine d’instruction sur le terrain.' },
    { en: 'Remembrance Day, community service, and ceremonial parades.',
      fr: 'Jour du Souvenir, service communautaire et défilés cérémoniels.' },
  ];
  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">{t({ en: 'The four aims', fr: 'Les quatre objectifs' })}</span>
          <EditableText
            tag="h2" editing={editing}
            value={t(content.pillarsTitle)}
            onChange={(v) => set('pillarsTitle', { ...content.pillarsTitle, [lang]: v })}
          />
          <EditableText
            tag="p" multiline className="lead" editing={editing}
            value={t(content.pillarsLead)}
            onChange={(v) => set('pillarsLead', { ...content.pillarsLead, [lang]: v })}
          />
        </div>
        <div className="pillars">
          {items.map((item, i) => (
            <div className="pillar" key={i}>
              <div className="num">0{i + 1}</div>
              <div className="pillar-icon">{PILLAR_ICONS[i]}</div>
              <h3>{t(item)}</h3>
              <p>{t(bodies[i])}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
