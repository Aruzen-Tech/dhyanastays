'use client';

import { useEffect, useRef, useState } from 'react';

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
  const ref = useRef<T | null>(null);
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
    if (!armed || revealed) return;
    const element = ref.current;
    if (!element) return;

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
    observer.observe(element);
    return () => observer.disconnect();
  }, [armed, revealed, rootMargin, threshold]);

  return { ref, armed, revealed };
}
