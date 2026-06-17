import { pickT } from '../../i18n.js';
import { ACTIVITIES } from '../../data.js';
import { EditableImage } from '../EditableImage.jsx';

export function TrainingPage({ lang, content, editing, setImage }) {
  const t = pickT(lang);
  const images = content?.images || {};
  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">{t({ en: 'Training program', fr: 'Programme d’instruction' })}</span>
          <h1>{t({ en: 'Five years. Real skills.', fr: 'Cinq années. Compétences concrètes.' })}</h1>
          <p className="lead">{t({
            en: 'Cadets progress through five proficiency levels. Each level mixes mandatory training with optional activities: drill, aviation, sports, music, and more.',
            fr: 'Les cadets progressent en cinq niveaux. Chaque niveau combine instruction obligatoire et activités optionnelles : exercice, aviation, sports, musique, etc.',
          })}</p>
        </div>
        <div className="activities-grid reveal">
          {ACTIVITIES.map((a, i) => (
            <article className="activity" key={i}>
              <EditableImage
                slot={`training.${i}`}
                url={images[`training.${i}`]}
                label={t(a.title)}
                editing={editing}
                onPick={setImage}
                lang={lang}
              />
              <div className="activity-body">
                <div className="tag">{t(a.tag)}</div>
                <h3>{t(a.title)}</h3>
                <p>{t(a.body)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
