'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fraction of the visible track scrolled per arrow press. Just under a full
 * screenful on purpose — a whole one leaves no shared card between before and
 * after, which makes the jump read as a page swap rather than as movement.
 */
const SCROLL_RATIO = 0.9;

/** Sub-pixel scroll offsets are normal; without a tolerance the end-of-track
 *  arrow can stay enabled forever on fractional device pixel ratios. */
const EDGE_TOLERANCE = 2;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll state for a horizontal snap track, kept outside the track's own
 * component so the buttons that drive it can live somewhere else in the tree.
 *
 * That separation is the entire point: the previous/next controls now sit in
 * the filter toolbar, several levels away from the `<ul>` they scroll, and
 * prop-drilling a ref plus two booleans upward is not possible. The owner of
 * both calls this hook and hands `trackRef` to the track and the returned
 * handlers to the buttons.
 *
 * @param resetKey Re-measures and returns to the start when this changes —
 *   pass the rendered collection, so filtering down to three results retires
 *   the next arrow instead of leaving it offering movement that cannot happen.
 */
export function useCarouselScroll<T extends HTMLElement = HTMLUListElement>(resetKey: unknown) {
  const trackRef = useRef<T | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setCanScrollPrev(track.scrollLeft > EDGE_TOLERANCE);
    setCanScrollNext(track.scrollLeft < maxScrollLeft - EDGE_TOLERANCE);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // A shorter list can leave the track scrolled past its own new end.
    track.scrollLeft = 0;
    sync();

    track.addEventListener('scroll', sync, { passive: true });

    // Card widths are viewport-dependent, so an end-of-track state is only
    // valid for the size it was measured at.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    observer?.observe(track);

    return () => {
      track.removeEventListener('scroll', sync);
      observer?.disconnect();
    };
  }, [resetKey, sync]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * SCROLL_RATIO,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

  const scrollPrev = useCallback(() => scrollByPage(-1), [scrollByPage]);
  const scrollNext = useCallback(() => scrollByPage(1), [scrollByPage]);

  return { trackRef, canScrollPrev, canScrollNext, scrollPrev, scrollNext };
}
