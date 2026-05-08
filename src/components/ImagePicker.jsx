import { useEffect, useRef, useState } from 'react';
import { pickT } from '../i18n.js';
import { listImages, uploadImage } from '../api/images.js';

// Modal that lets editors browse the image library and upload a new one.
// Calls onPick({id, url, thumbUrl, ...}) when a tile is selected, or onClose
// to dismiss. Always rendered through edit-mode UX so the parent gates it on
// `editing && user`.
export function ImagePicker({ onPick, onClose, lang = 'en' }) {
  const t = pickT(lang);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const reload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('763_token');
      const list = await listImages(token);
      setItems(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const token = localStorage.getItem('763_token');
      const img = await uploadImage(file, {}, token);
      // Pick immediately on successful upload.
      onPick(img);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{t({ en: 'Pick or upload an image', fr: 'Choisir ou téléverser une image' })}</h3>
        <p style={{ fontSize: 13, color: 'var(--muted, #555)' }}>
          {t({
            en: 'Images are stripped of EXIF metadata when uploaded. JPEG, PNG, and WebP up to 8 MB. Unreferenced images are auto-removed 14 days after their last use.',
            fr: 'Les métadonnées EXIF sont retirées au téléversement. JPEG, PNG et WebP jusqu’à 8 Mo. Les images non utilisées sont supprimées automatiquement 14 jours après leur dernière utilisation.',
          })}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              handleUpload(f);
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy
              ? t({ en: 'Uploading…', fr: 'Téléversement…' })
              : t({ en: 'Upload new image', fr: 'Téléverser une image' })}
          </button>
        </div>

        {err && (
          <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{err}</div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            maxHeight: 420,
            overflowY: 'auto',
            padding: 4,
            border: '1px solid rgba(0,0,0,.1)',
            borderRadius: 8,
          }}
        >
          {loading && <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center' }}>…</div>}
          {!loading && items.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              {t({ en: 'No images yet — upload one above.', fr: 'Aucune image — téléversez-en une.' })}
            </div>
          )}
          {items.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onPick(img)}
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                aspectRatio: '4/3',
                overflow: 'hidden',
                borderRadius: 8,
              }}
              title={img.alt_en || img.id}
            >
              <img
                src={img.thumbUrl || img.url}
                alt={img.alt_en || ''}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
