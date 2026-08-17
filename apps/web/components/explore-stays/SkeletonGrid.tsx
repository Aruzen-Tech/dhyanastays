import Skeleton from '../Skeleton';

/**
 * Loading placeholder for the stays section.
 *
 * Mirrors StayCarousel + CompactStayCard block for block: the same arrow row,
 * the same track padding and gaps, the same fixed card widths per breakpoint,
 * and inside each card the same frame (`p-2`, concentric 24px/16px radii),
 * the same 4:3 photo and the same three text rows at their real heights.
 * Matching those heights is the whole point — a skeleton that is a few pixels
 * off makes the page jump when the data lands.
 *
 * Heights are derived from the real card's type, not guessed:
 *   title    text-[15px] leading-snug   -> ~20px -> h-5
 *   location text-[11px] leading-4      ->  16px -> h-4
 *   price    text-sm (line-height 20px) ->  20px -> h-5
 *
 * Every block is a <Skeleton>, so the fill colour and shimmer come from the
 * shared `.skeleton` class rather than being restated here.
 *
 * No arrow row here: the previous/next controls moved into StayToolbar,
 * which stays mounted while this renders, so reserving space for them a
 * second time would open a gap that closes when the data lands.
 *
 * `aria-hidden` because it carries no information: app/page.tsx already
 * announces "Loading stays." through a live region, and letting a screen
 * reader walk a dozen empty boxes would only add noise.
 */
export default function SkeletonGrid() {
  return (
    <div className="relative" aria-hidden="true">
      {/* Track — `overflow-hidden` rather than `overflow-x-auto`: there is
          nothing to scroll yet, and a scrollable region with no real content
          is just a trap for a stray swipe. */}
      <div className="-mx-2 flex gap-4 overflow-hidden px-2 pb-6 pt-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="w-[228px] shrink-0 sm:w-[244px] lg:w-[264px]">
            {/* A much lighter shadow than the real card's resting one: a
                placeholder should sit quieter on the page than the content
                replacing it, so the swap settles rather than deflates. */}
            <div className="rounded-3xl border border-gray-100 bg-white p-2 shadow-[0_2px_6px_-4px_rgba(17,24,39,0.07)]">
              <Skeleton variant="rounded" className="aspect-[4/3] w-full" />

              <div className="px-1 pb-1 pt-3">
                <Skeleton variant="text" className="h-5 w-4/5" />

                <div className="mt-1 flex h-4 items-center gap-1.5">
                  <Skeleton variant="circular" className="h-3 w-3 shrink-0" />
                  <Skeleton variant="text" className="h-3 w-2/5" />
                </div>

                <Skeleton variant="text" className="mt-1.5 h-5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
