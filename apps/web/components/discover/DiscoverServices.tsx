'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { experiencesApi, formatINR } from '../../lib/api';
import type { Experience } from '../../lib/types';
import { IconArrowRight, IconMapPinSm } from './icons';

/**
 * Curated Experiences only — reuses the existing, separate experiencesApi
 * (real backend feature, same one /experiences already uses). The Curated
 * Stays tab/content was removed from this section per explicit request;
 * stays browsing still lives on the Discover page's own Listings section
 * and the dedicated /stays page.
 */
export default function DiscoverServices() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    experiencesApi
      .listPublic()
      .then((data) => setExperiences(data))
      .catch(() => setExperiences([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-8 md:py-14 bg-surface">
      <div className="container-page">
        <div className="rounded-2xl sm:rounded-[32px] bg-white p-5 sm:p-8 md:p-12 shadow-card">
          <div className="flex items-end justify-between mb-5 lg:mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
                One platform · Every experience
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">
                Explore Dhyana Services
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-lg">
                Curated experiences — inspected and bookable in one place.
              </p>
            </div>
            <Link
              href="/experiences"
              className="hidden md:flex items-center gap-2 text-sm text-orange-500 hover:underline shrink-0"
            >
              All experiences <IconArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : experiences.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {experiences.slice(0, 4).map((exp) => (
                <Link
                  key={exp.id}
                  href={`/experiences/${exp.id}`}
                  className="group rounded-2xl sm:rounded-[28px] overflow-hidden bg-surface shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="relative h-32 sm:h-40 overflow-hidden bg-brand-50">
                    {exp.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={exp.imageUrl}
                        alt={exp.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        🧘
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-white/90 backdrop-blur-sm text-brand-700 rounded-full">
                      {exp.category.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-brand-700 transition-colors mb-1 line-clamp-1">
                      {exp.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <IconMapPinSm className="shrink-0" />
                      <span className="truncate">{exp.city}, {exp.state}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatINR(exp.priceMinor)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">🧘</div>
              <p className="text-sm">No experiences available right now.</p>
            </div>
          )}

          <div className="mt-6 md:hidden">
            <Link
              href="/experiences"
              className="flex items-center justify-center gap-2 text-sm text-orange-500"
            >
              All experiences <IconArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
