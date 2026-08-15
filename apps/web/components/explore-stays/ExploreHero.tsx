'use client';

import { type KeyboardEvent, type RefObject, useState } from 'react';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';
import type { Listing } from '../../lib/types';
import HeroShowcase from './HeroShowcase';
import { IconSearch } from './icons';

type SearchSuggestion = {
  label: string;
  value: string;
  type: 'Stay' | 'City' | 'State';
  secondary?: string;
};

interface Props {
  // ─── Real destination search — same state/handlers app/page.tsx has
  // always used (search, debounce, suggestions, keyboard nav, outside-click
  // close). Nothing here is reimplemented; every value/handler is passed
  // straight through from the existing implementation. ───────────────────
  search: string;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  searchBoxRef: RefObject<HTMLDivElement | null>;
  searching: boolean;
  searchSuggestions: SearchSuggestion[];
  suggestionsRendered: boolean;
  activeSuggestionIndex: number;
  activeSuggestionId?: string;
  onSuggestionHover: (index: number) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Runs the exact existing search (runSearch) immediately instead of
   * waiting for the debounce, then scrolls to the results section. Reuses
   * app/page.tsx's own function — not a second search implementation. */
  onSubmit: () => void;
  /** allListings.length — real, already-fetched data. */
  stayCount: number;
  /** First few of allListings — real, already-fetched data, for the hero's
   * image collage (see HeroShowcase). Not a second fetch. */
  featuredListings: Listing[];
}

function GuestStepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-brand-700 hover:text-brand-700 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold tabular-nums text-gray-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-brand-700 hover:text-brand-700 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Editorial Explore hero — replaces the old centered gradient-band hero.
 * Presentational only: the destination search below is wired straight to
 * app/page.tsx's real search state via props (same debounce, same
 * suggestions, same runSearch/API call, same URL params).
 *
 * Check-in and check-out are intentionally local-only decorative state
 * (useState right here, not lifted, not persisted, not read by search) —
 * per explicit product direction: no check-in/check-out split exists
 * anywhere in the current Explore search or its API today, and building
 * that out would mean inventing a second, parallel search implementation,
 * which the brief for this redesign explicitly forbids. These fields are
 * visual-parity with the reference layout only; only the destination field
 * and the Search button actually affect results.
 *
 * Guests/Adults is the same kind of local-only decorative state. A
 * Children stepper used to sit alongside it (also decorative, also
 * untouched by search) — removed per product direction; it was never read
 * by runSearch or any URL param, so removing it has zero effect on search
 * behavior or the backend/API contract.
 *
 * Vertical rhythm (padding/gaps here and HeroShowcase's aspect ratio) is
 * deliberately tight: the search strip must stay visible in the initial
 * viewport on a normal desktop window, not just on a tall one.
 */
export default function ExploreHero({
  search,
  onSearchChange,
  onSearchFocus,
  searchBoxRef,
  searching,
  searchSuggestions,
  suggestionsRendered,
  activeSuggestionIndex,
  activeSuggestionId,
  onSuggestionHover,
  onSuggestionSelect,
  onSearchKeyDown,
  onSubmit,
  stayCount,
  featuredListings,
}: Props) {
  // Decorative-only — see file docblock. Never read by search/runSearch.
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);

  return (
    <section className="relative border-b border-gray-100 bg-surface">
      <div className={`${EXPLORE_CONTAINER_CLASS} pb-8 pt-10 lg:pb-10 lg:pt-14`}>
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Text column */}
          <div className="order-2 lg:order-1">
            <span className="mb-5 block text-xs font-bold uppercase tracking-[0.2em] lg:mb-8">
              <span className="text-gray-900">Dhyana</span> <span className="text-brand-700">Stays</span>
            </span>
            <h1 className="text-[2.75rem] font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl lg:text-[3.4rem] xl:text-[3.75rem]">
              Find your
              <br />
              perfect
              <br />
              <span className="text-brand-700">sanctuary</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-gray-500 sm:text-lg">
              Handpicked stays for mindful travellers — from Himalayan retreats to coastal hideaways.
            </p>
          </div>

          {/* Art column — capped rather than lg:max-w-none (which let it grow
              to ~half the container's full width, ~550-600px, and alone
              pushed the search strip out of the initial viewport). */}
          <div className="order-1 lg:order-2">
            <HeroShowcase listings={featuredListings} stayCount={stayCount} />
          </div>
        </div>

        {/* Search strip */}
        <div className="relative mt-8 lg:mt-10">
          <div className="flex flex-col overflow-visible rounded-3xl border border-gray-200 bg-white shadow-glass md:flex-row md:items-stretch">
            {/* Destination — the one real, fully-wired field */}
            <div
              ref={searchBoxRef}
              className="relative min-w-0 flex-[1.6] border-b border-gray-100 px-6 py-4 md:border-b-0 md:border-r md:py-3"
            >
              <label htmlFor="hero-destination" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Where are you going?
              </label>
              <div className="flex items-center gap-2">
                <IconSearch className={searching ? 'shrink-0 animate-pulse text-gray-400' : 'shrink-0 text-gray-400'} />
                <input
                  id="hero-destination"
                  type="text"
                  placeholder="Search destinations"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  onFocus={onSearchFocus}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                  aria-label="Search stays"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={suggestionsRendered ? 'hero-search-suggestions' : undefined}
                  aria-expanded={suggestionsRendered}
                  aria-activedescendant={activeSuggestionId}
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                />
              </div>

              {suggestionsRendered && (
                <div
                  id="hero-search-suggestions"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl"
                >
                  <div className="py-2">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        id={`hero-search-suggestion-${index}`}
                        key={`${suggestion.type}-${suggestion.value}`}
                        type="button"
                        role="option"
                        aria-selected={activeSuggestionIndex === index}
                        onMouseEnter={() => onSuggestionHover(index)}
                        onClick={() => onSuggestionSelect(suggestion)}
                        className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors focus:outline-none ${
                          activeSuggestionIndex === index ? 'bg-brand-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{suggestion.label}</p>
                          {suggestion.secondary && (
                            <p className="truncate text-sm text-gray-500">{suggestion.secondary}</p>
                          )}
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {suggestion.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Check-in — decorative, local-only (see docblock) */}
            <div className="min-w-0 flex-[0.9] border-b border-gray-100 px-6 py-4 md:border-b-0 md:border-r md:py-3">
              <label htmlFor="hero-checkin" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Check-in
              </label>
              <input
                id="hero-checkin"
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 [color-scheme:light] focus:outline-none focus:ring-0 dark:[color-scheme:dark]"
              />
            </div>

            {/* Check-out — decorative, local-only (see docblock) */}
            <div className="min-w-0 flex-[0.9] border-b border-gray-100 px-6 py-4 md:border-b-0 md:border-r md:py-3">
              <label htmlFor="hero-checkout" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Check-out
              </label>
              <input
                id="hero-checkout"
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(event) => setCheckOut(event.target.value)}
                className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 [color-scheme:light] focus:outline-none focus:ring-0 dark:[color-scheme:dark]"
              />
            </div>

            {/* Guests — decorative, local-only (see docblock) */}
            <div className="flex min-w-0 flex-[0.7] items-center border-b border-gray-100 px-6 py-4 md:border-b-0 md:border-r md:py-3">
              <GuestStepper label="Guests" value={adults} onChange={setAdults} min={1} max={8} />
            </div>

            {/* Submit — reuses the real runSearch via onSubmit */}
            <div className="flex items-center p-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={searching}
                className="btn-primary w-full px-8 py-3.5 text-sm tracking-wide md:w-auto"
              >
                <IconSearch className={searching ? 'shrink-0 animate-pulse' : 'shrink-0'} />
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
