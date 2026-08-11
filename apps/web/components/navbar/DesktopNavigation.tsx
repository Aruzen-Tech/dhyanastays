'use client';

import { NAV_GAP_PX, type NavItem } from '../../lib/navigation';
import { useOverflowNav } from '../../hooks/useOverflowNav';
import NavigationItem from './NavigationItem';
import MoreMenu from './MoreMenu';

interface Props {
  items: NavItem[];
  pathname: string;
}

/**
 * The only component that knows about width measurement. `containerRef`
 * sits on a `flex-1 min-w-0` region between the logo and the user menu, so
 * its measured clientWidth is exactly "how much space nav items actually
 * have" — bounded by its siblings, reactive to either changing size.
 *
 * `h-16` here matches the nav row's own height (Navbar.tsx's `<nav ...
 * h-16>`) explicitly, rather than relying on flex `items-center` to size
 * this container to its content — each NavigationItem's active-state bottom
 * border needs its own `h-full` to resolve against the header's true
 * height, not just the text's own line-height, so it can sit flush with
 * the header's bottom edge.
 *
 * `justify-center`: this container is the `flex-1` region between the logo
 * and the right-side actions (Navbar.tsx's outer `<nav>` is `justify-between`
 * with three children — logo, this, actions), so its own width is already
 * "whatever space is left over" once logo and actions take theirs. Centering
 * the visible items *within* that leftover space is what makes the nav read
 * as centered in the header — without it (the old default `justify-start`)
 * items hug the left edge right against the logo instead. This can't ever
 * overlap the logo or actions: it only redistributes empty space symmetrically
 * inside a box those two siblings have already been subtracted from. It's
 * only exactly centered on the full header when the logo and actions happen
 * to be the same width; when they differ (e.g. a wide logged-in actions
 * cluster vs. a narrower logo) the nav sits off true-center by half that
 * difference — an unavoidable, and here minor, trade-off of not overlapping
 * either sibling, which the fit algorithm below already guarantees width-wise.
 */
export default function DesktopNavigation({ items, pathname }: Props) {
  const { containerRef, measureRef, moreButtonRef, visibleCount } = useOverflowNav(
    items.length,
    NAV_GAP_PX,
  );

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = items.slice(visibleCount);

  return (
    <div
      ref={containerRef}
      className="hidden md:flex flex-1 min-w-0 h-16 items-center justify-center relative"
      style={{ gap: NAV_GAP_PX }}
    >
      {visibleItems.map((item) => (
        <NavigationItem key={item.id} item={item} pathname={pathname} variant="top-level" />
      ))}
      {overflowItems.length > 0 && <MoreMenu items={overflowItems} pathname={pathname} />}

      {/* Hidden measurement region — same NavigationItem component as the
          live row above, so measured widths can never diverge from what's
          actually displayed. The outer wrapper is `w-0 h-0 overflow-hidden`
          (zero footprint, clips its own contribution to the page's
          scrollable area) rather than merely pushed off-screen — an
          off-screen-only clone still renders at its full natural width
          (e.g. ~3000px for Admin's 26 items) and was found to blow out
          document.scrollWidth, causing real horizontal page scroll. Children
          inside an overflow:hidden ancestor still lay out and report their
          true intrinsic widths via getBoundingClientRect(), so measurement
          is unaffected — only the page-level scroll contribution is fixed. */}
      <div
        className="absolute left-0 top-0 w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div ref={measureRef} className="flex items-center invisible" style={{ gap: NAV_GAP_PX }}>
          {items.map((item) => (
            <NavigationItem key={item.id} item={item} pathname={pathname} variant="top-level" />
          ))}
        </div>
        <button
          ref={moreButtonRef}
          tabIndex={-1}
          className="invisible flex items-center gap-1 text-sm py-1"
        >
          More
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
