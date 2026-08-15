'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import BrandMark from '../BrandMark';
import { useAuth } from '../../context/AuthContext';
import { useFeatures } from '../../context/FeatureContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScrollLock } from '../../hooks/useScrollLock';
import { buildNavItems } from '../../lib/navigation';
import DesktopNavigation from './DesktopNavigation';
import MobileNavigation from './MobileNavigation';
import UserMenu from './UserMenu';

/**
 * Composition root. Builds the priority-ordered nav item list once (the
 * single source of truth for both the measured desktop row and the flat
 * mobile drawer — they cannot structurally drift apart), and lays out
 * logo / nav / user menu / hamburger. No role branching or per-item JSX
 * lives here; that's all in lib/navigation.ts and the child components.
 */
export default function Navbar() {
  const { user } = useAuth();
  const { isEnabled } = useFeatures();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // Gates the navbar search icon below — it only makes sense on the
  // homepage, where its target (#hero-destination) actually exists.
  //
  // Resolved in an effect rather than read directly from usePathname()
  // during render: this Navbar sits in the shared root layout, and Next
  // App Router can serve that layout's SSR shell from a cache keyed to
  // whichever route first produced it — so a direct `pathname === '/'`
  // here disagreed between the server-rendered HTML and the client's own
  // hydration pass on every route except whichever one warmed the cache,
  // a real (not flaky) hydration mismatch confirmed via repeated fresh
  // loads of multiple routes. Starting at `false` and correcting after
  // mount makes the server and first client render provably identical
  // (both always false), eliminating the mismatch; the cost is the icon
  // appearing one frame late on a fresh load of the homepage, not on
  // in-app client-side navigation to it.
  const [isHomepage, setIsHomepage] = useState(false);
  useEffect(() => {
    setIsHomepage(pathname === '/');
  }, [pathname]);

  const items = useMemo(
    () => buildNavItems({ role: user?.role, kind: user?.kind, isEnabled }),
    [user?.role, user?.kind, isEnabled],
  );

  // Locks the page behind the drawer while it's open; the effect's cleanup
  // (keyed on mobileOpen) restores scroll on every close path — the close
  // button, selecting an item, the desktop-transition reset below, a route
  // change (the drawer's own item clicks call onClose directly), or unmount.
  useScrollLock(mobileOpen);

  // If the viewport crosses into desktop while the drawer is open, close it
  // rather than leaving stale `mobileOpen` state around — `md:hidden` on
  // MobileNavigation already hides it visually at that point, but the state
  // itself would still be `true`, which would incorrectly keep the scroll
  // lock active on desktop and pop the drawer back open with no user action
  // if the viewport later shrinks back below the breakpoint.
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-page">
        <nav className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" onClick={() => setMobileOpen(false)}>
            <BrandMark size={36} />
            <span className="font-bold text-brand-700 text-lg tracking-tight group-hover:opacity-80 transition-opacity">
              Dhyana Stays
            </span>
          </Link>

          <DesktopNavigation items={items} pathname={pathname} />

          <div className="flex items-center gap-2 shrink-0">
            {isHomepage && (
              <button
                type="button"
                onClick={() => {
                  const destination = document.getElementById('hero-destination');
                  destination?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  destination?.focus();
                }}
                aria-label="Search stays"
                className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-brand-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            )}

            <UserMenu />

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <div className="w-4 h-3 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current rounded transition-all origin-center ${mobileOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all origin-center ${mobileOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {mobileOpen && (
        <MobileNavigation items={items} pathname={pathname} onClose={() => setMobileOpen(false)} />
      )}
    </header>
  );
}
