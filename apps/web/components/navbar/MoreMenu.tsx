'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScrollLock } from '../../hooks/useScrollLock';
import { isOverflowActive, type NavItem } from '../../lib/navigation';
import NavigationItem from './NavigationItem';

interface Props {
  items: NavItem[];
  pathname: string;
}

/**
 * The overflow trigger + a large, page-centered mega-menu. Takes only
 * `items` — never a role — so it structurally cannot invent role-specific
 * grouping. Column/width tiers are thresholds on item count, not on role,
 * so they stay correct automatically if any role's list changes size.
 *
 * The panel is portaled to document.body (same idiom FilterPanel.tsx
 * already uses in this app) and positioned with `fixed` + viewport
 * centering, rather than `absolute` relative to the trigger — the trigger
 * sits near the right edge of the navbar, but the menu needs to center on
 * the page independent of where it happens to be clicked from. No
 * SSR/hydration "mounted" gate is needed here (unlike FilterPanel): `open`
 * starts false on both server and client and can only become true from a
 * client-side click well after hydration, so `document.body` is never
 * touched during SSR or the first client render.
 */
export default function MoreMenu({ items, pathname }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const active = isOverflowActive(items, pathname);
  const isDesktop = useIsDesktop();

  // Locks the page behind the menu while it's open, and — because the
  // lock lives in a useEffect keyed on `open` — is guaranteed to release on
  // every path that can make `open` false: the close paths below, the
  // desktop→mobile auto-close right after this, or this component simply
  // unmounting (e.g. if a resize makes every item fit inline and
  // DesktopNavigation stops rendering this component at all).
  useScrollLock(open);

  // Columns/width scale with item count so a large list (Admin's 20+) gets
  // a wide multi-column layout that fits without vertical scrolling, while
  // a short list (Investor's 2) doesn't render as an oddly huge, sparse box.
  const columns = items.length > 14 ? 3 : items.length > 6 ? 2 : 1;
  const widthClass =
    columns === 3 ? 'w-[min(90vw,50rem)]' : columns === 2 ? 'w-[min(88vw,36rem)]' : 'w-[min(86vw,18rem)]';
  const columnsClass = columns === 3 ? 'columns-3 gap-x-5' : columns === 2 ? 'columns-2 gap-x-5' : '';

  // Auto-close whenever the route changes (covers both clicking an item
  // inside the panel and any other navigation while it happens to be open).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // If the viewport drops below the desktop breakpoint while this is open,
  // close it. Its trigger already doesn't render below `md:` (its parent,
  // DesktopNavigation, is `hidden md:flex`) and MobileNavigation is the
  // correct, separate mobile equivalent — but the panel itself is portaled
  // to document.body, so without this it would stay visible across the
  // resize despite its trigger disappearing, since a portal isn't subject
  // to an ancestor's `hidden` class.
  useEffect(() => {
    if (!isDesktop) setOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative h-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`relative h-full flex items-center gap-1 whitespace-nowrap text-sm transition-colors ${
          active ? 'text-brand-700 font-semibold' : 'text-gray-500 hover:text-brand-700'
        }`}
      >
        More
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {/* Same treatment as NavigationItem's top-level active indicator —
            flush with the header's bottom edge, width matching this
            trigger's own content (label + chevron), active when any item
            currently sitting inside this menu matches the route. */}
        <span
          className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand-700 origin-center transition-transform duration-200 ${
            active ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </button>

      {open &&
        createPortal(
          <>
            {/* Click-outside-to-close. z-[55] — deliberately ABOVE the
                sticky header (z-50, app/components/navbar/Navbar.tsx), not
                the app's usual z-40 idiom: this menu can be triggered from
                inside the header itself, so the header's own content (logo,
                other nav items) would otherwise sit visually above a z-40
                overlay and swallow "outside" clicks that land on the navbar
                rather than closing the menu. */}
            <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
            {/* Fixed, full-width wrapper that centers its child via flexbox
                — NOT `left-1/2 -translate-x-1/2` on the panel itself, which
                would be silently overwritten: `animate-scale-in`'s keyframes
                set `transform: scale(...)` directly and hold that value via
                `animation-fill-mode: both`, clobbering any other `transform`
                utility applied to the same element. Centering one level up
                sidesteps the conflict entirely. top-[4.5rem] clears the
                sticky header (h-16 = 4rem, plus its 1px border, plus a small
                visual gap). */}
            <div
              className="fixed inset-x-0 top-[4.5rem] z-[58] flex justify-center px-4 pointer-events-none"
            >
              {/* Solid, fully opaque bg-white (not .glass-card's
                  translucency) — at this size the panel can sit directly
                  over colorful page content, and glass-card's ~72% opacity
                  let that content bleed through and hurt legibility.
                  bg-white/border-gray-100 are CSS-variable-backed tokens, so
                  this still inverts correctly in dark mode. */}
              <div
                role="menu"
                className={`pointer-events-auto bg-white border border-gray-100 shadow-glass rounded-3xl p-5 sm:p-6 animate-scale-in max-h-[75vh] overflow-y-auto overscroll-contain ${widthClass} ${columnsClass}`}
              >
                {items.map((item) => (
                  <NavigationItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    variant="panel"
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
