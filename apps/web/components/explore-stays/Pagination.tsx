import { IconChevronLeft, IconChevronRight } from './icons';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  focusRingClassName: string;
}

/** 1, '…', current-1, current, current+1, '…', totalPages — de-duplicated,
 * always includes the first and last page. Keeps the control compact even
 * with dozens of pages instead of rendering every page number. */
function getPageList(current: number, total: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push('ellipsis');
    result.push(page);
  });
  return result;
}

/**
 * Client-side pagination over the already-fetched, already-filtered
 * `results` array (app/page.tsx) — the public /listings API has no
 * page/limit/total contract to page against (confirmed by reading both
 * lib/api.ts and the backend's PublicListingController), so this slices an
 * already-complete result set for display rather than issuing new requests.
 * Purely presentational: `onPageChange` only updates a page index in the
 * parent, never re-runs search/filter logic.
 */
export default function Pagination({ currentPage, totalPages, onPageChange, focusRingClassName }: Props) {
  if (totalPages <= 1) return null;

  const pageList = getPageList(currentPage, totalPages);
  const pageButtonBase = `min-w-9 h-9 px-2 rounded-full text-sm font-medium transition-colors ${focusRingClassName}`;

  return (
    <nav aria-label="Stays pagination" className="mt-10 flex justify-end">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand-700 hover:text-brand-700 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 ${focusRingClassName}`}
        >
          <IconChevronLeft />
        </button>

        {/* Full numbered list — hidden below sm, where Prev/Next plus the
            "X of Y" label (below) are enough to stay usable without
            overflow or cramped tap targets. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {pageList.map((page, i) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`${pageButtonBase} ${
                  page === currentPage
                    ? 'bg-brand-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Compact "X of Y" — visible only below sm, in place of the full
            numbered list. */}
        <span className="px-2 text-sm text-gray-500 tabular-nums sm:hidden">
          {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand-700 hover:text-brand-700 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 ${focusRingClassName}`}
        >
          <IconChevronRight />
        </button>
      </div>
    </nav>
  );
}
