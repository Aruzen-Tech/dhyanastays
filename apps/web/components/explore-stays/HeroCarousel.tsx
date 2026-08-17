'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatINR } from '../../lib/api';
import { getMockListingImageUrl } from '../../lib/mockListingImage';
import { SPONSORED_ADS } from '../../lib/sponsoredAds';
import type { Listing } from '../../lib/types';
import { useTilt } from '../../hooks/useTilt';
import Skeleton from '../Skeleton';

/** How long each slot holds before the next one fades in. */
const ROTATE_MS = 5000;
/** Cap on slides — beyond this the dot row stops being scannable at a glance. */
const MAX_SLIDES = 5;

interface Props {
  /** First few listings from the already-loaded catalog (allListings in
   *  app/page.tsx) — real data, not fabricated, and not a second fetch.
   *  Used only when there are no sponsored slots to show. */
  listings: Listing[];
  /** Real listing count, carried over from the collage this replaced. */
  stayCount?: number;
}

/**
 * One normalised slide. Sponsored slots and real stays differ in shape but
 * render identically, so both are mapped into this before the render rather
 * than branching inside the markup twice.
 */
interface HeroSlide {
  key: string;
  eyebrow: string;
  headline: string;
  copy: string;
  offer?: string;
  image: string;
  href: string;
  sponsored: boolean;
}

function IconMegaphone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function IconOffer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h13M12 5.5 18.5 12 12 18.5" />
    </svg>
  );
}

/** Art with a graceful fallback — external ad imagery is the likeliest thing
 *  on this page to fail to load. */
function SlideImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-brand-300 to-brand-600" aria-hidden="true" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Hero spotlight carousel — the Explore hero's right column.
 *
 * Shows sponsored placements from lib/sponsoredAds.ts: partner, headline,
 * one line of copy, an offer flag and a call to action, over the advertiser's
 * artwork. When that array is empty it falls back to featuring real stays
 * from the catalog app/page.tsx has already fetched, so the slot is never
 * blank and never fabricates content.
 *
 * Presentational only — no request of its own, no search/filter state.
 *
 * Slides are stacked absolutely and cross-faded rather than translated: the
 * frame then has one fixed height regardless of which slide is showing, so
 * the hero never reflows as it rotates.
 */
export default function HeroCarousel({ listings, stayCount }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  // Same pointer-tracked tilt the stay cards use, so the hero promotion and
  // the results row respond to the cursor identically.
  const { ref: tiltRef, onPointerMove, onPointerLeave } = useTilt<HTMLDivElement>();

  const slides: HeroSlide[] = useMemo(() => {
    if (SPONSORED_ADS.length > 0) {
      return SPONSORED_ADS.slice(0, MAX_SLIDES).map((ad, position) => ({
        key: `ad-${position}-${ad.partner}`,
        eyebrow: ad.partner,
        headline: ad.headline,
        copy: ad.copy,
        offer: ad.offer,
        image: ad.image,
        href: ad.href,
        sponsored: true,
      }));
    }

    // Fallback: real stays, presented in the same frame.
    return listings.slice(0, MAX_SLIDES).map((listing) => {
      const nightlyRate = listing.rateRules?.[0]?.baseNightlyRate ?? 0;
      return {
        key: listing.id,
        eyebrow: `${listing.city}, ${listing.state}`,
        headline: listing.title,
        copy: 'Handpicked by our curators — architect-inspected and personally visited.',
        offer: nightlyRate > 0 ? `${formatINR(nightlyRate)} / night` : undefined,
        image: listing.media?.[0]?.url ?? getMockListingImageUrl(listing.id, 900, 560),
        href: `/listings/${listing.id}`,
        sponsored: false,
      };
    });
  }, [listings]);

  // Rotation is motion the reader did not ask for, so it is offered only when
  // reduced motion is not requested. `autoplay` starts false, which also keeps
  // the server render and the first client render identical.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAutoplay(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // A shorter list must not leave the index stranded past the end.
  useEffect(() => {
    setIndex((current) => (current < slides.length ? current : 0));
  }, [slides.length]);

  useEffect(() => {
    if (!autoplay || paused || slides.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [autoplay, paused, slides.length]);

  // Pausing on focus-within matters as much as on hover: a keyboard user
  // tabbing onto a slide's link should not have it swapped out from under them.
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  if (slides.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[300px] lg:max-w-[330px]">
        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-2 shadow-[0_6px_12px_-10px_rgba(17,24,39,0.18)]">
          <Skeleton variant="rounded" className="aspect-[16/10] w-full rounded-[1.25rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[300px] lg:max-w-[330px]">
      {/* Perspective on the wrapper, rotation on the layer inside it — a
          perspective only applies to an element's children. Identical
          construction to CompactStayCard. */}
      <div
        ref={tiltRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        role="group"
        aria-roledescription="carousel"
        aria-label="Sponsored spotlight"
        className="group relative [perspective:900px]"
      >
        <div
          className="[transform-style:preserve-3d] [--lift:0px] transition-transform duration-300 ease-out group-hover:[--lift:-7px]"
          style={{
            transform:
              'translateY(var(--lift, 0px)) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
          }}
        >
          {/*
            White frame, radii concentric with the 8px padding (outer 28px =
            inner 20px + 8px).

            Three-layer elevation rather than one shadow: a tight contact
            shadow that seats the card, a mid shadow for body, and a wide
            ambient one for the lift. A single blur can be dark or broad but
            not both, which is what makes one-layer shadows read as flat grey
            fog. Tinted deep olive (26,31,18) instead of neutral grey so it
            sits in the sage palette against the cream page.
          */}
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-2 shadow-[0_2px_4px_-2px_rgba(26,31,18,0.16),0_10px_18px_-8px_rgba(26,31,18,0.26),0_26px_44px_-20px_rgba(26,31,18,0.30)] transition-shadow duration-300 ease-out [transform-style:preserve-3d] group-hover:shadow-[0_4px_8px_-2px_rgba(26,31,18,0.22),0_18px_28px_-10px_rgba(26,31,18,0.32),0_40px_64px_-24px_rgba(26,31,18,0.38)]">
            {/*
              The stage is NOT `overflow-hidden`, and that is the whole point.
              Per spec any `overflow` other than `visible` forces
              `transform-style: flat`, so clipping here silently flattened
              every translateZ below it — the body text and dots were carrying
              depth values that did nothing at all. Clipping now happens on
              the media layer alone, which is the only thing that needs the
              rounded mask, leaving the 3D chain intact for the content.
            */}
            <div className="relative aspect-[16/10] rounded-[1.25rem] bg-[#141810] [transform-style:preserve-3d] [transform:translateZ(18px)]">
              {slides.map((slide, slideIndex) => {
                const isActive = slideIndex === index;

                return (
                  <div
                    key={slide.key}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out [transform-style:preserve-3d] ${
                      isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                    aria-hidden={!isActive}
                  >
                    {/*
                      Media layer — the ONLY element that clips, so the rounded
                      mask costs the 3D chain nothing outside it. Sits furthest
                      back in Z; the content below rides in front of it.

                      Three scrim layers, all in the theme's deep olive
                      (#141810 / #1F2617) rather than neutral grey, so the card
                      reads as part of the sage palette instead of a grey box
                      dropped onto it.

                      Three, because one is not enough on real photography: a
                      single left-to-right gradient still let bright artwork —
                      the curry shot especially — punch through underneath the
                      headline. So: a flat tint to knock the whole image back,
                      a left-weighted gradient for the text column, and a
                      bottom lift under the body block where the copy and CTA
                      sit. The right edge still clears, so the advertiser's
                      image is never fully hidden.
                    */}
                    <div className="absolute inset-0 overflow-hidden rounded-[1.25rem]">
                      <SlideImage src={slide.image} alt="" />
                      <div className="absolute inset-0 bg-[#141810]/35" aria-hidden="true" />
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[#141810]/95 via-[#1F2617]/75 to-transparent"
                        aria-hidden="true"
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#141810]/92 via-[#141810]/45 to-transparent"
                        aria-hidden="true"
                      />
                    </div>

                    {/* Asymmetric on purpose: the copy needs more room to
                        breathe off the left edge than the pills need off the
                        top, and the right side stays tighter so the artwork
                        keeps as much width as possible. */}
                    <div className="absolute inset-0 flex flex-col px-4 py-3.5 [transform-style:preserve-3d] sm:px-5 sm:py-4">
                      {/* Top row — labels left, ad position right. Pills ride
                          nearest the viewer, which is what separates them from
                          the artwork as the card turns. */}
                      <div className="flex items-start justify-between gap-2 [transform:translateZ(30px)]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {slide.sponsored && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-fixed-white backdrop-blur-sm">
                              <IconMegaphone className="h-2.5 w-2.5" />
                              Spotlight · Sponsored
                            </span>
                          )}
                          {slide.offer && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-on-primary">
                              <IconOffer className="h-2.5 w-2.5" />
                              {slide.offer}
                            </span>
                          )}
                        </div>

                        {slides.length > 1 && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-white/60">
                            {slide.sponsored ? 'Ad ' : ''}
                            {slideIndex + 1}/{slides.length}
                          </span>
                        )}
                      </div>

                      {/* Body, pinned to the bottom so slides of differing copy
                          length share one baseline instead of drifting.

                          The text carries its own shadow on top of the scrim:
                          a gradient cannot adapt to what is underneath it, and
                          a bright highlight landing right behind a glyph will
                          still swallow it. This is the per-character backstop. */}
                      <div className="mt-auto [transform:translateZ(22px)] [text-shadow:0_1px_4px_rgba(10,14,8,0.75)]">
                        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80">
                          {slide.eyebrow}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-fixed-white sm:text-[15px]">
                          {slide.headline}
                        </h3>
                        <p className="mt-1 truncate text-[10px] leading-relaxed text-white/80">
                          {slide.copy}
                        </p>

                        <Link
                          href={slide.href}
                          tabIndex={isActive ? undefined : -1}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                          Explore
                          <IconArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dots sit inside the frame, bottom-right, above every slide —
                  one control set rather than one per slide. */}
              {slides.length > 1 && (
                <div className="absolute bottom-3.5 right-4 z-10 flex items-center gap-1.5 [transform:translateZ(34px)] sm:right-5">
                  {slides.map((slide, slideIndex) => (
                    <button
                      key={slide.key}
                      type="button"
                      onClick={() => setIndex(slideIndex)}
                      aria-label={`Show spotlight ${slideIndex + 1} of ${slides.length}`}
                      aria-current={slideIndex === index}
                      className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        slideIndex === index
                          ? 'w-5 bg-primary'
                          : 'w-1.5 bg-white/45 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {stayCount ? (
        <p className="mt-2 truncate px-1 text-[10px] text-gray-500">
          <span className="font-semibold text-brand-700">{stayCount}</span> curated stays across
          India
        </p>
      ) : null}
    </div>
  );
}
