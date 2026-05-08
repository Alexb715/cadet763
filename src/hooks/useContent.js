import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_CONTENT } from '../data.js';
import { loadContent, saveContent, clearContent } from '../api/content.js';

export function useContent() {
  const [content, setContent] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('763_content_v1') || 'null');
      return { ...DEFAULT_CONTENT, ...(stored || {}) };
    } catch {
      return DEFAULT_CONTENT;
    }
  });

  useEffect(() => {
    let mounted = true;
    loadContent().then((stored) => {
      if (mounted && stored && Object.keys(stored).length) {
        setContent((prev) => ({ ...prev, ...stored }));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const set = useCallback((key, value) => {
    setContent((prev) => {
      const next = { ...prev, [key]: value };
      const token = localStorage.getItem('763_token');
      saveContent(next, token).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const token = localStorage.getItem('763_token');
    clearContent(token).catch(() => {});
    setContent(DEFAULT_CONTENT);
  }, []);

  return { content, set, reset };
}
