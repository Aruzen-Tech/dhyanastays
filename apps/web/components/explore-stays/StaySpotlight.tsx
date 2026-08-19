'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatINR, spotlightApi, type SpotlightPublicItem } from '../../lib/api';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';
import { getMockListingImageUrl } from '../../lib/mockListingImage';
import { useReveal } from '../../hooks/useReveal';
import { IconMapPin } from './icons';

/*
 * ─── What this is ─────────────────────────────────────────────────────────
 * The Explore page's promoted-stay placement — an admin-curated, sliding
 * carousel. Data comes solely from `GET /spotlight` (admin picks + orders
 * stays in /admin/spotlight); when that feed is empty the whole section
 * renders nothing rather than fabricating placeholder stays.
 *
 * Only the per-card *photo* still has a placeholder: listings whose `media`
 * the API hasn't populated fall back to the same curated image pool every
 * listing card uses (getMockListingImageUrl), so a real featured stay with no
 * uploaded photo yet doesn't show a broken image.
 *
 * ─── Motion ───────────────────────────────────────────────────────────────
 * Slides translate horizontally on a flex track (`transition-transform`) and
 * auto-advance on a timer that pauses on hover/focus. Entrance is
 * scroll-triggered via useReveal. useReveal reports `armed: false` under
 * prefers-reduced-motion; we reuse that single signal to drop the entrance
 * animation, the slide transition AND the autoplay, so reduced-motion users
 * get a static first card they can still step through with the controls.
 *
 * ─── Colour ───────────────────────────────────────────────────────────────
 * A deep-olive campaign band from the sage theme (#2E3521 light, #1A1D14
 * dark) — literal values, not `bg-brand-*` tokens, because the brand scale
 * inverts and a dark token would flip to near-white in dark mode. Text on the
 * band uses fixed light-sage values; everything inside the white slide uses
 * the normal inverting tokens.
 */

const BAND_ACCENT = '#C4CBA9';
const AUTOPLAY_MS = 6000;
const CARD_SHADOW = 'shadow-[0_18px_44px_-14px_rgba(3,20,26,0.55)]';

/** Same gold star used by the stay-detail header and review rows. */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#A6814B" className={className} aria-hidden="true">
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
    </svg>
  );
}

/** Real photo when the listing has one, curated placeholder otherwise. */
function spotlightImage(stay: SpotlightPublicItem, width: number, height: number): string {
  return stay.imageUrl ?? getMockListingImageUrl(stay.listingId, width, height);
}

/** Promo art with the same load-failure fallback every image surface here has. */
function PromoImage({ stay, width, height }: { stay: SpotlightPublicItem; width: number; height: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="absolute inset-0 bg-gradient-to-br from-brand-200 to-brand-500" aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spotlightImage(stay, width, height)}
      alt={stay.title}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** Hand-drawn-style accent, echoing the reference composition's arrow. */
function ArrowAccent({ className, animation }: { className?: string; animation: string }) {
  return (
    <svg viewBox="0 0 150 60" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 44c22-30 58-38 92-24"
        stroke={BAND_ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="220"
        className={animation}
      />
      <path
        d="M84 8c5 4 9 8 12 12-5 1-10 3-14 6"
        stroke={BAND_ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="220"
        className={animation}
      />
    </svg>
  );
}

/** One full-width slide: the raised lead-stay panel (image + editorial). */
function SpotlightSlide({ stay }: { stay: SpotlightPublicItem }) {
  return (
    <article className={`w-full shrink-0 overflow-hidden rounded-[1.75rem] bg-white ${CARD_SHADOW}`}>
      <Link
        href={`/listings/${stay.listingId}`}
        className="group grid grid-cols-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-inset lg:min-h-[340px] lg:grid-cols-[1.05fr_0.95fr]"
      >
        {/* Content */}
        <div className="order-2 flex flex-col justify-center p-6 sm:p-8 lg:order-1 lg:p-10">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {stay.badge}
          </span>

          <h3 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-gray-900 transition-colors group-hover:text-brand-700 sm:text-3xl">
            {stay.title}
          </h3>

          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-gray-500">
            <IconMapPin className="h-4 w-4 shrink-0 text-gray-400" />
            {stay.location}
          </p>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">{stay.description}</p>

          {stay.reviewCount > 0 && (
            <div className="mt-5 flex items-center gap-2 text-sm">
              <StarIcon className="h-4 w-4" />
              <span className="font-semibold text-gray-900">{stay.rating.toFixed(1)}</span>
              <span className="text-gray-400">({stay.reviewCount} reviews)</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-gray-100 pt-6">
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              {formatINR(stay.nightlyRate)}
              <span className="text-sm font-normal text-gray-400"> / night</span>
            </p>
            {/* Presentational — the whole panel is the link. */}
            <span className="btn-primary px-7 py-3">Explore this stay</span>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative order-1 aspect-[16/10] overflow-hidden lg:order-2 lg:aspect-auto">
          <PromoImage stay={stay} width={900} height={900} />
          <div className="absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-transparent" aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}

/** Circular prev/next control that sits on the band beside the panel. */
function CarouselArrow({
  dir,
  onClick,
  className,
}: {
  dir: 'prev' | 'next';
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous stay' : 'Next stay'}
      className={`grid h-11 w-11 place-items-center rounded-full bg-white/90 text-gray-900 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${className ?? ''}`}
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

/**
 * Stay Spotlight — admin-curated, auto-sliding carousel of featured stays on
 * a dark campaign band. The band is always present: a loading shimmer while
 * the feed loads, the sliding carousel once stays arrive, or a short
 * "coming soon" note when the curated feed is genuinely empty. See the file
 * header for motion + colour rationale.
 */
export default function StaySpotlight() {
  const { ref, armed, revealed } = useReveal<HTMLElement>();
  const [stays, setStays] = useState<SpotlightPublicItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load the live admin-curated feed. Empty/failed → "coming soon" state.
  useEffect(() => {
    let alive = true;
    spotlightApi
      .getPublic()
      .then((feed) => {
        if (alive) {
          setStays(feed);
          setIndex(0);
        }
      })
      .catch(() => {
        /* leave empty → coming-soon state below */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const count = stays.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Auto-advance — only with motion allowed, more than one slide, not paused.
  useEffect(() => {
    if (!armed || paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [armed, paused, count]);

  /** Entrance classes. Empty (final state, visible) unless motion is armed. */
  const enter = (animation: string) => {
    if (!armed) return '';
    return revealed ? `opacity-0 ${animation}` : 'opacity-0';
  };
  const at = (ms: number) => (armed && revealed ? { animationDelay: `${ms}ms` } : undefined);
  const drift = (animation: string) => (armed ? animation : '');

  return (
    <section
      ref={ref}
      aria-labelledby="stay-spotlight-heading"
      aria-roledescription="carousel"
      className="relative isolate overflow-hidden bg-[#2E3521] py-10 dark:bg-[#1A1D14] lg:py-14"
    >
      {/* ── Decorative layer ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div
          className={`absolute -left-40 top-[-14%] h-[460px] w-[460px] rounded-full bg-brand-500/20 blur-3xl ${drift('animate-float')}`}
          style={armed ? { animationDuration: '11s' } : undefined}
        />
        <div
          className={`absolute -right-24 top-[-24%] h-[380px] w-[380px] rounded-full bg-brand-400/15 blur-3xl ${drift('animate-float')}`}
          style={armed ? { animationDuration: '14s', animationDelay: '1.5s' } : undefined}
        />
        <div
          className={`absolute -bottom-32 left-[36%] h-[340px] w-[340px] rounded-full bg-brand-500/12 blur-3xl ${drift('animate-float')}`}
          style={armed ? { animationDuration: '13s', animationDelay: '0.8s' } : undefined}
        />
      </div>

      <div className={EXPLORE_CONTAINER_CLASS}>
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span
              className={`block text-[11px] font-semibold uppercase tracking-[0.18em] ${enter('animate-slide-up')}`}
              style={{ color: BAND_ACCENT, ...at(0) }}
            >
              Stay Spotlight
            </span>
            <h2
              id="stay-spotlight-heading"
              className={`mt-2 text-xl font-bold leading-[1.15] tracking-tight text-fixed-white sm:text-2xl lg:text-3xl ${enter('animate-slide-up')}`}
              style={at(80)}
            >
              Discover something
              <br className="hidden sm:block" /> exceptional
            </h2>
            <p
              className={`mt-2.5 max-w-xl text-xs leading-relaxed text-[#C8CDBA] sm:text-sm ${enter('animate-slide-up')}`}
              style={at(160)}
            >
              A few stays our curators keep coming back to this season — chosen for the places
              they sit in as much as the rooms themselves.
            </p>
          </div>

          <div className="hidden shrink-0 items-end gap-4 lg:flex">
            <ArrowAccent className="h-14 w-36 -scale-x-100" animation={enter('animate-draw-in')} />
            <p className="pb-1 text-xs text-[#96A088]">Promoted placements</p>
          </div>
        </div>

        {loading ? (
          /* Loading shimmer — reserves the band while the feed loads. */
          <div className="mt-8 lg:mt-10" aria-hidden="true">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#ffffff1f] bg-[#ffffff0d]">
              <div className="aspect-[16/10] w-full animate-pulse bg-white/[0.06] lg:aspect-auto lg:h-[340px]" />
            </div>
          </div>
        ) : count === 0 ? (
          /* Curated feed empty (or unreachable) — keep the band, invite curation. */
          <div className="mt-8 flex min-h-[220px] items-center justify-center rounded-[1.75rem] border border-[#ffffff1f] bg-[#ffffff0d] px-6 py-12 text-center lg:mt-10 lg:min-h-[300px]">
            <div>
              <p className="text-lg font-semibold text-fixed-white">Featured stays coming soon</p>
              <p className="mt-2 text-sm text-[#C8CDBA]">
                Our curators are handpicking standout stays for this space.
              </p>
            </div>
          </div>
        ) : (
          <>
        {/* ── Carousel ── */}
        <div
          className={`relative mt-8 lg:mt-10 ${enter('animate-rise-in')}`}
          style={at(140)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Offset frame behind the panel, echoing the reference's outer shell. */}
          <div
            className="pointer-events-none absolute -inset-4 hidden rounded-[2.25rem] border border-[#ffffff1f] bg-[#ffffff0d] lg:block"
            aria-hidden="true"
          />

          {/* Viewport */}
          <div className="relative overflow-hidden rounded-[1.75rem]">
            <div
              className={`flex ${armed ? 'transition-transform duration-700 ease-out' : ''}`}
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {stays.map((stay, i) => (
                <div
                  key={stay.id}
                  className="w-full shrink-0"
                  aria-hidden={i !== index}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                >
                  <SpotlightSlide stay={stay} />
                </div>
              ))}
            </div>
          </div>

          {/* Prev / next — only when there's more than one stay. */}
          {count > 1 && (
            <>
              <CarouselArrow
                dir="prev"
                onClick={prev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-3 lg:-left-5"
              />
              <CarouselArrow
                dir="next"
                onClick={next}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-3 lg:-right-5"
              />
            </>
          )}
        </div>

        {/* ── Dots ── */}
        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {stays.map((stay, i) => (
              <button
                key={stay.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to stay ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  i === index ? 'w-6 bg-fixed-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
          </>
        )}

        <p className="mt-6 text-center text-[11px] text-[#96A088] lg:hidden">Promoted placements</p>
      </div>
    </section>
  );
}
