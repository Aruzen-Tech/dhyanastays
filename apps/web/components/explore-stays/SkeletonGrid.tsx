/**
 * Loading placeholder shaped like StayEditorialGrid — mirrors ListingCard's
 * exact structure and spacing (image aspect ratio, then Title → Location →
 * Metadata → Price, same paddings/line-heights) block for block, so real
 * cards can swap in with zero layout shift. Every card here uses the same
 * fixed image ratio; ListingCard no longer has a "large" size variant, so
 * the skeleton mustn't invent one either — that mismatch was what made the
 * first skeleton render taller than the rest.
 */
export default function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-full flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
        >
          {/* Image — same fixed aspect-[4/3] as the real card, on every card. */}
          <div className="aspect-[4/3] shrink-0 bg-gray-100 animate-pulse" />

          <div className="flex flex-1 flex-col p-5 sm:p-6">
            {/* Title (leading-6 / 24px, matching the real h3) */}
            <div className="h-6 w-4/5 rounded bg-gray-100 animate-pulse" />

            {/* Location (leading-5 / 20px row, pin icon + text) */}
            <div className="h-5 flex items-center gap-1.5 mt-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="h-3.5 w-2/5 rounded bg-gray-100 animate-pulse" />
            </div>

            {/* Metadata row (leading-5 / 20px row, two icon+label items) */}
            <div className="h-5 flex items-center gap-4 mt-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="h-3.5 w-14 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>

            {/* Price — pinned to the bottom behind a divider, matching the real card */}
            <div className="mt-auto pt-3 border-t border-gray-100">
              <div className="h-7 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
