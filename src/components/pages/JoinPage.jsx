import { pickT } from '../../i18n.js';
import { EditableImage } from '../EditableImage.jsx';

const REQS = [
  { en: 'Age 12 to 18 (turn 19 still in cadets is fine)', fr: 'De 12 à 18 ans (19 ans en cours d’année accepté)' },
  { en: 'Live in or near Kent County, NB',                fr: 'Habiter dans le comté de Kent ou en périphérie' },
  { en: 'Canadian citizen or permanent resident',         fr: 'Citoyen canadien ou résident permanent' },
  { en: 'In good health (medical form to fill)',          fr: 'En bonne santé (formulaire médical à remplir)' },
  { en: 'Available Tuesday evenings, Sept – June',      fr: 'Disponible les mardis soir, sept. – juin' },
  { en: 'Curious, respectful, ready to try new things',   fr: 'Curieux, respectueux, prêt à essayer' },
];

const STEPS = [
  { n: '01', t: { en: 'Drop in',   fr: 'Visite' },
    d: { en: 'Come to a Tuesday parade night with your parent. We give you a tour, you watch a training period.',
         fr: 'Venez un mardi soir avec un parent. Visite guidée et observation d’une période d’instruction.' } },
  { n: '02', t: { en: 'Paperwork', fr: 'Inscription' },
    d: { en: 'A few forms: registration, medical, photo consent. We help you fill them out.',
         fr: 'Quelques formulaires : inscription, médical, autorisation photo. Nous vous accompagnons.' } },
  { n: '03', t: { en: 'Uniform',   fr: 'Uniforme' },
    d: { en: 'Issued at no cost within 2–3 weeks. Boots, beret, tunic, shirts, the works.',
         fr: 'Remis gratuitement en 2 à 3 semaines. Bottes, béret, tunique, chemises, etc.' } },
  { n: '04', t: { en: 'Welcome',   fr: 'Bienvenue' },
    d: { en: 'Sworn in at a parade and assigned to a flight. You’re a 763 cadet.',
         fr: 'Cérémonie d’assermentation et affectation à une section. Vous êtes cadet du 763.' } },
];

export function JoinPage({ lang, content, editing, setImage }) {
  const t = pickT(lang);
  const images = content?.images || {};
  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">{t({ en: 'Recruitment is open', fr: 'Inscriptions ouvertes' })}</span>
          <h1>{t({ en: 'Become a 763 cadet.', fr: 'Devenez cadet du 763.' })}</h1>
          <p className="lead">{t({
            en: 'Free to join. No experience required. Drop in any Tuesday at 18:30 and we will introduce you to the program.',
            fr: 'Adhésion gratuite. Aucune expérience requise. Passez un mardi à 18 h 30 et nous vous présenterons le programme.',
          })}</p>
        </div>
        <div className="split reveal" style={{ marginBottom: 64 }}>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 18 }}>
              {t({ en: 'What you need', fr: 'Ce qu’il vous faut' })}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REQS.map((r, i) => (
                <div className="value-chip" key={i}>{t(r)}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <a className="btn btn-primary btn-arrow" href="mailto:763air@cadets.gc.ca">
                {t({ en: 'Email to register', fr: 'Écrire pour s’inscrire' })}
              </a>
              <a className="btn btn-ghost" href="tel:+15065551971">
                (506) 555-1971
              </a>
            </div>
          </div>
          <EditableImage
            slot="join.main"
            url={images['join.main']}
            style={{ aspectRatio: '4/5', borderRadius: 18 }}
            label={t({ en: 'new cadets sworn in', fr: 'nouveaux cadets assermentés' })}
            editing={editing}
            onPick={setImage}
            lang={lang}
          />
        </div>
        <h3 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
          {t({ en: 'How it works', fr: 'Comment ça marche' })}
        </h3>
        <div className="steps-grid reveal">
          {STEPS.map((s, i) => (
            <div className="pillar" style={{ minHeight: 200 }} key={i}>
              <div className="num">{s.n}</div>
              <h3 style={{ marginTop: 8 }}>{t(s.t)}</h3>
              <p>{t(s.d)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
