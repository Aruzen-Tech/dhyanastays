'use client';

import { useState } from 'react';
import type { DiscoverySort } from '../../lib/types';
import { IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconSliders } from './icons';

const SORT_OPTIONS: { value: DiscoverySort | ''; label: string }[] = [
  { value: '', label: 'Recommended' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

interface Props {
  filterSort: DiscoverySort | '';
  setFilterSort: (value: DiscoverySort | '') => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  focusRingClassName: string;
  /** Stay-carousel paging, hosted here so the controls share a line with
   *  Filters and Sort instead of occupying a row of their own. Omitted when
   *  there is nothing to page (loading, empty, error). */
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
  onScrollPrev?: () => void;
  onScrollNext?: () => void;
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all duration-200 hover:border-gray-300 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/**
 * Sort control, the "Filters" trigger that opens FilterPanel, and the stay
 * carousel's previous/next buttons — one row, no second control strip.
 *
 * The grid/map/split view toggle was removed from this row; app/page.tsx
 * still renders those branches, so restoring the control is a UI-only change.
 */
export default function StayToolbar({
  filterSort, setFilterSort,
  activeFilterCount, onOpenFilters, focusRingClassName,
  canScrollPrev, canScrollNext, onScrollPrev, onScrollNext,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === filterSort)?.label ?? 'Recommended';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      {/* Filter trigger — opens FilterPanel; visible at every breakpoint now
          that there's no more permanently-visible desktop rail. */}
      <button
        type="button"
        onClick={onOpenFilters}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
          activeFilterCount > 0 ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-gray-900 border-gray-200 hover:border-gray-300'
        } ${focusRingClassName}`}
      >
        <IconSliders />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-white text-brand-700 rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {/* Sort */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors ${focusRingClassName}`}
          >
            <span className="text-gray-400 hidden sm:inline">Sort:</span> {activeSortLabel}
            <IconChevronDown className={sortOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white glass-card p-1.5 z-20 animate-scale-in">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value || 'recommended'}
                    type="button"
                    onClick={() => { setFilterSort(value); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                      filterSort === value ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    {filterSort === value && <IconCheck />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stay-carousel paging — rendered only when the page supplies
            handlers, so the row stays clean while results are loading. */}
        {onScrollPrev && onScrollNext && (
          <div className="flex items-center gap-1.5 pl-1">
            <ArrowButton
              label="Show previous stays"
              disabled={!canScrollPrev}
              onClick={onScrollPrev}
            >
              <IconChevronLeft className="h-4 w-4" />
            </ArrowButton>
            <ArrowButton
              label="Show more stays"
              disabled={!canScrollNext}
              onClick={onScrollNext}
            >
              <IconChevronRight className="h-4 w-4" />
            </ArrowButton>
          </div>
        )}
      </div>
    </div>
  );
}
