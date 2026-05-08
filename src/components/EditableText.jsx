export function EditableText({ value, onChange, editing, tag = 'span', className, multiline = false, style }) {
  const Tag = tag;
  if (!editing) return <Tag className={className} style={style}>{value}</Tag>;
  return (
    <Tag
      className={(className || '') + ' editable'}
      contentEditable
      suppressContentEditableWarning
      style={style}
      onBlur={(e) => {
        const next = e.currentTarget.innerText;
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
      }}
    >{value}</Tag>
  );
}
