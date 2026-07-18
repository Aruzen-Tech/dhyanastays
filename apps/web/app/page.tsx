'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngBounds } from 'leaflet';
import dynamic from 'next/dynamic';
import ListingCard from '../components/ListingCard';
import { listingsApi } from '../lib/api';
import type { DiscoverySort, Listing, Tag } from '../lib/types';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from '../lib/types';

const ListingMap = dynamic(() => import('../components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading map...</span>
    </div>
  ),
});

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type ViewMode = 'grid' | 'map' | 'split';

type SearchSuggestion = {
  label: string;
  value: string;
  type: 'Stay' | 'City' | 'State';
  secondary?: string;
};

function MapStatusOverlay({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
}) {
  if (!loading && !error && !empty) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
      <div className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
        {loading && (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="spinner h-4 w-4 text-brand-700" />
            Searching this map area...
          </div>
        )}

        {!loading && error && (
          <div className="text-red-600">
            Unable to load stays for this area.
          </div>
        )}

        {!loading && !error && empty && (
          <div className="text-gray-600">
            No stays found in this map area. Move or zoom the map to explore.
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [mapListings, setMapListings] = useState<Listing[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [hasLoadedMapBounds, setHasLoadedMapBounds] = useState(false);
  const mapRequestId = useRef(0);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [urlStateReady, setUrlStateReady] = useState(false);

  // Filter state
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterGuests, setFilterGuests] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Discovery facets (§5.18) — server-side
  const [filterExperienceTags, setFilterExperienceTags] = useState<string[]>([]);
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterDietary, setFilterDietary] = useState<string[]>([]);
  const [filterSort, setFilterSort] = useState<DiscoverySort | ''>('');

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const urlSearch = params.get('q')?.trim() ?? '';
    const urlView = params.get('view');

    if (urlSearch) {
      setSearch(urlSearch);
    }

    if (
      urlView === 'grid' ||
      urlView === 'map' ||
      urlView === 'split'
    ) {
      setViewMode(urlView);
    }

    setUrlStateReady(true);
  }, []);

  useEffect(() => {
    if (!urlStateReady) return;

    const params = new URLSearchParams(window.location.search);
    const normalizedSearch = debouncedSearch.trim();

    if (normalizedSearch) {
      params.set('q', normalizedSearch);
    } else {
      params.delete('q');
    }

    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }

    const query = params.toString();

    const nextUrl =
      `${window.location.pathname}` +
      `${query ? `?${query}` : ''}` +
      `${window.location.hash}`;

    window.history.replaceState(
      window.history.state,
      '',
      nextUrl,
    );
  }, [debouncedSearch, viewMode, urlStateReady]);

  const visibleMapListings = useMemo(() => {
    const resultIds = new Set(results.map((listing) => listing.id));

    return mapListings.filter((listing) => resultIds.has(listing.id));
  }, [mapListings, results]);

  const showMapEmptyState =
    hasLoadedMapBounds &&
    !mapLoading &&
    !mapError &&
    visibleMapListings.length === 0;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterMaxPrice) n++;
    if (filterGuests) n++;
    if (filterState) n++;
    n += filterTags.length;
    n += filterExperienceTags.length;
    if (filterPropertyType) n++;
    n += filterDietary.length;
    if (filterSort) n++;
    return n;
  }, [
    filterMaxPrice,
    filterGuests,
    filterState,
    filterTags,
    filterExperienceTags,
    filterPropertyType,
    filterDietary,
    filterSort,
  ]);

  const uniqueStates = useMemo(
    () => [...new Set(allListings.map((l) => l.state).filter(Boolean))].sort(),
    [allListings],
  );

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = search.trim().toLowerCase();

    if (query.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    const addSuggestion = (suggestion: SearchSuggestion) => {
      const key = `${suggestion.type}:${suggestion.value.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(suggestion);
      }
    };

    allListings.forEach((listing) => {
      if (listing.title.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.title,
          value: listing.title,
          type: 'Stay',
          secondary: `${listing.city}, ${listing.state}`,
        });
      }
    });

    allListings.forEach((listing) => {
      if (listing.city.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.city,
          value: listing.city,
          type: 'City',
          secondary: listing.state,
        });
      }
    });

    allListings.forEach((listing) => {
      if (listing.state.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.state,
          value: listing.state,
          type: 'State',
          secondary: listing.country,
        });
      }
    });

    return suggestions.slice(0, 6);
  }, [allListings, search]);

  const tagsByCategory = useMemo(() => {
    const map: Record<string, Tag[]> = {};
    allTags.forEach((t) => {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    });
    return map;
  }, [allTags]);

  // Initial load
  useEffect(() => {
    Promise.all([
      listingsApi.getPublic(),
      listingsApi.getTags().catch(() => [] as Tag[]),
    ]).then(([listings, tags]) => {
      setAllListings(listings);
      setResults(listings);
      setMapListings(listings);
      setAllTags(tags);
    }).catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasDiscoveryFacets = useMemo(
    () =>
      filterExperienceTags.length > 0 ||
      !!filterPropertyType ||
      filterDietary.length > 0 ||
      !!filterSort,
    [filterExperienceTags, filterPropertyType, filterDietary, filterSort],
  );

  // Apply client-side filters on top of search results
  const applyFilters = useCallback((base: Listing[]) => {
    let out = base;
    if (filterState) {
      out = out.filter((l) => l.state.toLowerCase() === filterState.toLowerCase());
    }
    if (filterGuests) {
      const g = parseInt(filterGuests, 10);
      out = out.filter((l) => (l.rateRules?.[0]?.maxGuests ?? 0) >= g);
    }
    if (filterMaxPrice) {
      const maxPaise = parseFloat(filterMaxPrice) * 100;
      out = out.filter((l) => (l.rateRules?.[0]?.baseNightlyRate ?? Infinity) <= maxPaise);
    }
    if (filterTags.length > 0) {
      out = out.filter((l) =>
        filterTags.every((tagId) =>
          l.tags?.some((lt) => lt.tagId === tagId),
        ),
      );
    }
    return out;
  }, [filterState, filterGuests, filterMaxPrice, filterTags]);

  const handleMapBoundsChange = useCallback(async (bounds: LatLngBounds) => {
    const requestId = ++mapRequestId.current;
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    setMapLoading(true);
    setMapError('');

    try {
      const listings = await listingsApi.getByBounds(
        southWest.lat,
        southWest.lng,
        northEast.lat,
        northEast.lng,
      );

      if (requestId === mapRequestId.current) {
        setMapListings(listings);
        setHasLoadedMapBounds(true);
      }
    } catch (error) {
      if (requestId === mapRequestId.current) {
        setMapError(
          error instanceof Error
            ? error.message
            : 'Unable to load listings for this map area.',
        );
        setHasLoadedMapBounds(true);
      }
    } finally {
      if (requestId === mapRequestId.current) {
        setMapLoading(false);
      }
    }
  }, []);

  // Search via API (Meilisearch with DB fallback) or facet-driven discovery
  const runSearch = useCallback(async (q: string) => {
    const useDiscovery = hasDiscoveryFacets || !!q.trim();
    if (!useDiscovery) {
      setResults(applyFilters(allListings));
      return;
    }
    setSearching(true);
    try {
      if (hasDiscoveryFacets) {
        const data = await listingsApi.getPublic({
          q: q.trim() || undefined,
          experienceTags: filterExperienceTags.length ? filterExperienceTags : undefined,
          propertyType: filterPropertyType || undefined,
          dietaryOptions: filterDietary.length ? filterDietary : undefined,
          sort: filterSort || undefined,
        });
        setResults(applyFilters(data));
      } else {
        const data = await listingsApi.search(q);
        setResults(applyFilters(data));
      }
    } catch {
      const lower = q.toLowerCase();
      setResults(
        applyFilters(allListings.filter(
          (l) =>
            l.title.toLowerCase().includes(lower) ||
            l.city.toLowerCase().includes(lower) ||
            l.state.toLowerCase().includes(lower) ||
            l.description.toLowerCase().includes(lower),
        )),
      );
    } finally {
      setSearching(false);
    }
  }, [
    allListings,
    applyFilters,
    hasDiscoveryFacets,
    filterExperienceTags,
    filterPropertyType,
    filterDietary,
    filterSort,
  ]);

  useEffect(() => {
    void runSearch(debouncedSearch);
  }, [debouncedSearch, runSearch]);

  // Re-apply filters when filter values change without new search
  useEffect(() => {
    if (!debouncedSearch.trim() && !hasDiscoveryFacets) {
      setResults(applyFilters(allListings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, filterGuests, filterMaxPrice, filterTags, allListings, hasDiscoveryFacets]);

  const clearFilters = () => {
    setFilterMaxPrice('');
    setFilterGuests('');
    setFilterState('');
    setFilterTags([]);
    setFilterExperienceTags([]);
    setFilterPropertyType('');
    setFilterDietary([]);
    setFilterSort('');
  };

  const toggleTag = (tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const toggleExperience = (tag: string) => {
    setFilterExperienceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleDietary = (option: string) => {
    setFilterDietary((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option],
    );
  };

  const formatFacet = (s: string) =>
    s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 rounded-full bg-gold-500 blur-3xl" />
        </div>
        <div className="container-page relative py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span>✨</span>
            <span>Curated wellness retreats across India</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
            Find your perfect
            <br />
            <span className="text-gold-400">sanctuary</span>
          </h1>
          <p className="text-brand-100 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Handpicked stays for mindful travellers — from Himalayan retreats to coastal hideaways.
          </p>
          <div className="max-w-lg mx-auto">
            <div ref={searchBoxRef} className="relative">
              <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-lg text-gray-400">
                {searching ? '⏳' : '🔍'}
              </span>

              <input
                type="text"
                placeholder="Search by city, state, or keyword..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
                aria-label="Search stays"
                aria-expanded={showSuggestions && searchSuggestions.length > 0}
                className="w-full rounded-2xl border-0 py-4 pl-11 pr-4 text-base text-gray-900 shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />

              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl">
                  <div className="py-2">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.value}`}
                        type="button"
                        onClick={() => {
                          setSearch(suggestion.value);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {suggestion.label}
                          </p>

                          {suggestion.secondary && (
                            <p className="truncate text-sm text-gray-500">
                              {suggestion.secondary}
                            </p>
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
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="container-page py-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {search ? `Results for "${search}"` : 'All Stays'}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading || searching ? 'Searching...' : `${results.length} curated ${results.length === 1 ? 'stay' : 'stays'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(search || activeFilterCount > 0) && (
              <button
                onClick={() => { setSearch(''); clearFilters(); }}
                className="btn-ghost text-sm"
              >
                Clear all
              </button>
            )}

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showFilters || activeFilterCount > 0
                ? 'bg-brand-700 text-white border-brand-700'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-brand-700 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View mode toggle */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Map view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Split view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 5v14M4 5l8 7m8-7v14m0-14l-8 7m0 0v7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* State filter */}
              <div>
                <label className="label text-xs">State</label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All states</option>
                  {uniqueStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Guests filter */}
              <div>
                <label className="label text-xs">Minimum guests</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Any"
                  value={filterGuests}
                  onChange={(e) => setFilterGuests(e.target.value)}
                  className="input text-sm"
                />
              </div>

              {/* Max price */}
              <div>
                <label className="label text-xs">Max price per night (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  placeholder="Any"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  className="input text-sm"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="label text-xs">Sort by</label>
                <select
                  value={filterSort}
                  onChange={(e) => setFilterSort(e.target.value as DiscoverySort | '')}
                  className="input text-sm"
                >
                  <option value="">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </div>
            </div>

            {/* Experience tag facets */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Experience</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleExperience(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterExperienceTags.includes(tag)
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                      }`}
                  >
                    {formatFacet(tag)}
                  </button>
                ))}
              </div>
            </div>

            {/* Property type facet */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Property type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterPropertyType('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filterPropertyType
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                    }`}
                >
                  Any
                </button>
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setFilterPropertyType(pt)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterPropertyType === pt
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                      }`}
                  >
                    {formatFacet(pt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary facets */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Dietary options</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleDietary(option)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterDietary.includes(option)
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                      }`}
                  >
                    {formatFacet(option)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag filters by category */}
            {Object.keys(tagsByCategory).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3">Amenities &amp; Features</p>
                <div className="space-y-3">
                  {Object.entries(tagsByCategory).map(([category, tags]) => (
                    <div key={category}>
                      <p className="text-xs text-gray-400 mb-1.5 capitalize">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterTags.includes(tag.id)
                              ? 'bg-brand-700 text-white border-brand-700'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-700'
                              }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button onClick={clearFilters} className="btn-ghost text-sm text-gray-500">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert-error mb-6">
            Could not load listings: {error}
            <span className="block text-xs mt-1 opacity-70">Make sure the API is running on port 3001.</span>
          </div>
        )}

        {(loading || searching) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !searching && !error && results.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏕️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {search || activeFilterCount > 0 ? 'No stays match your filters' : 'No stays available yet'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {search || activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'Check back soon — our curators are adding new retreats.'}
            </p>
            {(search || activeFilterCount > 0) && (
              <button onClick={() => { setSearch(''); clearFilters(); }} className="btn-primary mt-6">
                Browse all stays
              </button>
            )}
          </div>
        )}

        {!loading && !searching && results.length > 0 && (
          <>
            {/* Grid view */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Map view */}
            {viewMode === 'map' && (
              <div className="relative">
                <ListingMap
                  listings={visibleMapListings}
                  height="600px"
                  onBoundsChange={handleMapBoundsChange}
                />

                <MapStatusOverlay
                  loading={mapLoading}
                  error={mapError}
                  empty={showMapEmptyState}
                />
              </div>
            )}

            {/* Split view */}
            {viewMode === 'split' && (
              <div className="flex gap-6" style={{ minHeight: '600px' }}>
                <div className="relative w-1/2 flex-shrink-0">
                  <ListingMap
                    listings={visibleMapListings}
                    height="600px"
                    selectedId={hoveredId}
                    onBoundsChange={handleMapBoundsChange}
                  />

                  <MapStatusOverlay
                    loading={mapLoading}
                    error={mapError}
                    empty={showMapEmptyState}
                  />
                </div>
                <div
                  className="w-1/2 overflow-y-auto pr-1"
                  style={{ maxHeight: '600px' }}
                >
                  {mapLoading && visibleMapListings.length === 0 ? (
                    <div className="flex min-h-[600px] items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-center">
                      <div>
                        <span className="spinner mb-3 h-5 w-5 text-brand-700" />
                        <p className="text-sm font-medium text-gray-700">
                          Searching this map area...
                        </p>
                      </div>
                    </div>
                  ) : mapError && visibleMapListings.length === 0 ? (
                    <div className="flex min-h-[600px] items-center justify-center rounded-xl border border-red-200 bg-white px-6 text-center">
                      <div>
                        <div className="mb-3 text-3xl">⚠️</div>
                        <p className="font-medium text-gray-900">
                          Unable to load stays
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Move the map or try again shortly.
                        </p>
                      </div>
                    </div>
                  ) : visibleMapListings.length === 0 ? (
                    <div className="flex min-h-[600px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center">
                      <div>
                        <div className="mb-3 text-4xl">🗺️</div>
                        <p className="font-medium text-gray-900">
                          No stays in this area
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Move or zoom the map to explore another location.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visibleMapListings.map((listing) => (
                        <div
                          key={listing.id}
                          onMouseEnter={() => setHoveredId(listing.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <ListingCard listing={listing} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Features section */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Why Dhyana Stays?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🌿',
                title: 'Curated by experts',
                desc: 'Every property is personally vetted by our wellness curators for authenticity and quality.',
              },
              {
                icon: '🔒',
                title: 'Secure bookings',
                desc: 'Razorpay-powered payments with full/deposit options and transparent refund policies.',
              },
              {
                icon: '🤝',
                title: 'Host community',
                desc: 'Join our network of conscious hosts and earn with weekly payouts and full transparency.',
              },
            ].map((f) => (
              <div key={f.title} className="text-center p-6">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
