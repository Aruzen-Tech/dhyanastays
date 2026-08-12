'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '../lib/api';
import { getMockListingImageUrl } from '../lib/mockListingImage';
import type { Listing } from '../lib/types';
import WishlistButton from './WishlistButton';
import { IconMapPin } from './explore-stays/icons';

// Deterministic deep-petrol gradient palette
const GRADIENTS: [string, string][] = [
  ['#04090a', '#0e3b47'],
  ['#05100f', '#1d6371'],
  ['#03070a', '#0a2c35'],
  ['#050b0c', '#3a7f8c'],
  ['#040a0b', '#175b69'],
];

/** Last-resort fallback if a listing has no real photo yet AND the mock
 * image itself fails to load (e.g. offline) — not the primary render path
 * anymore, see the photoUrl/imageFailed logic in ListingCard below. */
function ListingPlaceholder({ id, title }: { id: string; title: string }) {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  const gradId = `g-${id.slice(0, 8)}`;
  const label = title.length > 32 ? title.slice(0, 32) + '…' : title;

  return (
    <svg
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill={`url(#${gradId})`} />
      {/* Decorative circles */}
      <circle cx="480" cy="80" r="120" fill="white" fillOpacity="0.04" />
      <circle cx="120" cy="320" r="90" fill="white" fillOpacity="0.04" />
      {/* House icon */}
      <g transform="translate(270,140)" fill="white" fillOpacity="0.55">
        <polygon points="30,0 60,30 0,30" />
        <rect x="8" y="30" width="44" height="32" />
        <rect x="20" y="42" width="12" height="20" />
      </g>
      {/* Title */}
      <text
        x="300"
        y="228"
        textAnchor="middle"
        fill="white"
        fillOpacity="0.7"
        fontSize="14"
        fontFamily="system-ui, sans-serif"
        fontWeight="500"
      >
        {label}
      </text>
    </svg>
  );
}

/** 'boutique-hotel' → 'Boutique Hotel' — display formatting only. */
function formatPropertyType(value: string): string {
  return value
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

type IconProps = { className?: string };

function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5a1 1 0 0 0 1 1H9.5v-6h5v6h3a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function IconGuests({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="8" cy="9.5" r="3.5" />
      <path d="M15.5 20a4.5 4.5 0 0 1 6-4.24" />
      <circle cx="16.5" cy="8.5" r="2.5" />
    </svg>
  );
}

function IconMoon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
    </svg>
  );
}

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const rateRule = listing.rateRules?.[0];
  const nightlyRate = rateRule?.baseNightlyRate ?? 0;
  const maxGuests = rateRule?.maxGuests;
  const minNights = rateRule?.minNights;
  const [imageFailed, setImageFailed] = useState(false);

  // Real photo once the API populates it, mock in the meantime — see
  // lib/mockListingImage.ts.
  const photoUrl = listing.media?.[0]?.url ?? getMockListingImageUrl(listing.id, 600, 400);

  return (
    <article className="group relative h-full flex flex-col overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-all duration-300 hover:shadow-[0_20px_48px_-16px_rgba(17,24,39,0.18)] hover:-translate-y-1 animate-fade-in focus-within:ring-2 focus-within:ring-brand-700/30 focus-within:ring-inset">
      <Link
        href={`/listings/${listing.id}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-inset"
      >
        {/* Image — every card uses the same fixed aspect ratio (object-fit:
            cover equivalent via preserveAspectRatio="slice" on the SVG), so
            image height never varies card to card. */}
        <div className="relative overflow-hidden aspect-[4/3] shrink-0">
          <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.045]">
            {imageFailed ? (
              <ListingPlaceholder id={listing.id} title={listing.title} />
            ) : (
              <img
                src={photoUrl}
                alt={listing.title}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
        </div>

        {/* Content — Title → Location → Metadata → Price, in that order.
            No bedroom/bathroom/area fields exist anywhere in the listing API
            (checked RateRule and Listing), so the metadata row is built only
            from real fields: propertyType, maxGuests, and minNights (shown
            only when it's a meaningful constraint, i.e. > 1 night).

            Height determinism: line-clamp caps the title/location so an
            unusually long one never grows the card past 2 lines, while
            `h-full` on the card plus the grid's default row-stretch
            (`items-stretch`) equalizes every card in a row regardless of how
            much of that space each one actually uses — so we don't need to
            pad out the common case (mostly one-line content) with reserved
            blank space just to guard against a rare long value. Price uses
            one fixed size on every card and is pinned to the bottom
            (mt-auto). */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3
            className="font-semibold text-gray-900 leading-6 line-clamp-2 text-lg group-hover:text-brand-700 transition-colors"
          >
            {listing.title}
          </h3>

          <p className="flex items-start gap-1.5 mt-1.5 text-gray-500 text-sm leading-5">
            <IconMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span className="line-clamp-2">{listing.city}, {listing.state}</span>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-gray-500 text-xs sm:text-[13px] leading-5">
            {listing.propertyType && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <IconHome className="w-4 h-4 shrink-0" />
                {formatPropertyType(listing.propertyType)}
              </span>
            )}
            {maxGuests && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <IconGuests className="w-4 h-4 shrink-0" />
                {maxGuests} guest{maxGuests === 1 ? '' : 's'}
              </span>
            )}
            {minNights && minNights > 1 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <IconMoon className="w-4 h-4 shrink-0" />
                {minNights}+ nights
              </span>
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-gray-100">
            {nightlyRate > 0 ? (
              <p className="font-bold text-gray-900 text-xl">
                {formatINR(nightlyRate)}
                <span className="text-gray-400 font-normal text-sm"> / night</span>
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Price on request</p>
            )}
          </div>
        </div>
      </Link>

      {/* Favorite button — the only heart on the card, top-right corner of
          the image only, wired to the existing wishlist API (no backend
          changes). Hidden until the card is hovered/focused, then fades and
          scales in — kept in the DOM (not display:none) so it's still
          reachable and revealed via keyboard focus (focus-within), not just
          mouse hover. A rating badge was intentionally left out: the
          listings response this grid uses has no rating field, and fetching
          it would require a per-card N+1 request the user asked to avoid. */}
      <div className="absolute top-4 right-4 z-10 rounded-full opacity-0 scale-90 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 focus-within:opacity-100 focus-within:scale-100 focus-within:ring-2 focus-within:ring-brand-700/30 focus-within:ring-offset-2">
        <WishlistButton listingId={listing.id} size="sm" className="bg-black/20 backdrop-blur-[2px] hover:bg-black/30" />
      </div>
    </article>
  );
}
