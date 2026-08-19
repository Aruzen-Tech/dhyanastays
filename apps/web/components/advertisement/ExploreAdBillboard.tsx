'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adApi, type PublicAd } from '../../lib/api';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';
import { useReveal } from '../../hooks/useReveal';

/*
 * Explore-page advertisement billboard — an admin-authored promo band pinned
 * to the top of the Explore page. Shares the Stay Spotlight's visual language:
 * a deep-olive campaign band, a revealing dot pattern + drifting glows, and a
 * sliding, auto-advancing carousel. Content is the active ad feed
 * (GET /advertisements/active?placement=explore_billboard); renders nothing
 * when there are no eligible ads or the `advertisements` flag gates the feed
 * off (the request 503s and is swallowed).
 *
 * Motion mirrors StaySpotlight: entrance is scroll-triggered via useReveal,
 * which reports `armed: false` under prefers-reduced-motion — we reuse that one
 * signal to drop the pattern/entrance reveal, the slide transition AND the
 * autoplay. Impressions are recorded once per ad per page view (when a slide
 * first becomes active); a CTA records a click then navigates.
 *
 * Colour note (same as StaySpotlight): the band is a literal #2E3521/#1A1D14,
 * not a `bg-brand-*` token, because the brand scale inverts in dark mode.
 */

const BAND_ACCENT = '#C4CBA9';
const AUTOPLAY_MS = 6500;

/** One billboard slide — the ad artwork as backdrop with overlaid copy + CTA. */
function AdSlide({ ad, onCta }: { ad: PublicAd; onCta: (ad: PublicAd) => void }) {
  const accent = ad.accentColor || BAND_ACCENT;
  return (
    <div className="w-full shrink-0">
      <div className="relative min-h-[220px] overflow-hidden rounded-[1.5rem] lg:min-h-[260px]">
        {/* Backdrop */}
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-300 to-brand-600" aria-hidden="true" />
        )}
        {/* Legibility scrim — heavier on the left where the copy sits. */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10"
          aria-hidden="true"
        />

        {/* Copy */}
        <div className="relative z-10 flex min-h-[220px] max-w-xl flex-col justify-center gap-2.5 p-6 sm:p-8 lg:min-h-[260px] lg:p-10">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            Sponsored
          </span>
          <h3 className="text-xl font-bold leading-tight tracking-tight text-fixed-white sm:text-2xl lg:text-3xl">
            {ad.title}
          </h3>
          {ad.body && (
            <p className="max-w-md text-sm leading-relaxed text-white/85">{ad.body}</p>
          )}
          {ad.ctaHref && (
            <button
              type="button"
              onClick={() => onCta(ad)}
              className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ backgroundColor: accent }}
            >
              {ad.ctaLabel || 'Learn more'}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h13M12 5.5 18.5 12 12 18.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Circular prev/next control on the band. */
function BillboardArrow({ dir, onClick, className }: { dir: 'prev' | 'next'; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous ad' : 'Next ad'}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/90 text-gray-900 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ExploreAdBillboard() {
  const router = useRouter();
  const { ref, armed, revealed } = useReveal<HTMLElement>();
  const [ads, setAds] = useState<PublicAd[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const impressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    adApi
      .getActive('explore_billboard')
      .then((feed) => {
        if (alive) setAds(feed);
      })
      .catch(() => {
        /* feed unreachable or flag off → no billboard */
      });
    return () => {
      alive = false;
    };
  }, []);

  const count = ads.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Auto-advance — only with motion allowed, >1 ad, not paused.
  useEffect(() => {
    if (!armed || paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [armed, paused, count]);

  // One impression per ad per page view, as each becomes the active slide.
  useEffect(() => {
    const ad = ads[index];
    if (!ad || impressed.current.has(ad.id)) return;
    impressed.current.add(ad.id);
    adApi.impression(ad.id).catch(() => {});
  }, [ads, index]);

  const onCta = useCallback(
    (ad: PublicAd) => {
      if (!ad.ctaHref) return;
      adApi.click(ad.id).catch(() => {});
      if (/^https?:\/\//i.test(ad.ctaHref)) {
        window.open(ad.ctaHref, '_blank', 'noopener,noreferrer');
      } else {
        router.push(ad.ctaHref);
      }
    },
    [router],
  );

  if (count === 0) return null;

  /** Entrance classes. Empty (final state, visible) unless motion is armed. */
  const enter = (animation: string) => {
    if (!armed) return '';
    return revealed ? `opacity-0 ${animation}` : 'opacity-0';
  };
  const drift = (animation: string) => (armed ? animation : '');

  return (
    <section
      ref={ref}
      aria-label="Sponsored"
      aria-roledescription="carousel"
      className="relative isolate overflow-hidden bg-[#2E3521] py-7 dark:bg-[#1A1D14] lg:py-9"
    >
      {/* ── Decorative layer (revealing pattern + drifting glows) ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${armed && !revealed ? 'opacity-0' : 'opacity-[0.35]'}`}
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div
          className={`absolute -left-40 top-[-30%] h-[420px] w-[420px] rounded-full bg-brand-500/20 blur-3xl ${drift('animate-float')}`}
          style={armed ? { animationDuration: '11s' } : undefined}
        />
        <div
          className={`absolute -right-24 top-[-40%] h-[360px] w-[360px] rounded-full bg-brand-400/15 blur-3xl ${drift('animate-float')}`}
          style={armed ? { animationDuration: '14s', animationDelay: '1.5s' } : undefined}
        />
      </div>

      <div className={EXPLORE_CONTAINER_CLASS}>
        <div
          className={`relative ${enter('animate-rise-in')}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Viewport */}
          <div className="relative overflow-hidden rounded-[1.5rem]">
            <div
              className={`flex ${armed ? 'transition-transform duration-700 ease-out' : ''}`}
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {ads.map((ad, i) => (
                <div
                  key={ad.id}
                  className="w-full shrink-0"
                  aria-hidden={i !== index}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                >
                  <AdSlide ad={ad} onCta={onCta} />
                </div>
              ))}
            </div>
          </div>

          {/* Prev / next */}
          {count > 1 && (
            <>
              <BillboardArrow dir="prev" onClick={prev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-3" />
              <BillboardArrow dir="next" onClick={next} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-3" />
            </>
          )}
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {ads.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ad ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  i === index ? 'w-6 bg-fixed-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
