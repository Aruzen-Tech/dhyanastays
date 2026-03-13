'use client';

import Link from 'next/link';
import { formatINR } from '../lib/api';
import type { Listing } from '../lib/types';

// Deterministic gradient palette — no external network requests
const GRADIENTS: [string, string][] = [
  ['#1a5c4a', '#2d8268'],
  ['#2d5a8e', '#4a7fb5'],
  ['#6b3a2a', '#9c5a3c'],
  ['#4a3a6b', '#7a5a9c'],
  ['#3a5a2a', '#5a8a3c'],
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
    <Link href={`/listings/${listing.id}`} className="block group">
      <div className="card-hover">
        {/* Placeholder image */}
        <div className="relative h-52 bg-brand-100 overflow-hidden">
          <div className="w-full h-full group-hover:scale-105 transition-transform duration-300">
            <ListingPlaceholder id={listing.id} title={listing.title} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="bg-white/90 backdrop-blur text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
              📍 {listing.city}, {listing.state}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
            {listing.title}
          </h3>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
            {listing.description}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div>
              {nightlyRate > 0 ? (
                <span className="text-brand-700 font-bold text-base">
                  {formatINR(nightlyRate)}
                  <span className="text-gray-400 font-normal text-sm"> / night</span>
                </span>
              ) : (
                <span className="text-gray-400 text-sm">Price on request</span>
              )}
            </div>
            {maxGuests && (
              <span className="text-gray-400 text-xs">👥 {maxGuests} guests</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
