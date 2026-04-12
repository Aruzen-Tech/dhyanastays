'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ListingCard from '../components/ListingCard';
import { listingsApi } from '../lib/api';
import type { Listing, Tag } from '../lib/types';

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

export default function HomePage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterGuests, setFilterGuests] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 350);

  const hasMapListings = useMemo(
    () => results.some((l) => l.latitude && l.longitude),
    [results],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterMaxPrice) n++;
    if (filterGuests) n++;
    if (filterState) n++;
    n += filterTags.length;
    return n;
  }, [filterMaxPrice, filterGuests, filterState, filterTags]);

  const uniqueStates = useMemo(
    () => [...new Set(allListings.map((l) => l.state).filter(Boolean))].sort(),
    [allListings],
  );

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
      setAllTags(tags);
    }).catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  // Search via API (Meilisearch with DB fallback)
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(applyFilters(allListings));
      return;
    }
    setSearching(true);
    try {
      const data = await listingsApi.search(q);
      setResults(applyFilters(data));
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
  }, [allListings, applyFilters]);

  useEffect(() => {
    void runSearch(debouncedSearch);
  }, [debouncedSearch, runSearch]);

  // Re-apply filters when filter values change without new search
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResults(applyFilters(allListings));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, filterGuests, filterMaxPrice, filterTags, allListings]);

  const clearFilters = () => {
    setFilterMaxPrice('');
    setFilterGuests('');
    setFilterState('');
    setFilterTags([]);
  };

  const toggleTag = (tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

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
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                {searching ? '⏳' : '🔍'}
              </span>
              <input
                type="text"
                placeholder="Search by city, state, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 rounded-2xl text-gray-900 text-base shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-gold-500/50 border-0"
              />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                showFilters || activeFilterCount > 0
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
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Map view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              filterTags.includes(tag.id)
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
              <div>
                {hasMapListings ? (
                  <ListingMap listings={results} height="600px" />
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <div className="text-5xl mb-3">🗺️</div>
                    <p className="text-gray-500">No listings with location data available for map view.</p>
                    <button onClick={() => setViewMode('grid')} className="btn-primary mt-4 text-sm">
                      Switch to grid view
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Split view */}
            {viewMode === 'split' && (
              <div className="flex gap-6" style={{ minHeight: '600px' }}>
                <div className="w-1/2 flex-shrink-0">
                  {hasMapListings ? (
                    <ListingMap listings={results} height="600px" selectedId={hoveredId} />
                  ) : (
                    <div className="h-full bg-gray-50 rounded-xl flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No location data available</p>
                    </div>
                  )}
                </div>
                <div className="w-1/2 overflow-y-auto space-y-4 pr-1" style={{ maxHeight: '600px' }}>
                  {results.map((listing) => (
                    <div
                      key={listing.id}
                      onMouseEnter={() => setHoveredId(listing.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <ListingCard listing={listing} />
                    </div>
                  ))}
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
