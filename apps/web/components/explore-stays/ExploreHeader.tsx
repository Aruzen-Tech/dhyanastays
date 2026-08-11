interface Props {
  search: string;
  /** Aria-hidden, animated-safe copy — mirrors the existing visibleResultsStatusText. */
  visibleResultsText: string;
  /** sr-only announcement — mirrors the existing resultsStatusText (role="status"). */
  srResultsText: string;
  /** True when `search || activeFilterCount > 0` — same condition the old toolbar used. */
  showClearAll: boolean;
  /** Clears both search AND filters — the original toolbar-level "Clear all"
   * behavior, distinct from the filter panel's own filters-only clear. */
  onClearAll: () => void;
  focusRingClassName: string;
}

/**
 * Editorial introduction for the discovery section — replaces the old
 * terse "All Stays" / "Results for …" heading. Every dynamic value here
 * (result count, active search term) comes straight from existing state
 * in app/page.tsx; nothing is hardcoded.
 */
export default function ExploreHeader({
  search, visibleResultsText, srResultsText, showClearAll, onClearAll, focusRingClassName,
}: Props) {
  return (
    <div className="max-w-2xl mb-10 sm:mb-14">
      <span className="text-xs font-semibold text-brand-700 uppercase tracking-[0.16em]">
        Explore Stays
      </span>
      <h2
        className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 mt-2 leading-[1.15]"
      >
        Places worth slowing down for.
      </h2>
      <p className="text-gray-500 text-sm sm:text-base mt-4 leading-relaxed">
        Every stay on Dhyana is chosen, not listed — architect-inspected homes,
        farmstays and retreats across India&apos;s quietest corners.
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <p
          className="text-gray-400 text-sm"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span aria-hidden="true">
            {search ? `${visibleResultsText} for “${search}”` : visibleResultsText}
          </span>
          <span className="sr-only">{srResultsText}</span>
        </p>
        {showClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className={`text-sm text-brand-700 font-medium hover:underline ${focusRingClassName}`}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
