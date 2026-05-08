import { useEffect, useState } from 'react';
import { pickT } from '../i18n.js';
import {
  listContentHistory,
  getContentRevision,
  restoreContentRevision,
} from '../api/content.js';

// Counts how many top-level keys differ between two content documents. Used as
// a quick "N fields changed" hint in the revision list.
function fieldsChangedBetween(prev, next) {
  if (!prev || !next) return null;
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  let changed = 0;
  for (const k of keys) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) changed += 1;
  }
  return changed;
}

function formatTimestamp(unix, lang) {
  const d = new Date(unix * 1000);
  return d.toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryModal({ onClose, onRestored, lang = 'en' }) {
  const t = pickT(lang);
  const [items, setItems] = useState([]);
  const [revisions, setRevisions] = useState({}); // id -> document
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('763_token');
      const res = await listContentHistory(token);
      setItems(res?.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const fetchPreview = async (id) => {
    if (revisions[id]) {
      setPreviewId(id);
      return;
    }
    try {
      const token = localStorage.getItem('763_token');
      const res = await getContentRevision(id, token);
      setRevisions((r) => ({ ...r, [id]: res?.document || {} }));
      setPreviewId(id);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const restore = async (id) => {
    const ok = confirm(t({
      en: 'Restore this revision? The current content will be replaced (a new history entry will be created).',
      fr: 'Restaurer cette révision? Le contenu actuel sera remplacé (une nouvelle entrée d’historique sera créée).',
    }));
    if (!ok) return;
    setBusy(true);
    setErr('');
    try {
      const token = localStorage.getItem('763_token');
      await restoreContentRevision(id, token);
      onRestored?.();
      onClose();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const previewDoc = previewId != null ? revisions[previewId] : null;

  // Build a "fields changed" hint between adjacent revisions (older context
  // helps editors see which save was destructive).
  const orderedAsc = [...items].slice().reverse();
  const changedByID = {};
  for (let i = 1; i < orderedAsc.length; i++) {
    const prev = revisions[orderedAsc[i - 1].id];
    const next = revisions[orderedAsc[i].id];
    if (prev && next) {
      changedByID[orderedAsc[i].id] = fieldsChangedBetween(prev, next);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{t({ en: 'Edit history', fr: 'Historique des modifications' })}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {t({
            en: 'Up to 50 most recent revisions of the editable site content. Restore reverts the live content (and creates a new entry).',
            fr: 'Jusqu’à 50 dernières révisions du contenu modifiable. Restaurer remplace le contenu en ligne (et crée une nouvelle entrée).',
          })}
        </p>

        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--line)', paddingRight: 12 }}>
            {loading && <div style={{ padding: 16, color: 'var(--ink-mute)' }}>…</div>}
            {!loading && items.length === 0 && (
              <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 13 }}>
                {t({ en: 'No revisions yet.', fr: 'Aucune révision pour l’instant.' })}
              </div>
            )}
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid var(--line)',
                  background: previewId === it.id ? 'var(--paper)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => fetchPreview(it.id)}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {formatTimestamp(it.created_at, lang)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {it.updated_by?.name || t({ en: 'unknown', fr: 'inconnu' })}
                  {changedByID[it.id] != null && (
                    <span> · {changedByID[it.id]}{' '}
                      {t({ en: 'fields changed', fr: 'champs modifiés' })}
                    </span>
                  )}
                  {it.note && (
                    <span style={{ marginLeft: 6, fontStyle: 'italic' }}>· {it.note}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fetchPreview(it.id); }}
                    style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)', cursor: 'pointer' }}
                  >
                    {t({ en: 'Preview', fr: 'Aperçu' })}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); restore(it.id); }}
                    style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
                  >
                    {t({ en: 'Restore', fr: 'Restaurer' })}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1.2, overflowY: 'auto', minWidth: 0 }}>
            {previewDoc ? (
              <pre
                style={{
                  fontSize: 11,
                  background: 'var(--bg)',
                  padding: 12,
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  maxHeight: '100%',
                }}
              >
                {JSON.stringify(previewDoc, null, 2)}
              </pre>
            ) : (
              <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 13 }}>
                {t({ en: 'Click a revision on the left to preview it here.', fr: 'Cliquez sur une révision à gauche pour l’aperçu.' })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
