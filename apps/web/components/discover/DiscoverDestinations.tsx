'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { destinations } from '../../lib/discover-mock-data';
import { IconArrowRight, IconMapPinDest, IconSearchSm } from './icons';

/**
 * Search-as-you-type over the destination list — the grid re-flows to match.
 * UI-only for now: `destinations` is static mock content (see
 * lib/discover-mock-data.ts), not fetched from a real destinations API.
 */
export default function DiscoverDestinations() {
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <section className="py-8 md:py-14 bg-white">
      <div className="container-page">
        <div className="flex flex-col items-center text-center mb-6 lg:mb-10">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
            Destinations
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">
            Where Will You Go?
          </h2>

          <div className="relative w-full max-w-md mt-4 sm:mt-6">
            <IconSearchSm className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a destination or state…"
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-surface rounded-full text-sm text-gray-900 placeholder-gray-400 shadow-card focus:outline-none focus:ring-2 focus:ring-brand-700/30 transition-shadow"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 sm:mt-3">
            {visible.length} of {destinations.length} destinations
          </p>
        </div>

        {visible.length > 0 ? (
          <div className="relative">
            <div className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide gap-3 -mx-4 px-4 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:snap-none">
              {visible.map((dest) => (
                <Link
                  key={dest.name}
                  href={`/stays?destination=${encodeURIComponent(dest.name.toLowerCase())}`}
                  className="group relative shrink-0 w-[220px] snap-start sm:w-auto min-h-[220px] sm:min-h-[280px] rounded-2xl sm:rounded-[28px] overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <h3 className="text-base sm:text-xl font-semibold text-white group-hover:text-orange-400 transition-colors">
                      {dest.name}
                    </h3>
                    <p className="text-xs text-white/70 mt-1">
                      {dest.state} · {dest.properties} properties
                    </p>
                  </div>
                  <div className="absolute top-3 right-3 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 group-hover:bg-orange-500/30 group-hover:text-white transition-all">
                    <IconArrowRight />
                  </div>
                </Link>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent sm:hidden" />
          </div>
        ) : (
          <div className="text-center py-16">
            <IconMapPinDest className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No destination matches &ldquo;{search}&rdquo; yet — more are added every month.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
