'use client';

import { useEffect, useState } from 'react';

// Matches Tailwind's default `md:` breakpoint (min-width: 768px) — the same
// breakpoint already used throughout the Navbar via `hidden md:flex` /
// `md:hidden`. This project doesn't override Tailwind's default `screens`
// config, so this is the same breakpoint, not a second/conflicting one.
const MD_BREAKPOINT_QUERY = '(min-width: 768px)';

/**
 * Tracks whether the viewport is at/above the desktop (`md:`) breakpoint,
 * so components can react to crossing it (e.g. auto-closing a menu that's
 * only valid on one side of the breakpoint) instead of leaving it open with
 * the wrong layout after a resize.
 */
export function useIsDesktop(): boolean {
  // Defaults to true for the initial/SSR render, matching this Navbar's
  // existing convention elsewhere (useOverflowNav also starts "show
  // everything" on the server) — corrected synchronously on the client
  // before paint, so there's no flash of the wrong state.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(MD_BREAKPOINT_QUERY);
    setIsDesktop(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
