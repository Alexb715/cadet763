import { SceneArt, InitialsAvatar } from './SceneArt.jsx';

// A branded stand-in shown wherever a real photo hasn't been uploaded yet.
// `kind="portrait"` renders a roster monogram avatar (for staff); otherwise a
// deterministic aviation motif. A small caption tag keeps the slot legible to
// editors.
export function PhotoPlaceholder({ label, seed, kind, name, style, className }) {
  const cls = ['ph', kind === 'portrait' ? 'ph-portrait' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      {kind === 'portrait' ? (
        <InitialsAvatar name={name} label={label} className="ph-art" />
      ) : (
        <SceneArt label={label} seed={seed} className="ph-art" />
      )}
      {label && kind !== 'portrait' ? <span className="ph-label">{label}</span> : null}
    </div>
  );
}
