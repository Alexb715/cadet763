import { useEffect } from 'react';

// Adds the `in` class to elements tagged `.reveal` as they scroll into view,
// driving the CSS entrance transition in 09-scene.css. Re-scans whenever the
// dependency list changes (e.g. on page navigation) so freshly mounted content
// animates too. Degrades to "just show everything" when the browser lacks
// IntersectionObserver or the user prefers reduced motion.
export function useReveal(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal:not(.in)'));
    if (!els.length) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
