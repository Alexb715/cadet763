import { useState } from 'react';
import { PhotoPlaceholder } from './PhotoPlaceholder.jsx';
import { ImagePicker } from './ImagePicker.jsx';

// EditableImage renders an <img> if a URL is set in content.images[slot],
// otherwise a PhotoPlaceholder. When `editing && user`, clicking opens the
// picker. The chosen image's URL is written back via onPick(slot, url).
export function EditableImage({
  slot,
  url,
  alt = '',
  label,
  editing,
  onPick,
  lang,
  style,
  className,
}) {
  const [open, setOpen] = useState(false);
  const showPicker = () => editing && setOpen(true);
  const handlePicked = (img) => {
    setOpen(false);
    if (img && onPick) onPick(slot, img.thumbUrl || img.url);
  };

  const aspectRatio = style?.aspectRatio ?? '1 / 1';
  const borderRadius = style?.borderRadius ?? 14;

  return (
    <>
      <div
        onClick={showPicker}
        style={{
          position: 'relative',
          cursor: editing ? 'pointer' : 'default',
          overflow: 'hidden',
          aspectRatio,
          borderRadius,
          ...style,
        }}
        className={className}
        role={editing ? 'button' : undefined}
        aria-label={editing ? 'Change image' : undefined}
      >
        {url ? (
          <img
            src={url}
            alt={alt}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <PhotoPlaceholder label={label} style={{ width: '100%', height: '100%', borderRadius }} />
        )}
        {editing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius,
              background: url ? 'rgba(0,0,0,0)' : 'transparent',
              transition: 'background 120ms',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                background: 'rgba(0,0,0,.65)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '.02em',
                opacity: 0.85,
              }}
            >
              {url ? '✎ ' : '＋ '}
              {url ? 'Replace' : 'Add image'}
            </span>
          </div>
        )}
      </div>
      {open && (
        <ImagePicker
          lang={lang}
          onClose={() => setOpen(false)}
          onPick={handlePicked}
        />
      )}
    </>
  );
}
