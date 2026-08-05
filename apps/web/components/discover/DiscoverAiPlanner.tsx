'use client';

import Link from 'next/link';
import { useFeatures } from '../../context/FeatureContext';
import { IconBot, IconClock, IconSparkles } from './icons';

const ITINERARY_PREVIEW_STEPS = [
  { time: '6:30 AM', title: 'Sunrise yoga at the stay', state: 'done' },
  { time: '11:00 AM', title: 'Matrimandir & Auroville tour', state: 'now' },
  { time: '4:30 PM', title: 'Cycle to Serenity Beach', state: 'next' },
] as const;

const PROMPT_CHIPS = [
  'Peaceful farm stay near Auroville for 2 days',
  'Family weekend under ₹15,000',
  'Pet-friendly stay with a pool',
];

/**
 * Promotional, links into the existing /itineraries flow (gated by the same
 * ai_itinerary flag as the Hero's "Plan My Trip with AI" button). The
 * itinerary preview card on the right is static illustrative content,
 * matching the reference — not real trip data.
 */
export default function DiscoverAiPlanner() {
  const { isEnabled } = useFeatures();
  if (!isEnabled('ai_itinerary')) return null;

  return (
    <section className="pb-8 md:pb-12 bg-surface">
      <div className="container-page">
        <div className="rounded-2xl sm:rounded-[32px] bg-brand-700 overflow-hidden shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center p-6 sm:p-8 md:p-12">
            <div>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                <IconBot /> AI Trip Planner
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mt-2 sm:mt-3 leading-tight">
                Tell Us the Trip. We Build the Plan.
              </h2>
              <p className="text-white/80 text-sm sm:text-base mt-3 sm:mt-4 leading-relaxed max-w-lg">
                Describe your dream trip — the AI shortlists stays that match your preferences and builds a day-by-day itinerary around them.
              </p>

              <Link
                href="/itineraries/new"
                className="mt-5 sm:mt-7 flex items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-[20px] bg-white p-1.5 pl-4 sm:p-2 sm:pl-5 shadow-card hover:-translate-y-0.5 transition-all group"
              >
                <IconSparkles className="text-brand-700 shrink-0 w-4 h-4" />
                <span className="flex-1 text-sm text-gray-500 truncate">
                  Describe your dream trip — &ldquo;quiet mountain cabin for two, fast wifi…&rdquo;
                </span>
                <span className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold bg-orange-500 text-white rounded-2xl group-hover:bg-orange-600 transition-colors whitespace-nowrap">
                  Plan with AI
                </span>
              </Link>
              <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                {PROMPT_CHIPS.map((prompt) => (
                  <Link
                    key={prompt}
                    href="/itineraries/new"
                    className="px-3 py-1.5 text-xs text-white/85 border border-white/25 rounded-full hover:bg-white/10 transition-colors"
                  >
                    &ldquo;{prompt}&rdquo;
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl sm:rounded-[24px] bg-white shadow-card p-4 sm:p-5 max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <p className="text-sm font-semibold text-gray-800">Auroville Escape · Day 2</p>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-700 animate-pulse" /> Preview
                  </span>
                </div>
                {ITINERARY_PREVIEW_STEPS.map((step, i, arr) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          step.state === 'done'
                            ? 'bg-gray-100 text-gray-400'
                            : step.state === 'now'
                              ? 'bg-brand-700 text-white'
                              : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                      {i < arr.length - 1 && <span className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className={`pb-3 sm:pb-4 ${step.state === 'done' ? 'opacity-50' : ''}`}>
                      <p className="text-[10px] text-gray-400 tabular-nums flex items-center gap-1">
                        <IconClock /> {step.time}
                        {step.state === 'now' && (
                          <span className="ml-1 text-[8px] font-bold uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full">
                            Now
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-800 font-medium mt-0.5">{step.title}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl sm:rounded-[14px] bg-amber-50 px-3 py-2 sm:px-3.5 sm:py-2.5 text-[11px] text-gray-500">
                  Running 30 min late — <span className="text-amber-700 font-semibold">auto-rescheduled</span> your beach ride & dinner.
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-orange-500 shadow-card text-xs font-semibold text-white whitespace-nowrap">
                <IconSparkles className="w-3 h-3" /> 96% match with your preferences
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
