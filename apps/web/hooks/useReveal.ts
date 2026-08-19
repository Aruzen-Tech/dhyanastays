'use client';

import { useCallback, useEffect, useState } from 'react';

interface Options {
  /** Shrink the viewport box so the reveal fires a little before the true edge. */
  rootMargin?: string;
  threshold?: number;
}

/**
 * Scroll-triggered entrance animations, built on the browser's own
 * IntersectionObserver + the Tailwind keyframes already defined in
 * tailwind.config.ts. No animation library is installed in this project and
 * none is added for this — see the animation notes in StaySpotlight.tsx.
 *
 * Returns three values, and the three-state `armed`/`revealed` split is the
 * important part:
 *
 *   - `armed` is false during SSR, before hydration, and whenever the user
 *     prefers reduced motion. Callers must render the final, fully-visible
 *     state while it is false — so the content is readable with JavaScript
 *     disabled and never animates for someone who asked it not to.
 *   - `revealed` flips true once (and stays true) when the element first
 *     intersects the viewport. That is the cue to attach the animation
 *     classes.
 *
 * Together: `!armed` → visible, no animation. `armed && !revealed` → hidden,
 * waiting. `armed && revealed` → animating into place.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options: Options = {}) {
  const { rootMargin = '0px 0px -10% 0px', threshold = 0.15 } = options;
  // A state-backed callback ref (not useRef): the observer effect must re-run
  // when the element actually mounts. Some consumers render the element
  // conditionally (e.g. only after an async fetch), so a plain ref would still
  // be null when the effect first ran and would never re-attach — leaving the
  // content pinned at its opacity-0 pre-reveal state forever.
  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback((el: T | null) => setNode(el), []);
  const [revealed, setRevealed] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setArmed(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!armed || revealed || !node) return;

    // Very old browsers / jsdom: no observer, so just show everything.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [armed, revealed, node, rootMargin, threshold]);

  return { ref, armed, revealed };
}
