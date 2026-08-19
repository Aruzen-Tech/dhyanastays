'use client';

import { type KeyboardEvent, type RefObject, useState } from 'react';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';
import type { Listing } from '../../lib/types';
import HeroCarousel from './HeroCarousel';
import StayDateRangePicker from './StayDateRangePicker';
import { IconSearch, IconUsers } from './icons';

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
   * promotion carousel (see HeroCarousel). Not a second fetch. */
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
    <div className="flex w-full items-center gap-2.5">
      {/* Leading icon mirrors the date pills, so all three field types in the
          strip open on the same icon + label + value rhythm. */}
      <IconUsers className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
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
 * Vertical rhythm (padding/gaps here and HeroCarousel's aspect ratio) is
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
    /* border-gray-200, not -100: gray-100 (243,244,246) is within a few
       points of the new --surface (243,244,239), so on a page-coloured
       section the divider would be invisible. */
    <section className="relative border-b border-gray-200 bg-surface">
      <div className={`${EXPLORE_CONTAINER_CLASS} pb-3 pt-2 lg:pb-4 lg:pt-3`}>
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_0.9fr] lg:gap-8">
          {/* Text column — same copy, tightened hard. The whole hero is sized
              so the search strip AND the first row of stay cards land inside
              the opening viewport rather than below the fold. */}
          <div className="order-2 lg:order-1">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] lg:mb-2.5">
              <span className="text-gray-900">Dhyana</span> <span className="text-brand-700">Stays</span>
            </span>
            {/* Two lines, not three: the break moved after "perfect" so the
                headline reads as a pair of balanced lines at this smaller
                size instead of three short stubs. */}
            <h1 className="text-2xl font-bold leading-[1.12] tracking-tight text-gray-900 sm:text-3xl lg:text-[2.125rem]">
              Find your perfect
              <br />
              <span className="text-brand-700">sanctuary</span>
            </h1>
            {/* Single line from `sm` up; still wraps on the narrowest phones,
                where forcing one line would overflow or shrink it past
                readable. */}
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500 sm:whitespace-nowrap sm:text-xs">
              Handpicked stays for mindful travellers — from Himalayan retreats to coastal hideaways.
            </p>
          </div>

          {/* Promotion carousel — real listings from the already-fetched
              catalog, same props the collage it replaced consumed. */}
          <div className="order-1 lg:order-2">
            <HeroCarousel listings={featuredListings} stayCount={stayCount} />
          </div>
        </div>

        {/* Search strip — capped and centred rather than spanning the full
            container. EXPLORE_CONTAINER_CLASS has no max-width, so at full
            bleed the five fields stretched to ~1800px on a wide monitor and
            the strip read as a page-wide band instead of a search control. */}
        <div className="relative mx-auto mt-3 w-full max-w-5xl lg:mt-3">
          {/* Fully pill-shaped once it is a single row; `rounded-3xl` while the
              fields are stacked, where a stadium radius on a tall column reads
              as a mistake rather than a shape. */}
          <div className="flex flex-col overflow-visible rounded-3xl border border-gray-200 bg-white shadow-glass md:flex-row md:items-stretch md:rounded-full">
            {/* Destination — the one real, fully-wired field */}
            <div
              ref={searchBoxRef}
              /* Extra left padding at md+ keeps the label clear of the bar's
                 stadium curve, which eats into the first ~28px. */
              className="relative min-w-0 flex-[1.6] border-b border-gray-100 px-5 py-2 md:border-b-0 md:border-r md:py-2 md:pl-8"
            >
              <label htmlFor="hero-destination" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
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
                  /* Sized on the input itself rather than as a `placeholder:`-only
                     size, so the text does not jump larger the moment someone
                     starts typing. */
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
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

            {/* Dates — decorative, local-only (see docblock). One control for
                both ends of the stay: the two pills share a single range
                calendar, which is what lets the nights between them be drawn
                as a continuous band. */}
            <div className="min-w-0 flex-[1.8] border-b border-gray-100 px-2 py-1.5 md:border-b-0 md:border-r">
              <StayDateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={({ checkIn: nextIn, checkOut: nextOut }) => {
                  setCheckIn(nextIn);
                  setCheckOut(nextOut);
                }}
              />
            </div>

            {/* Guests — decorative, local-only (see docblock). Popover-free, so
                it aligns right without risk of clipping. */}
            <div className="flex min-w-0 flex-[0.7] items-center border-b border-gray-100 px-5 py-2 md:border-b-0 md:border-r md:py-2">
              <GuestStepper label="Guests" value={adults} onChange={setAdults} min={1} max={8} />
            </div>

            {/* Submit — reuses the real runSearch via onSubmit.
                Icon-only, so the visible label is gone and `aria-label` is now
                the button's entire accessible name; `title` gives sighted
                pointer users the same word on hover. The pulsing icon carries
                the loading state the "Searching…" text used to. */}
            <div className="flex items-center p-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={searching}
                aria-label={searching ? 'Searching' : 'Search stays'}
                title={searching ? 'Searching…' : 'Search'}
                className="btn-primary w-full rounded-full px-0 py-3 md:h-10 md:w-10 md:shrink-0 md:py-0"
              >
                <IconSearch className={`h-5 w-5 shrink-0 ${searching ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
