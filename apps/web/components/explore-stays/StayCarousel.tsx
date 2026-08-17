'use client';

import type { RefObject } from 'react';
import CompactStayCard from './CompactStayCard';
import type { Listing } from '../../lib/types';

/*
 * ─── Why this is not a carousel library ──────────────────────────────────
 * No carousel package is installed in this project (checked package.json:
 * no swiper, embla, keen-slider, splide or slick), and none was added. The
 * behaviour the brief asks for — snap to card starts, advance a screenful
 * per arrow press, disable an arrow at each end — is native browser
 * scrolling plus CSS scroll-snap, so a dependency would buy nothing and
 * would ship its own stylesheet to fight with the theme.
 *
 * Consequences worth knowing, all of them deliberate:
 *   - Touch, trackpad and shift+wheel scrolling work with no JS at all.
 *   - With JS disabled the row still renders and still scrolls; only the
 *     arrow buttons go inert, and they are supplementary to a scroller that
 *     already works.
 *   - The track is a real focusable scroll container, so keyboard users can
 *     reach it and arrow through it (WCAG 2.1.1) rather than being stranded
 *     on the buttons.
 */

interface Props {
  listings: Listing[];
  /**
   * Supplied by useCarouselScroll in the page that also renders the previous
   * and next buttons. The controls live in the filter toolbar rather than
   * above this row, so the scroll state cannot be owned here.
   */
  trackRef: RefObject<HTMLUListElement | null>;
}

/**
 * Horizontal, snap-scrolling row of compact stay cards — the Explore page's
 * grid-view presentation of `results`.
 *
 * Purely presentational: it renders whatever array it is handed and owns no
 * search, filter, sort, map, fetch or scroll state. Every stay in `listings`
 * is in the DOM; the row is a view over the full set, not a window onto part
 * of it, so nothing is reachable only by pressing an arrow.
 */
export default function StayCarousel({ listings, trackRef }: Props) {
  if (listings.length === 0) return null;

  return (
    <div role="group" aria-roledescription="carousel" aria-label="Curated stays">
      {/*
        Card widths are fixed per breakpoint, not percentages of the track.
        This section's container is full-bleed (EXPLORE_CONTAINER_CLASS has no
        max-width), so a percentage width would keep growing with the viewport
        and hand a 2560px screen four enormous cards — the opposite of a
        compact discovery row. Fixed widths instead let a wider screen show
        *more* cards at the same size, and narrow screens show fewer with a
        partial card at the edge that advertises the row is scrollable.

        The generous `pt-4 pb-6` is not decorative spacing: `overflow-x-auto`
        makes this element a clipping box on BOTH axes (a computed
        `overflow-x` of `auto` forces `overflow-y` to `auto` too), so a card
        that tilts, lifts and casts a shadow gets its top edge and its shadow
        sliced off without room to spill into. `-mx-*`/`px-*` does the same
        job horizontally while keeping the first and last card flush with the
        section's edges.
      */}
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="Stays, scrollable horizontally"
        className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-2 pb-6 pt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 sm:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="w-[228px] shrink-0 snap-start sm:w-[244px] lg:w-[264px]"
          >
            <CompactStayCard listing={listing} />
          </li>
        ))}
      </ul>
    </div>
  );
}
