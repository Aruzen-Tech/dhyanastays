interface Props {
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
 * Minimal heading for the discovery section — a single word, with the
 * editorial eyebrow, tagline, description and visible result count all
 * removed so the stays row itself carries the section.
 *
 * The result count is gone visually but NOT from the accessibility tree: the
 * `role="status"` live region below is retained and still announces "11
 * curated stays" / "Searching stays." on every search and filter change. It
 * is the only signal a screen-reader user gets that the results changed, so
 * dropping it with the visible text would have been a real regression rather
 * than a visual simplification.
 */
export default function ExploreHeader({
  srResultsText, showClearAll, onClearAll, focusRingClassName,
}: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
      {/* Small and semibold rather than large and bold: at one word, a display
          size reads as a leftover from the old editorial block. This is a
          section label, so it should sit quietly above the row it names. */}
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
        Explore
      </h2>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {srResultsText}
      </p>

      {showClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className={`shrink-0 text-sm text-brand-700 font-medium hover:underline ${focusRingClassName}`}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
