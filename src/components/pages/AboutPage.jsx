import { pickT } from '../../i18n.js';
import { EditableText } from '../EditableText.jsx';
import { EditableImage } from '../EditableImage.jsx';

export function AboutPage({ lang, content, editing, set, setImage }) {
  const images = content?.images || {};
  const t = pickT(lang);
  return (
    <>
      <section className="section">
        <div className="container">
          <div className="split">
            <div className="split-text">
              <span className="eyebrow">{t(content.aboutEyebrow)}</span>
              <EditableText
                tag="h2" editing={editing} style={{ marginTop: 14 }}
                value={t(content.aboutTitle)}
                onChange={(v) => set('aboutTitle', { ...content.aboutTitle, [lang]: v })}
              />
              <EditableText
                tag="p" multiline editing={editing}
                value={t(content.aboutBody)}
                onChange={(v) => set('aboutBody', { ...content.aboutBody, [lang]: v })}
              />
              <EditableText
                tag="p" multiline editing={editing}
                value={t(content.aboutBody2)}
                onChange={(v) => set('aboutBody2', { ...content.aboutBody2, [lang]: v })}
              />
              <div className="values">
                {(content.values?.[lang] || content.values?.en || []).map((v, i) => (
                  <div className="value-chip" key={i}>{v}</div>
                ))}
              </div>
            </div>
            <EditableImage
              slot="about.main"
              url={images['about.main']}
              className="split-art"
              label={t({ en: 'squadron group photo', fr: 'photo de groupe' })}
              style={{ aspectRatio: '4/5', borderRadius: 18 }}
              editing={editing}
              onPick={setImage}
              lang={lang}
            />
          </div>
        </div>
      </section>
      <section
        className="section section-tight"
        style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="container">
          <div className="split">
            <div>
              <span className="eyebrow">{t(content.missionTitle)}</span>
              <h3 style={{ fontSize: 'clamp(28px,3.5vw,40px)', marginTop: 14 }}>
                {t({ en: 'Three aims, one program.', fr: 'Trois objectifs, un programme.' })}
              </h3>
            </div>
            <EditableText
              tag="p" multiline className="lead" editing={editing}
              value={t(content.missionBody)}
              onChange={(v) => set('missionBody', { ...content.missionBody, [lang]: v })}
            />
          </div>
        </div>
      </section>
    </>
  );
}
