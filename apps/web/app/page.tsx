'use client';

import { useCallback, useEffect, useState } from 'react';
import ListingCard from '../components/ListingCard';
import { listingsApi } from '../lib/api';
import type { Listing } from '../lib/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function HomePage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 350);

  // Initial load
  useEffect(() => {
    listingsApi
      .getPublic()
      .then((data) => {
        setAllListings(data);
        setResults(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Search via API (Meilisearch with DB fallback)
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(allListings);
      return;
    }
    setSearching(true);
    try {
      const data = await listingsApi.search(q);
      setResults(data);
    } catch {
      // Fallback to client-side filter on search API error
      const lower = q.toLowerCase();
      setResults(
        allListings.filter(
          (l) =>
            l.title.toLowerCase().includes(lower) ||
            l.city.toLowerCase().includes(lower) ||
            l.state.toLowerCase().includes(lower) ||
            l.description.toLowerCase().includes(lower),
        ),
      );
    } finally {
      setSearching(false);
    }
  }, [allListings]);

  useEffect(() => {
    void runSearch(debouncedSearch);
  }, [debouncedSearch, runSearch]);

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
                placeholder="Search by city, state, or keyword…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 rounded-2xl text-gray-900 text-base shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-gold-500/50 border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Listings grid */}
      <section className="container-page py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {search ? `Results for "${search}"` : 'All Stays'}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading || searching ? 'Searching…' : `${results.length} curated ${results.length === 1 ? 'stay' : 'stays'}`}
            </p>
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost text-sm">
              Clear search
            </button>
          )}
        </div>

        {error && (
          <div className="alert-error mb-6">
            ⚠️ Could not load listings: {error}
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
              {search ? 'No stays match your search' : 'No stays available yet'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {search
                ? 'Try a different keyword or browse all stays.'
                : 'Check back soon — our curators are adding new retreats.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="btn-primary mt-6">Browse all stays</button>
            )}
          </div>
        )}

        {!loading && !searching && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
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
