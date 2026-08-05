'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  campaignPhotos,
  seedBallMission,
  topStatesCovered,
  volunteerStories,
} from '../../lib/discover-mock-data';
import {
  IconHandCoins,
  IconHeart,
  IconMapPinSm,
  IconSprout,
  IconTarget,
  IconTreePine,
  IconUsersHero,
  IconWind,
} from './icons';

/** Counts up from 0 to `target` once `active` becomes true — used for the live counter. */
function useCountUp(target: number, active: boolean, durationMs = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);
  return value;
}

/**
 * UI-only campaign showcase: animated live counter, campaign stats, a
 * simplified "states covered" map visual, volunteer stories, recent photos
 * and two CTAs. All figures are static mock content (see
 * lib/discover-mock-data.ts) pending a real campaign-tracking backend.
 */
export default function DiscoverSeedBallMission() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const distributed = useCountUp(seedBallMission.distributed, inView);
  const progressPct = Math.min(100, (seedBallMission.distributed / seedBallMission.goal) * 100);

  const stats = [
    { label: 'Seed Balls Created', value: seedBallMission.created.toLocaleString('en-IN'), Icon: IconSprout },
    { label: 'Trees Estimated', value: seedBallMission.treesEstimated.toLocaleString('en-IN'), Icon: IconTreePine },
    { label: 'CO₂ Offset (tons)', value: seedBallMission.co2OffsetTons.toLocaleString('en-IN'), Icon: IconWind },
    { label: 'Campaign Volunteers', value: seedBallMission.volunteers.toLocaleString('en-IN'), Icon: IconUsersHero },
    { label: 'Donations Collected', value: `₹${(seedBallMission.donationsCollected / 100000).toFixed(1)}L`, Icon: IconHandCoins },
    { label: 'Monthly Target', value: seedBallMission.monthlyTarget.toLocaleString('en-IN'), Icon: IconTarget },
  ];

  return (
    <section ref={sectionRef} className="py-8 md:py-14 bg-white">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
            Our Mission
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            🌱 100 Million Seed Ball Mission
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-3 leading-relaxed">
            Every stay you book helps restore India&apos;s green cover. We&apos;re dispersing 100 million
            seed balls across the country — every traveller, host and partner is part of the journey.
          </p>
        </div>

        {/* Live progress counter */}
        <div className="rounded-2xl sm:rounded-[32px] bg-brand-700 overflow-hidden shadow-card p-6 sm:p-10 lg:p-14 mb-6 md:mb-8">
          <div className="text-center">
            <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">Live Progress</p>
            <p className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mt-2 tabular-nums">
              {distributed.toLocaleString('en-IN')}
            </p>
            <p className="text-white/80 text-sm sm:text-base mt-1">
              of {seedBallMission.goal.toLocaleString('en-IN')} Seed Balls Dispersed
            </p>
          </div>
          <div className="max-w-2xl mx-auto mt-6">
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                style={{ width: `${inView ? progressPct : 0}%` }}
              />
            </div>
            <p className="text-center text-white/70 text-xs mt-2">
              {progressPct.toFixed(1)}% toward the 100 Million goal
            </p>
          </div>
        </div>

        {/* Campaign statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 md:mb-12">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-gray-200 rounded-2xl p-4">
              <s.Icon className="text-brand-700" />
              <p className="text-lg font-bold text-gray-900 mt-2 tabular-nums">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* States covered — simplified interactive map + ranked list */}
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4 sm:gap-6 mb-8 md:mb-12">
          <div className="relative h-64 sm:h-80 rounded-2xl sm:rounded-[28px] bg-gradient-to-br from-brand-50 to-orange-50 border border-gray-200 overflow-hidden">
            <div
              className="absolute inset-0 opacity-40"
              style={{ backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            />
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/90 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-gray-200">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{seedBallMission.statesCovered}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <IconMapPinSm /> States Covered
              </p>
            </div>
            {topStatesCovered.map((s, i) => (
              <span
                key={s.state}
                title={`${s.state} — ${s.seedBalls.toLocaleString('en-IN')} seed balls`}
                className="group absolute w-3 h-3 rounded-full bg-brand-700 border-2 border-white shadow cursor-pointer hover:scale-150 transition-transform"
                style={{ top: `${20 + i * 14}%`, left: `${30 + (i % 3) * 20}%` }}
              >
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-gray-900 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.state}
                </span>
              </span>
            ))}
          </div>
          <div className="bg-surface border border-gray-200 rounded-2xl sm:rounded-[28px] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Top States by Seed Balls
            </p>
            <div className="space-y-3">
              {topStatesCovered.map((s) => (
                <div key={s.state} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">{s.state}</span>
                  <span className="text-gray-500 tabular-nums">{s.seedBalls.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Volunteer stories */}
        <div className="mb-8 md:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Volunteer Stories
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {volunteerStories.map((v) => (
              <div key={v.name} className="bg-surface border border-gray-200 rounded-2xl p-5">
                <p className="text-sm text-gray-900 leading-relaxed italic">&ldquo;{v.quote}&rdquo;</p>
                <div className="flex items-center gap-2.5 mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.avatar} alt={v.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{v.name}</p>
                    <p className="text-[11px] text-gray-400">{v.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent campaign photos */}
        <div className="mb-8 md:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Recent Campaign Photos
          </p>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {campaignPhotos.map((src) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Seed ball campaign" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/traveller/rewards"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-orange-500 text-white rounded-full shadow-card hover:bg-orange-600 hover:-translate-y-0.5 transition-all"
          >
            <IconSprout /> Join the Mission
          </Link>
          <Link
            href="/traveller/rewards#buy-seed-balls"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-white border border-brand-700 text-brand-700 rounded-full hover:bg-brand-700 hover:text-white transition-all"
          >
            <IconHeart /> Donate
          </Link>
        </div>
      </div>
    </section>
  );
}
