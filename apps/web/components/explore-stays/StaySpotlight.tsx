'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatINR } from '../../lib/api';
import { EXPLORE_CONTAINER_CLASS } from '../../lib/exploreLayout';
import {
  PROMOTED_STAYS,
  promotedStayHref,
  promotedStayImage,
  type PromotedStay,
} from '../../lib/mockPromotedStays';
import { useReveal } from '../../hooks/useReveal';
import { IconMapPin } from './icons';

/*
 * ─── Animation approach ──────────────────────────────────────────────────
 * No animation library is installed in this project (checked package.json:
 * no framer-motion, gsap, react-spring or motion), and none was added. All
 * motion here is the Tailwind keyframe system this codebase already uses —
 * `float`, `fade-in`, `slide-up`, `scale-in`, `pulse-ring` etc. live in
 * tailwind.config.ts — extended with six additive keyframes (`rise-in`,
 * `slide-in-left/right`, `float-soft`, `float-tilt`, `draw-in`). No existing
 * keyframe was changed.
 *
 * Entrance is scroll-triggered via useReveal (IntersectionObserver, a
 * browser API). Every animation utility carries `animation-fill-mode: both`,
 * which is what makes the stagger work: an element holds its 0% frame
 * through its delay rather than flashing in and then animating.
 *
 * Continuous drift and entrance transforms cannot share one element — a
 * single `animation` property would have to win — so floating pieces nest
 * three layers: entrance on the outer div, static tilt in the middle,
 * ambient float on the inner (see FloatLayer).
 *
 * Reduced motion: useReveal reports `armed: false` for
 * prefers-reduced-motion, and every helper below then emits no animation
 * class and no opacity-0, so the section renders straight to its final
 * state. The same path covers SSR and JS-disabled, so the content is never
 * left invisible.
 *
 * ─── Colour ──────────────────────────────────────────────────────────────
 * A deep-olive campaign band drawn from the sage theme (#2E3521 light,
 * #1A1D14 dark). Both are literal values rather than `bg-brand-*` tokens on
 * purpose: the brand scale inverts, so a dark token becomes near-white in
 * dark mode and would turn this into a glaring light slab. Everything sitting
 * on the band therefore uses fixed light-sage values; everything inside the
 * white panel and the cards uses the normal inverting tokens, so those
 * surfaces adapt as usual.
 */

/**
 * Light sage, fixed rather than a `--brand-*` token, for the pieces that sit
 * directly on the always-dark band. A token cannot be used here for the same
 * reason the band itself is a literal value: the brand scale inverts, so the
 * light end of it becomes dark in dark mode and this text would vanish.
 * Elements inside the white panel keep the normal inverting tokens.
 */
const BAND_ACCENT = '#C4CBA9';

/*
 * The band's other two text tiers are written as literal Tailwind arbitrary
 * values rather than constants, because Tailwind only sees class strings at
 * build time and would not emit a class assembled from a variable:
 *   text-[#C8CDBA]  muted sage — supporting copy
 *   text-[#96A088]  faint sage — captions and labels
 */

/** Same gold star used by the stay-detail header and review rows. */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#A6814B" className={className} aria-hidden="true">
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
    </svg>
  );
}

/** Promo art with the same load-failure fallback every image surface here has. */
function PromoImage({ stay, width, height }: { stay: PromotedStay; width: number; height: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="absolute inset-0 bg-gradient-to-br from-brand-200 to-brand-500" aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={promotedStayImage(stay, width, height)}
      alt={stay.title}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Middle + inner layers of a floating piece: a fixed tilt, then continuous
 * drift. The caller owns the outer layer (absolute placement + entrance).
 * `animation` is '' under reduced motion, which leaves a plain static tilt.
 */
function FloatLayer({
  rotate,
  animation,
  duration,
  delay,
  children,
}: {
  rotate: number;
  animation: string;
  duration: string;
  delay: string;
  children: ReactNode;
}) {
  return (
    <div style={{ transform: `rotate(${rotate}deg)` }}>
      <div className={animation} style={animation ? { animationDuration: duration, animationDelay: delay } : undefined}>
        {children}
      </div>
    </div>
  );
}

const CARD_SHADOW = 'shadow-[0_18px_44px_-14px_rgba(3,20,26,0.55)]';

/** A supporting promotion. Floats beside the panel on desktop, sits inline below it on mobile. */
function MiniStayCard({ stay }: { stay: PromotedStay }) {
  return (
    <Link
      href={promotedStayHref(stay)}
      className={`group block overflow-hidden rounded-2xl bg-white ring-1 ring-gray-900/10 ${CARD_SHADOW} transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <PromoImage stay={stay} width={520} height={340} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-900 backdrop-blur">
          {stay.badge}
        </span>
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand-700">
          {stay.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500">{stay.location}</p>
        <p className="mt-2 text-sm font-bold text-gray-900">
          {formatINR(stay.nightlyRate)}
          <span className="text-xs font-normal text-gray-400"> / night</span>
        </p>
      </div>
    </Link>
  );
}

/** Small floating rating card for the lead stay. */
function RatingCard({ stay }: { stay: PromotedStay }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-900/10 ${CARD_SHADOW}`}>
      <StarIcon className="h-6 w-6 shrink-0" />
      <div>
        <p className="text-lg font-bold leading-none tracking-tight text-gray-900">{stay.rating.toFixed(1)}</p>
        <p className="mt-1 whitespace-nowrap text-[11px] leading-none text-gray-500">
          {stay.reviewCount} reviews
        </p>
      </div>
    </div>
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

/**
 * Stay Spotlight — the Explore page's promoted-stay placement.
 *
 * A layered campaign composition: dark full-bleed band, decorative glows, a
 * raised light panel carrying the lead stay, and floating cards that overlap
 * the panel's edge and bleed past it. Purely presentational — it renders
 * from PROMOTED_STAYS (frontend mock data, lib/mockPromotedStays.ts) and
 * reads no search, filter, map, pagination or listing state.
 *
 * The floating cards are a desktop-only arrangement; below `lg` the same
 * cards render inline underneath the panel, so nothing is lost on mobile and
 * no absolutely-positioned element can overflow a narrow viewport.
 */
export default function StaySpotlight() {
  const { ref, armed, revealed } = useReveal<HTMLElement>();
  const [feature, ...supporting] = PROMOTED_STAYS;

  if (!feature) return null;

  /** Entrance classes. Empty (final state, visible) unless motion is armed. */
  const enter = (animation: string) => {
    if (!armed) return '';
    return revealed ? `opacity-0 ${animation}` : 'opacity-0';
  };
  /** Matching delay, so a stagger reads as a sequence. */
  const at = (ms: number) => (armed && revealed ? { animationDelay: `${ms}ms` } : undefined);
  /** Continuous drift — suppressed entirely under reduced motion. */
  const drift = (animation: string) => (armed ? animation : '');

  return (
    <section
      ref={ref}
      aria-labelledby="stay-spotlight-heading"
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
            {/* The global `.eyebrow` class resolves to gold via the inverting
                token — off-palette on this sage band, so BAND_ACCENT is used
                with the same type treatment. */}
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

        {/* ── Stage: raised panel + floating cards ── */}
        <div className="relative mt-8 lg:mt-10">
          {/* Offset frame behind the panel, echoing the reference's outer shell. */}
          <div
            className={`pointer-events-none absolute -inset-4 hidden rounded-[2.25rem] border border-[#ffffff1f] bg-[#ffffff0d] lg:block ${enter('animate-scale-in')}`}
            style={at(60)}
            aria-hidden="true"
          />

          {/* Lead promotion */}
          <article
            className={`relative overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_90px_-40px_rgba(0,0,0,0.75)] lg:mr-[14%] ${enter('animate-rise-in')}`}
            style={at(140)}
          >
            <Link
              href={promotedStayHref(feature)}
              className="group grid grid-cols-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-inset lg:min-h-[320px] lg:grid-cols-[1.05fr_0.95fr]"
            >
              {/* Content */}
              <div className="order-2 flex flex-col justify-center p-6 sm:p-8 lg:order-1 lg:p-10">
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700 ${enter('animate-slide-up')}`}
                  style={at(300)}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {feature.badge}
                </span>

                <h3
                  className={`mt-4 text-2xl font-bold leading-tight tracking-tight text-gray-900 transition-colors group-hover:text-brand-700 sm:text-3xl ${enter('animate-slide-up')}`}
                  style={at(360)}
                >
                  {feature.title}
                </h3>

                <p
                  className={`mt-2.5 flex items-center gap-1.5 text-sm text-gray-500 ${enter('animate-slide-up')}`}
                  style={at(420)}
                >
                  <IconMapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  {feature.location}
                </p>

                <p
                  className={`mt-4 max-w-md text-sm leading-relaxed text-gray-500 ${enter('animate-slide-up')}`}
                  style={at(480)}
                >
                  {feature.description}
                </p>

                {/* Rating repeats here for mobile, where the floating card is not rendered. */}
                <div
                  className={`mt-5 flex items-center gap-2 text-sm lg:hidden ${enter('animate-slide-up')}`}
                  style={at(520)}
                >
                  <StarIcon className="h-4 w-4" />
                  <span className="font-semibold text-gray-900">{feature.rating.toFixed(1)}</span>
                  <span className="text-gray-400">({feature.reviewCount} reviews)</span>
                </div>

                <div
                  className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-gray-100 pt-6 ${enter('animate-slide-up')}`}
                  style={at(560)}
                >
                  <p className="text-2xl font-bold tracking-tight text-gray-900">
                    {formatINR(feature.nightlyRate)}
                    <span className="text-sm font-normal text-gray-400"> / night</span>
                  </p>
                  {/* Presentational — the whole panel is the link. */}
                  <span className="btn-primary px-7 py-3">Explore this stay</span>
                </div>
              </div>

              {/* Hero image */}
              <div
                className={`relative order-1 aspect-[16/10] overflow-hidden lg:order-2 lg:aspect-auto ${enter('animate-slide-in-right')}`}
                style={at(240)}
              >
                <PromoImage stay={feature} width={900} height={900} />
                {/* Softens the seam where the floating cards overlap the photo. */}
                <div
                  className="absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </article>

          {/* ── Floating layer (desktop only) ── */}
          {/* Click-through container; each card re-enables its own pointer
              events so the panel underneath stays fully clickable. */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <div
              className={`pointer-events-auto absolute right-[30%] top-[-30px] ${enter('animate-slide-in-left')}`}
              style={at(700)}
            >
              <FloatLayer rotate={-5} animation={drift('animate-float-soft')} duration="6.5s" delay="0s">
                <RatingCard stay={feature} />
              </FloatLayer>
            </div>

            {supporting[0] && (
              <div
                className={`pointer-events-auto absolute right-0 top-[6%] w-[25%] min-w-[220px] ${enter('animate-slide-in-right')}`}
                style={at(820)}
              >
                <FloatLayer rotate={4} animation={drift('animate-float-tilt')} duration="8s" delay="0.4s">
                  <MiniStayCard stay={supporting[0]} />
                </FloatLayer>
              </div>
            )}

            {supporting[1] && (
              <div
                className={`pointer-events-auto absolute bottom-[-56px] right-[9%] w-[23%] min-w-[205px] ${enter('animate-slide-in-right')}`}
                style={at(940)}
              >
                <FloatLayer rotate={-3.5} animation={drift('animate-float-soft')} duration="7.2s" delay="1.1s">
                  <MiniStayCard stay={supporting[1]} />
                </FloatLayer>
              </div>
            )}
          </div>
        </div>

        {/* ── Supporting promotions, inline below `lg` ── */}
        {supporting.length > 0 && (
          <div
            className={`mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:hidden ${enter('animate-slide-up')}`}
            style={at(640)}
          >
            {supporting.map((stay) => (
              <MiniStayCard key={stay.id} stay={stay} />
            ))}
          </div>
        )}

        <p className="mt-8 text-[11px] text-[#96A088] lg:hidden">Promoted placements</p>
      </div>
    </section>
  );
}
