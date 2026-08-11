'use client';

import { useEffect } from 'react';

/**
 * Locks document scroll while `active` is true, and always restores it when
 * `active` becomes false OR the component unmounts — React guarantees an
 * effect's cleanup runs on both, so every close path (explicit close,
 * outside click, selecting an item, a resize-driven auto-close, a route
 * change, or the component simply unmounting) restores scroll correctly by
 * construction, with nothing to remember to call manually.
 *
 * Also compensates for the vertical scrollbar disappearing (which otherwise
 * shifts all content right by the scrollbar's width for as long as the lock
 * is active) by padding the body with an equal amount — this is what
 * prevents the layout jump a plain `overflow: hidden` toggle would cause.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const currentPaddingRight = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}
