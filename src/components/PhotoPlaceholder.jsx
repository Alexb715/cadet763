export function PhotoPlaceholder({ label, dark = false, style, className }) {
  const cls = ['ph', dark ? 'ph-on-dark' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      <div className="ph-label">{label || 'cadet photo here'}</div>
    </div>
  );
}
