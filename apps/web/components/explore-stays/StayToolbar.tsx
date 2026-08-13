'use client';

import { useState } from 'react';
import type { DiscoverySort } from '../../lib/types';
import { IconCheck, IconChevronDown, IconColumns, IconGrid, IconMap, IconSliders } from './icons';

type ViewMode = 'grid' | 'map' | 'split';

const SORT_OPTIONS: { value: DiscoverySort | ''; label: string }[] = [
  { value: '', label: 'Recommended' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

interface Props {
  filterSort: DiscoverySort | '';
  setFilterSort: (value: DiscoverySort | '') => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  focusRingClassName: string;
}

/**
 * Sort control, view-mode toggle (grid/map/split — same three modes and
 * same setViewMode as before), and the "Filters" trigger that opens
 * FilterPanel. All existing behavior, new presentation.
 */
export default function StayToolbar({
  filterSort, setFilterSort, viewMode, setViewMode,
  activeFilterCount, onOpenFilters, focusRingClassName,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === filterSort)?.label ?? 'Recommended';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

        {/* View mode */}
        <div className="flex items-center rounded-full bg-gray-100 p-1" role="group" aria-label="Listing view">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            title="Grid view"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
              viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            } ${focusRingClassName}`}
          >
            <IconGrid />
          </button>
          <button
            onClick={() => setViewMode('map')}
            aria-label="Map view"
            aria-pressed={viewMode === 'map'}
            title="Map view"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
              viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            } ${focusRingClassName}`}
          >
            <IconMap />
          </button>
          <button
            onClick={() => setViewMode('split')}
            aria-label="Split view"
            aria-pressed={viewMode === 'split'}
            title="Split view"
            className={`hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-colors ${
              viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            } ${focusRingClassName}`}
          >
            <IconColumns />
          </button>
        </div>
      </div>
    </div>
  );
}
