import { pickT } from '../../i18n.js';
import { STAFF } from '../../data.js';
import { EditableImage } from '../EditableImage.jsx';
import { EditableText } from '../EditableText.jsx';

// Returns the merged staff entry for index `i`: hardcoded defaults overlaid
// with any overrides from content.staff[i].
function mergeStaff(i, overrides) {
  const base = STAFF[i] || {};
  const ov = overrides && overrides[i] ? overrides[i] : {};
  return {
    name: ov.name ?? base.name ?? '',
    rank: ov.rank ?? base.rank ?? '',
    role: { ...(base.role || {}), ...(ov.role || {}) },
  };
}

export function StaffPage({ lang, content, editing, set, setImage }) {
  const t = pickT(lang);
  const images = content?.images || {};
  const overrides = Array.isArray(content?.staff) ? content.staff : [];

  // Patch a single staff entry. Persists the whole array in content.staff.
  const patchStaff = (i, patch) => {
    const next = overrides.slice();
    next[i] = { ...mergeStaff(i, overrides), ...patch };
    set('staff', next);
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t({ en: 'Squadron leadership', fr: 'Direction de l’escadron' })}</span>
          <h2>{t({ en: 'Meet the team.', fr: 'Notre équipe.' })}</h2>
          <p className="lead">{t({
            en: 'CIC officers, civilian instructors, and dedicated volunteers from the community. All adult staff are vetted and trained by the Department of National Defence.',
            fr: 'Officiers du CIC, instructeurs civils et bénévoles dévoués de la communauté. Tout le personnel adulte est vérifié et formé par le ministère de la Défense nationale.',
          })}</p>
        </div>
        <div className="staff-grid">
          {STAFF.map((_, i) => {
            const s = mergeStaff(i, overrides);
            return (
              <div className="staff-card" key={i}>
                <EditableImage
                  slot={`staff.${i}`}
                  url={images[`staff.${i}`]}
                  className="staff-photo"
                  label={s.rank}
                  style={{ aspectRatio: 1, borderRadius: 14 }}
                  editing={editing}
                  onPick={setImage}
                  lang={lang}
                />
                <EditableText
                  tag="div"
                  className="staff-name"
                  editing={editing}
                  value={s.name}
                  onChange={(v) => patchStaff(i, { name: v })}
                />
                <EditableText
                  tag="div"
                  className="staff-role"
                  editing={editing}
                  value={t(s.role)}
                  onChange={(v) => patchStaff(i, { role: { ...s.role, [lang]: v } })}
                />
                <span className="staff-rank">{s.rank}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
