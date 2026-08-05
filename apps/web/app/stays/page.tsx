'use client';

/**
 * Explore Stays — search, filter and map browsing over the public listing
 * catalog. UI modeled on the ReferenceUI design brief; every data source below
 * is an existing, unmodified endpoint:
 *
 *   listingsApi.getPublic()   → GET /listings          (full APPROVED catalog)
 *   listingsApi.search(q)     → GET /listings/search    (Meilisearch + DB fallback)
 *   listingsApi.getByBounds() → GET /listings/map       (viewport-scoped, for Show Map)
 *
 * Text search calls the real search endpoint to get the set of matching ids
 * (and their relevance order); every other filter — destination, property
 * type, wellness focus, amenities, price, guests — is computed client-side
 * over the already-fetched catalog, exactly the way this app's existing
 * Discover page already layers client-side refinements on top of a
 * server-fetched list. No backend file was created or changed for this page.
 *
 * Two things shown in the reference design have no backing capability and are
 * intentionally omitted rather than faked: a "Trending" toggle (no such flag
 * exists on Listing) and a "Top Rated" sort (the discovery response carries no
 * aggregate rating). Pagination controls are also omitted — the listing feed
 * returns its full result set with no page/limit/total, so paging controls
 * would have nothing to do.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { LatLngBounds } from 'leaflet';
import ListingCard from '../../components/ListingCard';
import { listingsApi } from '../../lib/api';
import type { Listing } from '../../lib/types';

const ListingMap = dynamic(() => import('../../components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading map…</span>
    </div>
  ),
});

// ─── Small local helpers ──────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Tracks whether the viewport is at/above the `lg` breakpoint (1024px, same
 * cutoff the desktop map layout already uses). The map view (desktop sidebar
 * vs. mobile full-screen overlay, see below) needs this in JS rather than
 * pure CSS: react-leaflet's `MapContainer` measures its container's size at
 * mount time and doesn't self-correct if that container is `display:none`
 * (a well-known Leaflet gotcha), so simply rendering both a
 * `hidden lg:block` desktop map AND an `lg:hidden` mobile map at once would
 * mean one of the two is always mounted invisibly — silently fetching map
 * tiles nobody sees. Gating on this instead ensures exactly one `ListingMap`
 * instance ever exists in the DOM, matching whichever layout is actually
 * visible.
 */
function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

/** 'boutique-hotel' → 'Boutique Hotel' — display formatting only. */
function formatLabel(value: string): string {
  return value
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Windowed page-number list for the numbered pagination bar, e.g.
 * `[1, 2, 3, 4, 'ellipsis', 15]` when on page 1 of 15. Collapses to every
 * page with no ellipsis once the total is small enough to just show in full.
 */
function getPaginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 'ellipsis', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

// ─── Icons — inline SVG, matching the app's existing hand-authored convention
// (Navbar's chevron/hamburger icons use the same stroke="currentColor" style).

function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconSliders({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
function IconMap({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function IconX({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconSparkles({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  );
}

// ─── Price buckets — client-side only; rateRules.baseNightlyRate is stored in
// paise app-wide, so the comparison converts to rupees to match the ₹ labels.

type PriceBucket = 'any' | 'under-5k' | '5k-10k' | '10k-20k' | 'above-20k';

const PRICE_BUCKETS: { key: PriceBucket; label: string; test: (rupees: number) => boolean }[] = [
  { key: 'any', label: 'Any price', test: () => true },
  { key: 'under-5k', label: 'Under ₹5,000', test: (p) => p < 5000 },
  { key: '5k-10k', label: '₹5,000 – ₹10,000', test: (p) => p >= 5000 && p <= 10000 },
  { key: '10k-20k', label: '₹10,000 – ₹20,000', test: (p) => p > 10000 && p <= 20000 },
  { key: 'above-20k', label: 'Above ₹20,000', test: (p) => p > 20000 },
];

type SortKey = 'recommended' | 'price-low' | 'price-high';
const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
};

interface AmenityOption {
  id: string;
  name: string;
}

export default function ExploreStaysPage() {
  // ── Base catalog ──────────────────────────────────────────────────────────
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listingsApi
      .getPublic()
      .then((data) => {
        if (!cancelled) setAllListings(data);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load stays right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  // ── Text search — real backend search endpoint, id-set + relevance order ──
  // Seeded from `?q=` when arriving from the Discover page's hero search bar,
  // which navigates here instead of searching inline. The rest of the search
  // pipeline below (debounce → listingsApi.search()) is unchanged — this only
  // provides the initial value.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 350);
  const [searching, setSearching] = useState(false);
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string> | null>(null);
  const [searchOrder, setSearchOrder] = useState<string[]>([]);
  const searchRequestId = useRef(0);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      searchRequestId.current++;
      setSearchMatchIds(null);
      setSearchOrder([]);
      setSearching(false);
      return;
    }
    const requestId = ++searchRequestId.current;
    setSearching(true);
    listingsApi
      .search(q)
      .then((results) => {
        if (requestId !== searchRequestId.current) return; // superseded by a newer query
        setSearchMatchIds(new Set(results.map((r) => r.id)));
        setSearchOrder(results.map((r) => r.id));
      })
      .catch(() => {
        if (requestId !== searchRequestId.current) return;
        // Fail open: a transient search error shouldn't hide the whole catalog.
        setSearchMatchIds(null);
        setSearchOrder([]);
      })
      .finally(() => {
        if (requestId === searchRequestId.current) setSearching(false);
      });
  }, [debouncedSearch]);

  // ── Category chips, sort, map, filter drawer ────────────────────────────
  // Seeded from `?type=` when arriving from the Discover page's Categories
  // section, same pattern as `?q=` above.
  const [activePropertyType, setActivePropertyType] = useState(
    () => searchParams.get('type') ?? 'all',
  );
  const [showMap, setShowMap] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('recommended');
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [priceBucket, setPriceBucket] = useState<PriceBucket>('any');
  const [minGuests, setMinGuests] = useState(1);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedExperienceTags, setSelectedExperienceTags] = useState<string[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);

  const toggleIn =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
      setter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  const toggleDestination = toggleIn(setSelectedDestinations);
  const toggleExperienceTag = toggleIn(setSelectedExperienceTags);
  const toggleAmenity = toggleIn(setSelectedAmenityIds);

  const clearFilters = () => {
    setPriceBucket('any');
    setMinGuests(1);
    setSelectedDestinations([]);
    setSelectedExperienceTags([]);
    setSelectedAmenityIds([]);
  };

  const activeFilterCount =
    (priceBucket !== 'any' ? 1 : 0) +
    (minGuests > 1 ? 1 : 0) +
    selectedDestinations.length +
    selectedExperienceTags.length +
    selectedAmenityIds.length;

  // ── Filter option vocabularies — derived from the live catalog, so a chip
  // only ever appears when at least one listing can actually match it. ──────
  const destinationOptions = useMemo(
    () => Array.from(new Set(allListings.map((l) => l.city).filter(Boolean))).sort(),
    [allListings],
  );
  const propertyTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(allListings.map((l) => l.propertyType).filter((v): v is string => Boolean(v))),
      ).sort(),
    [allListings],
  );
  const experienceTagOptions = useMemo(
    () => Array.from(new Set(allListings.flatMap((l) => l.experienceTags ?? []))).sort(),
    [allListings],
  );
  /** Real Tag rows in the 'facilities' category — the closest existing analogue to "amenities". */
  const amenityOptions = useMemo<AmenityOption[]>(() => {
    const byId = new Map<string, string>();
    for (const listing of allListings) {
      for (const listingTag of listing.tags ?? []) {
        if (listingTag.tag.category === 'facilities') byId.set(listingTag.tag.id, listingTag.tag.name);
      }
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allListings]);

  const priceTest = PRICE_BUCKETS.find((b) => b.key === priceBucket)!.test;

  const filtered = useMemo(() => {
    let list = allListings.filter((listing) => {
      if (searchMatchIds && !searchMatchIds.has(listing.id)) return false;
      if (activePropertyType !== 'all' && listing.propertyType !== activePropertyType) return false;

      const rupees = (listing.rateRules?.[0]?.baseNightlyRate ?? 0) / 100;
      if (!priceTest(rupees)) return false;

      const maxGuests = listing.rateRules?.[0]?.maxGuests ?? 0;
      if (minGuests > 1 && maxGuests < minGuests) return false;

      if (selectedDestinations.length > 0 && !selectedDestinations.includes(listing.city)) return false;

      if (selectedExperienceTags.length > 0) {
        const tags = listing.experienceTags ?? [];
        if (!selectedExperienceTags.every((t) => tags.includes(t))) return false;
      }

      if (selectedAmenityIds.length > 0) {
        const listingAmenityIds = (listing.tags ?? [])
          .filter((lt) => lt.tag.category === 'facilities')
          .map((lt) => lt.tag.id);
        if (!selectedAmenityIds.every((id) => listingAmenityIds.includes(id))) return false;
      }

      return true;
    });

    if (sortBy === 'price-low') {
      list = [...list].sort(
        (a, b) => (a.rateRules?.[0]?.baseNightlyRate ?? 0) - (b.rateRules?.[0]?.baseNightlyRate ?? 0),
      );
    } else if (sortBy === 'price-high') {
      list = [...list].sort(
        (a, b) => (b.rateRules?.[0]?.baseNightlyRate ?? 0) - (a.rateRules?.[0]?.baseNightlyRate ?? 0),
      );
    } else if (searchOrder.length > 0) {
      // Preserve the search endpoint's own relevance ranking.
      const rank = new Map(searchOrder.map((id, i) => [id, i]));
      list = [...list].sort(
        (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    // Otherwise: the catalog's own order (server-side newest-first) stands.

    return list;
  }, [
    allListings,
    searchMatchIds,
    searchOrder,
    activePropertyType,
    priceTest,
    minGuests,
    selectedDestinations,
    selectedExperienceTags,
    selectedAmenityIds,
    sortBy,
  ]);

  // ── Pagination — client-side, since listingsApi.getPublic() already returns
  // the full APPROVED catalog in one response (no server-side page/offset
  // param exists to reuse). Resets to page 1 whenever the filtered set could
  // have changed, using the exact same dependencies `filtered` itself uses.
  const PER_PAGE = 5;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [
    allListings,
    searchMatchIds,
    searchOrder,
    activePropertyType,
    priceTest,
    minGuests,
    selectedDestinations,
    selectedExperienceTags,
    selectedAmenityIds,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pagedListings = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  // ── Show Map — same viewport-bounds fetch the existing Discover page uses ─
  const [mapListings, setMapListings] = useState<Listing[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const mapRequestId = useRef(0);
  const mapAbortRef = useRef<AbortController | null>(null);

  const handleBoundsChange = useCallback((bounds: LatLngBounds) => {
    mapAbortRef.current?.abort();
    const controller = new AbortController();
    mapAbortRef.current = controller;
    const requestId = ++mapRequestId.current;

    setMapLoading(true);
    setMapError('');
    listingsApi
      .getByBounds(
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
        controller.signal,
      )
      .then((data) => {
        if (requestId !== mapRequestId.current) return;
        setMapListings(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || requestId !== mapRequestId.current) return;
        setMapError('Unable to load stays for this area.');
        void err;
      })
      .finally(() => {
        if (requestId === mapRequestId.current) setMapLoading(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      mapAbortRef.current?.abort();
    };
  }, []);

  const resultCount = filtered.length;
  const hasCatalog = allListings.length > 0;
  const isDesktopViewport = useIsDesktopViewport();

  return (
    <div className="min-h-screen bg-surface">
      {/* Search & Filter Header */}
      <div className="sticky top-16 z-40 bg-surface/95 backdrop-blur border-b border-gray-200 py-5">
        <div className="container-page">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-auto md:flex-1 max-w-xl">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by destination, property name, or theme…"
                aria-label="Search stays"
                className="w-full pl-11 pr-4 py-3 bg-white rounded-full text-sm text-gray-900 placeholder-gray-400 card focus:outline-none focus:ring-2 focus:ring-brand-700/30 transition-shadow"
              />
              {searching && (
                <span className="spinner absolute right-4 top-1/2 -translate-y-1/2 text-brand-700 w-3.5 h-3.5" />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={`relative flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all card-hover ${
                  activeFilterCount > 0 ? 'bg-brand-700 text-white' : 'bg-white text-gray-900'
                }`}
              >
                <IconSliders />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/25 text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                aria-pressed={showMap}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all card-hover ${
                  showMap ? 'bg-brand-700 text-white' : 'bg-white text-gray-900'
                }`}
              >
                <IconMap />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          </div>

          {/* Category chips — property type, single-select, server-supported facet */}
          {propertyTypeOptions.length > 0 && (
            <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActivePropertyType('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  activePropertyType === 'all'
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                All Stays
              </button>
              {propertyTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivePropertyType(type)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                    activePropertyType === type
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {formatLabel(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container-page py-8">
        <div className="flex gap-8">
          {/* Results */}
          <div className={`flex-1 min-w-0 transition-all ${showMap ? 'lg:w-3/5' : 'w-full'}`}>
            {!loading && !error && (
              <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {resultCount} curated {resultCount === 1 ? 'stay' : 'stays'} found
                </h1>
                {hasCatalog && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setSortOpen((v) => !v)}
                      className="flex items-center gap-2 text-sm text-gray-900 font-medium hover:text-brand-700"
                    >
                      Sort by: {SORT_LABELS[sortBy]}
                      <IconChevronDown className={sortOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    {sortOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white glass-card p-1.5 z-20 animate-scale-in">
                          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSortBy(key);
                                setSortOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                                sortBy === key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              {SORT_LABELS[key]}
                              {sortBy === key && <IconCheck />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {selectedDestinations.map((d) => (
                  <FilterChip key={`d-${d}`} label={d} onClear={() => toggleDestination(d)} />
                ))}
                {selectedExperienceTags.map((t) => (
                  <FilterChip key={`e-${t}`} label={formatLabel(t)} onClear={() => toggleExperienceTag(t)} />
                ))}
                {selectedAmenityIds.map((id) => (
                  <FilterChip
                    key={`a-${id}`}
                    label={amenityOptions.find((o) => o.id === id)?.name ?? id}
                    onClear={() => toggleAmenity(id)}
                  />
                ))}
                {priceBucket !== 'any' && (
                  <FilterChip
                    label={PRICE_BUCKETS.find((b) => b.key === priceBucket)!.label}
                    onClear={() => setPriceBucket('any')}
                  />
                )}
                {minGuests > 1 && <FilterChip label={`${minGuests}+ guests`} onClear={() => setMinGuests(1)} />}
                <button type="button" onClick={clearFilters} className="text-xs text-brand-700 hover:underline ml-1">
                  Clear all
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className={`grid gap-6 ${showMap ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <div className="skeleton h-52 rounded-t-2xl" />
                    <div className="p-4 space-y-2 bg-white rounded-b-2xl">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="alert-error flex items-center justify-between gap-4" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setRetryTick((t) => t + 1)}
                  className="btn-secondary text-sm py-1.5 px-3 shrink-0"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Results grid */}
            {!loading && !error && resultCount > 0 && (
              <div
                className={`grid gap-6 ${
                  showMap ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {pagedListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Pagination — only shown once there's more than one page's worth
                of results; hidden entirely for 5 or fewer stays. */}
            {!loading && !error && resultCount > PER_PAGE && (
              <div className="flex items-center justify-center gap-1.5 mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                >
                  <IconChevronLeft />
                </button>

                {getPaginationItems(page, totalPages).map((item, i) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-label={`Page ${item}`}
                      aria-current={item === page ? 'page' : undefined}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        item === page
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                >
                  <IconChevronRight />
                </button>
              </div>
            )}

            {/* Empty states */}
            {!loading && !error && resultCount === 0 && (
              <div className="text-center py-20">
                <IconSparkles className="text-gray-300 mx-auto mb-3" />
                {hasCatalog ? (
                  <>
                    <p className="text-sm text-gray-400">No stays match your filters yet.</p>
                    {(activeFilterCount > 0 || search.trim() || activePropertyType !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          clearFilters();
                          setSearch('');
                          setActivePropertyType('all');
                        }}
                        className="text-sm text-brand-700 hover:underline mt-2"
                      >
                        Clear filters
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No stays are available right now.</p>
                )}
              </div>
            )}
          </div>

          {/* Map — desktop: sits beside the listings, sticky, unchanged from
              before. Mobile: the same "Show Map"/"Hide Map" toggle now opens
              a full-screen map view instead of a `hidden lg:block` container
              that was hiding it unconditionally below 1024px regardless of
              `showMap`. Both branches render the exact same `ListingMap` with
              the same listings/handlers/selection state — only the
              surrounding layout differs — and `isDesktopViewport` (not just a
              CSS class) ensures only one of the two is ever actually mounted
              at a time, see `useIsDesktopViewport` above. */}
          {showMap && isDesktopViewport && (
            <div className="hidden lg:block lg:w-2/5 animate-fade-in">
              <div className="sticky top-[160px] h-[calc(100vh-180px)] rounded-2xl overflow-hidden card">
                <ListingMap
                  listings={mapListings.length > 0 || mapLoading ? mapListings : filtered}
                  onBoundsChange={handleBoundsChange}
                  onListingSelect={setSelectedListingId}
                  selectedId={selectedListingId}
                  height="100%"
                />
                <MapStatusOverlay loading={mapLoading} error={mapError} />
              </div>
            </div>
          )}

          {showMap && !isDesktopViewport && typeof document !== 'undefined' && createPortal(
            <div className="lg:hidden fixed inset-0 z-[70] bg-surface flex flex-col animate-fade-in">
              <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white">
                <p className="text-sm font-semibold text-gray-900">Map View</p>
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  aria-label="Close map"
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <IconX className="w-[18px] h-[18px]" />
                </button>
              </div>

              <div className="relative flex-1 min-h-0">
                <ListingMap
                  listings={mapListings.length > 0 || mapLoading ? mapListings : filtered}
                  onBoundsChange={handleBoundsChange}
                  onListingSelect={setSelectedListingId}
                  selectedId={selectedListingId}
                  height="100%"
                />
                <MapStatusOverlay loading={mapLoading} error={mapError} />
              </div>

              <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
                >
                  Show List
                </button>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </div>

      {/* ================= FILTERS DRAWER ================= */}
      {/*
        Rendered via a portal straight onto document.body.
        Reason: the root layout's <main> carries `animate-fade-in`, whose final
        keyframe is `transform: translateY(0)` — a non-`none` transform that
        Tailwind's `animate-fade-in` retains permanently via
        `animation-fill-mode: both`. Per the CSS spec, ANY non-`none` transform
        turns that element into the containing block for `position: fixed`
        descendants. So a `fixed inset-0` drawer nested under <main> anchors to
        <main>'s full (taller-than-viewport) content box instead of the real
        viewport — the drawer's header/footer end up positioned far down the
        page, only reachable by scrolling the page itself rather than the
        panel's own internal scroll area. Portaling to document.body escapes
        <main> entirely, so `fixed`/`absolute` anchor to the real viewport and
        the header + "Clear all"/"Show N stays" footer stay pinned while only
        the filter options in between scroll. Doesn't touch the shared layout.
      */}
      {filtersOpen && createPortal(
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setFiltersOpen(false)}
        >
          <aside
            className="absolute inset-y-0 right-0 w-full sm:w-[400px] bg-surface shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <p className="text-sm font-semibold text-gray-900">
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <IconX className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
              {/* Destination */}
              {destinationOptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                    <IconMapPin /> Destination
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {destinationOptions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => toggleDestination(city)}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                          selectedDestinations.includes(city)
                            ? 'bg-brand-700 text-white border-brand-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wellness Focus (experienceTags — multi-select, server-supported facet) */}
              {experienceTagOptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Wellness Focus
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {experienceTagOptions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleExperienceTag(tag)}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                          selectedExperienceTags.includes(tag)
                            ? 'bg-brand-700 text-white border-brand-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {formatLabel(tag)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities — real Tag rows in the 'facilities' category */}
              {amenityOptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Amenities</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {amenityOptions.map((amenity) => (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors text-left ${
                          selectedAmenityIds.includes(amenity.id)
                            ? 'border-brand-700 bg-brand-50 text-gray-900'
                            : 'border-gray-200 bg-white text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            selectedAmenityIds.includes(amenity.id)
                              ? 'bg-brand-700 border-brand-700 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedAmenityIds.includes(amenity.id) && <IconCheck />}
                        </span>
                        {amenity.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Price per night</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_BUCKETS.map((bucket) => (
                    <button
                      key={bucket.key}
                      type="button"
                      onClick={() => setPriceBucket(bucket.key)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        priceBucket === bucket.key
                          ? 'bg-brand-700 text-white border-brand-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {bucket.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Guests</p>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white">
                  <span className="flex items-center gap-2 text-sm text-gray-900">
                    <IconUsers className="text-gray-400" /> {minGuests === 1 ? 'Any' : `${minGuests}+ guests`}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Decrease minimum guests"
                      onClick={() => setMinGuests((g) => Math.max(1, g - 1))}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:border-brand-700 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm tabular-nums text-gray-900">{minGuests}</span>
                    <button
                      type="button"
                      aria-label="Increase minimum guests"
                      onClick={() => setMinGuests((g) => Math.min(12, g + 1))}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:border-brand-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex-1 py-3 text-sm font-semibold bg-brand-700 text-white rounded-full hover:bg-brand-800 transition-colors"
              >
                Show {resultCount} {resultCount === 1 ? 'stay' : 'stays'}
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** The map's loading/error pill — identical markup shared by the desktop
 * sidebar map and the mobile full-screen map view. */
function MapStatusOverlay({ loading, error }: { loading: boolean; error: string }) {
  if (!loading && !error) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
      <div className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
        {loading ? (
          <span className="flex items-center gap-2 text-gray-700">
            <span className="spinner h-4 w-4 text-brand-700" /> Searching this map area…
          </span>
        ) : (
          <span className="text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white card text-xs text-gray-900">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
      >
        <IconX />
      </button>
    </span>
  );
}
