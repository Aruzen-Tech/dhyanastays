'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getMockListingImageUrl } from '../../lib/mockListingImage';
import type { Listing } from '../../lib/types';

interface Props {
  /** First few listings from the already-loaded catalog (allListings in
   * app/page.tsx) — real data, not fabricated. Renders a loading skeleton
   * in the same geometry while this is still empty (before the initial
   * fetch resolves). */
  listings: Listing[];
  /** Real listing count — same value the old HeroArt illustration showed. */
  stayCount?: number;
}

function Tile({ listing, tall }: { listing: Listing; tall?: boolean }) {
  const [failed, setFailed] = useState(false);
  // Real photo once the API populates it, mock in the meantime — same
  // fallback chain as ListingCard (see lib/mockListingImage.ts).
  const photoUrl = listing.media?.[0]?.url ?? getMockListingImageUrl(listing.id, 480, 480);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group relative block overflow-hidden rounded-3xl bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2 ${tall ? 'row-span-2' : ''}`}
    >
      {failed ? (
        <div className="h-full w-full bg-gradient-to-br from-brand-200 to-brand-500" aria-hidden="true" />
      ) : (
        <img
          src={photoUrl}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="pointer-events-none absolute inset-x-3 bottom-3 truncate text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {listing.title}
      </p>
    </Link>
  );
}

/**
 * Editorial image collage — replaces the old illustrated circular hero art
 * with real (or, until the API returns photos, mock-placeholder) property
 * photography: an asymmetric stacked grid in the Airbnb/Sonder mould,
 * showcasing actual curated stays rather than a decorative graphic.
 */
export default function HeroShowcase({ listings, stayCount }: Props) {
  const tiles = listings.slice(0, 3);

  return (
    <div className="relative mx-auto w-full max-w-[420px] pb-6">
      <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4" style={{ aspectRatio: '4 / 3.3' }}>
        {tiles.length > 0 ? (
          tiles.map((listing, index) => (
            <Tile key={listing.id} listing={listing} tall={index === 0} />
          ))
        ) : (
          <>
            <div className="skeleton row-span-2 rounded-3xl" aria-hidden="true" />
            <div className="skeleton rounded-3xl" aria-hidden="true" />
            <div className="skeleton rounded-3xl" aria-hidden="true" />
          </>
        )}
      </div>

      {stayCount ? (
        <div className="absolute bottom-0 left-4 rounded-full bg-white/95 px-4 py-2 shadow-glass backdrop-blur">
          <p className="whitespace-nowrap text-xs font-medium text-gray-700">
            <span className="font-semibold text-brand-700">{stayCount}</span> curated stays across India
          </p>
        </div>
      ) : null}
    </div>
  );
}
