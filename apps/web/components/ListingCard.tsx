'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatINR, reviewsApi } from '../lib/api';
import type { Listing } from '../lib/types';
import WishlistButton from './WishlistButton';

// Deterministic nature-tone gradient palette (deep forest, moss, earth)
const GRADIENTS: [string, string][] = [
  ['#0f2a1c', '#2f6349'],
  ['#1a3d2c', '#47805f'],
  ['#16241c', '#3d5a47'],
  ['#233a2b', '#6b9c80'],
  ['#1f3326', '#5c7a52'],
];

function ListingPlaceholder({ id, title }: { id: string; title: string }) {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  const gradId = `g-${id.slice(0, 8)}`;
  const label = title.length > 32 ? title.slice(0, 32) + '…' : title;

  return (
    <svg
      viewBox="0 0 600 400"
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

function IconStar({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} aria-hidden="true">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
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
  const imageUrl = listing.media?.[0]?.url;
  // First 3 real tags attached to this listing (any category) — the closest
  // existing analogue to the reference's feature badges. No "featured"/
  // "curated" concept exists in the data model, so this shows whatever real
  // tags the listing actually has rather than inventing labels.
  const featureTags = (listing.tags ?? []).slice(0, 3);

  // No rating field exists on the listings feed itself — reuses the same
  // public per-listing reviews endpoint the listing detail page already
  // calls (GET /listings/:id/reviews), rather than adding a new one.
  const [rating, setRating] = useState<{ avgRating: number; count: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    reviewsApi
      .getListingReviews(listing.id)
      .then((data) => {
        if (!cancelled) setRating(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing.id]);
  const hasRating = !!rating && rating.count > 0;

  return (
    <article className="card-hover group relative h-full overflow-hidden animate-fade-in focus-within:ring-2 focus-within:ring-brand-700/30 focus-within:ring-inset">
      <Link
        href={`/listings/${listing.id}`}
        className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-inset"
      >
        {/* Image / placeholder */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl">
          <div className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <ListingPlaceholder id={listing.id} title={listing.title} />
            )}
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/15" />

          {/* Top-left badges — property type + rating, only when the data exists */}
          <div className="absolute top-3 left-3 right-12 flex items-center gap-1.5 flex-wrap">
            {listing.propertyType && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-gray-900">
                {formatPropertyType(listing.propertyType)}
              </span>
            )}
            {hasRating && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-gray-900">
                <IconStar className="text-orange-500" />
                {rating!.avgRating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3 text-right">
            {nightlyRate > 0 ? (
              <span className="text-white font-bold text-lg" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                {formatINR(nightlyRate)}
                <span className="text-white/85 font-normal text-xs"> / night</span>
              </span>
            ) : (
              <span className="text-white/90 text-sm" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                Price on request
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {listing.title}
            </h3>
            {hasRating && (
              <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-900 mt-0.5">
                <IconStar className="text-orange-500" />
                {rating!.avgRating.toFixed(1)}
                <span className="text-gray-400">({rating!.count})</span>
              </span>
            )}
          </div>

          <p className="text-gray-500 text-xs mt-1.5">
            <span aria-hidden="true">📍</span> {listing.city}, {listing.state}
          </p>

          <p className="text-gray-500 text-sm mt-2 line-clamp-2 flex-1">
            {listing.description}
          </p>

          {featureTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {featureTags.map((listingTag) => (
                <span
                  key={listingTag.tag.id}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-brand-50 text-brand-700"
                >
                  {listingTag.tag.name}
                </span>
              ))}
            </div>
          )}

          {maxGuests && (
            <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-400 text-xs">
                <span aria-hidden="true">👥</span> Up to {maxGuests}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="absolute top-3 right-3 z-10 rounded-full focus-within:ring-2 focus-within:ring-brand-700/30 focus-within:ring-offset-2">
        <WishlistButton listingId={listing.id} size="sm" />
      </div>
    </article>
  );
}
