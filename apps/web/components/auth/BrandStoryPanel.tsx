'use client';

import { useReveal } from '../../hooks/useReveal';
import { IconLeaf } from '../explore-stays/icons';

/**
 * PLACEHOLDER marketing figures. These are NOT derived from any API, and no
 * backend was added to source them — per the brief, mock values stand in for
 * now. They are shown to real users on a real sign-in screen, so verify them
 * against the actual catalogue before this ships; the live Explore page
 * currently reports a materially smaller number of stays.
 *
 * To wire these up later, replace this array with fetched values — nothing
 * else in this component needs to change.
 */
const SHOWCASE_STATS = [
  { value: '312+', label: 'Curated stays' },
  { value: '4.82', label: 'Avg rating' },
  { value: '45+', label: 'Destinations' },
];

/**
 * Editorial brand panel beside the auth form. Purely presentational — it
 * holds no auth state, issues no requests, and renders no interactive
 * controls, so it can sit alongside any auth form without touching its
 * logic.
 *
 * Surfaces come from the existing theme tokens rather than a login-specific
 * palette: `bg-gray-50` against the form side's `bg-surface`. Those two
 * resolve to the same value in dark mode, which is why the separation is
 * carried by a border rather than by colour alone.
 */
export default function BrandStoryPanel({ className = '' }: { className?: string }) {
  const { ref, armed, revealed } = useReveal<HTMLDivElement>();

  const enter = (animation: string) => {
    if (!armed) return '';
    return revealed ? `opacity-0 ${animation}` : 'opacity-0';
  };
  const at = (ms: number) => (armed && revealed ? { animationDelay: `${ms}ms` } : undefined);

  return (
    <div
      ref={ref}
      className={`relative isolate flex items-center justify-center overflow-hidden bg-gray-50 px-10 py-16 xl:px-16 ${className}`}
    >
      {/* Very subtle brand wash — no heavy gradient, no strong colour. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-50/70 blur-3xl" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgb(var(--gray-300) / 0.28) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="w-full max-w-sm text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200/70 bg-white shadow-sm ${enter('animate-scale-in')}`}
          style={at(80)}
        >
          <IconLeaf className="h-7 w-7 text-brand-700" />
        </div>

        <h2
          className={`mt-8 font-serif text-3xl leading-tight tracking-tight text-gray-900 xl:text-4xl ${enter('animate-slide-up')}`}
          style={at(160)}
        >
          Curated stays await
        </h2>

        <p
          className={`mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-500 xl:text-base ${enter('animate-slide-up')}`}
          style={at(240)}
        >
          Every stay on Dhyana is personally vetted by our curators — so the place you
          arrive at is the one you were promised.
        </p>

        <dl
          className={`mt-12 grid grid-cols-3 gap-4 ${enter('animate-slide-up')}`}
          style={at(320)}
        >
          {SHOWCASE_STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-2xl font-bold tracking-tight text-brand-700 xl:text-[1.75rem]">
                  {stat.value}
                </span>
                <span
                  className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400"
                  aria-hidden="true"
                >
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/**
 * Condensed stats strip for viewports too narrow for the full panel. Keeps a
 * trace of the brand story on mobile without pushing the form down the page.
 */
export function BrandStoryStats({ className = '' }: { className?: string }) {
  return (
    <dl className={`grid grid-cols-3 gap-4 border-t border-gray-100 pt-6 text-center ${className}`}>
      {SHOWCASE_STATS.map((stat) => (
        <div key={stat.label}>
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block text-lg font-bold tracking-tight text-brand-700">{stat.value}</span>
            <span
              className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400"
              aria-hidden="true"
            >
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
