'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeatures } from '../../context/FeatureContext';
import {
  IconCalendarDays,
  IconHeart,
  IconHeroSearch,
  IconLeaf,
  IconShieldCheck,
  IconSparkles,
  IconUsersHero,
} from './icons';

export default function DiscoverHero() {
  const router = useRouter();
  const { isEnabled } = useFeatures();
  const [heroSearch, setHeroSearch] = useState('');

  return (
    <section className="relative bg-surface pt-10 md:pt-16 pb-8 md:pb-12 overflow-hidden">
      {/* Decorative soft blobs */}
      <div className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-24 -right-32 w-[380px] h-[380px] rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />

      <div className="relative container-page grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left: copy */}
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-card mb-5 sm:mb-6">
            <IconSparkles className="text-orange-500" />
            <span className="text-xs font-semibold text-gray-900 tracking-wide uppercase">
              India&apos;s Premier Curated Stays
            </span>
          </span>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] text-gray-900 mb-4 sm:mb-6 max-w-xl">
            Stays You&apos;ll Fall In Love With{' '}
            <span className="text-orange-500">From the First Glance</span>
          </h1>

          <p className="text-gray-500 text-sm sm:text-base lg:text-lg max-w-lg mb-6 sm:mb-8 leading-relaxed">
            Architect-inspected properties, warm local hospitality, and
            experiences designed to feel like home — curated across India&apos;s
            most beautiful destinations.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-8 sm:mb-10">
            <Link
              href="/stays"
              className="px-6 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold bg-orange-500 text-white rounded-full shadow-card hover:bg-orange-600 hover:-translate-y-0.5 transition-all"
            >
              Explore Stays
            </Link>
            {isEnabled('ai_itinerary') && (
              <Link
                href="/itineraries"
                className="flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold bg-white border border-brand-700 text-brand-700 rounded-full hover:bg-brand-700 hover:text-white transition-all"
              >
                <IconSparkles />
                Plan My Trip with AI
              </Link>
            )}
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { Icon: IconShieldCheck, label: 'Architect Curated' },
              { Icon: IconHeart, label: 'Loved by Guests' },
              { Icon: IconLeaf, label: 'Sustainably Built' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-start gap-2">
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                  <f.Icon />
                </span>
                <span className="text-xs font-medium text-gray-900 leading-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: image */}
        <div className="relative">
          <div className="relative rounded-[40px] rounded-tr-[100px] overflow-hidden shadow-card aspect-[4/5] max-w-[280px] sm:max-w-md mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1400&auto=format&fit=crop"
              alt="A curated Dhyana Stays property nestled in nature"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          {/* floating badge */}
          <div className="absolute bottom-4 left-4 sm:bottom-6 bg-white rounded-3xl shadow-card px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              <IconShieldCheck />
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                100% Curated
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500">Every stay inspected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating search bar — submitting hands off to Explore Stays, which
          reads the same `q` param back out (see stays/page.tsx) and runs it
          through the existing search endpoint there, rather than searching
          inline on this page the way the previous hero did. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const q = heroSearch.trim();
          router.push(q ? `/stays?q=${encodeURIComponent(q)}` : '/stays');
        }}
        className="relative max-w-4xl mx-auto px-6 mt-8 sm:mt-10 lg:mt-14"
      >
        <div className="bg-white rounded-[28px] shadow-card p-2">
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 md:px-5 rounded-[18px] bg-surface">
              <IconHeroSearch className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={heroSearch}
                onChange={(event) => setHeroSearch(event.target.value)}
                placeholder="Where do you want to go?"
                aria-label="Search stays"
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 md:px-5 rounded-[18px] bg-surface">
              <IconCalendarDays className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400 whitespace-nowrap">
                Check-in — Check-out
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 md:px-5 rounded-[18px] bg-surface">
              <IconUsersHero className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400">Guests</span>
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-8 py-3 bg-orange-500 text-white font-semibold text-sm rounded-[18px] hover:bg-orange-600 transition-colors whitespace-nowrap"
            >
              <IconHeroSearch className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
