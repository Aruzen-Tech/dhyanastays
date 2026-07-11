'use client';

import Link from 'next/link';
import { formatINR } from '../lib/api';
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
      aria-label={title}
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

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const rateRule = listing.rateRules?.[0];
  const nightlyRate = rateRule?.baseNightlyRate ?? 0;
  const maxGuests = rateRule?.maxGuests;

  return (
    <Link href={`/listings/${listing.id}`} className="block group animate-fade-in">
      <div className="card-hover h-full flex flex-col">
        {/* Image / placeholder */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl">
          <div className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out">
            <ListingPlaceholder id={listing.id} title={listing.title} />
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Wishlist */}
          <div className="absolute top-3 right-3">
            <WishlistButton listingId={listing.id} size="sm" />
          </div>

          {/* Location pill */}
          <div className="absolute bottom-3 left-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              📍 {listing.city}, {listing.state}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3
            className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {listing.title}
          </h3>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2 flex-1">
            {listing.description}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {nightlyRate > 0 ? (
              <span className="text-brand-700 font-bold text-base">
                {formatINR(nightlyRate)}
                <span className="text-gray-400 font-normal text-xs"> / night</span>
              </span>
            ) : (
              <span className="text-gray-400 text-sm">Price on request</span>
            )}
            {maxGuests && (
              <span className="text-gray-400 text-xs">👥 Up to {maxGuests}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
