'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatINR, guestApi } from '../../../lib/api';
import type { WishlistItem } from '../../../lib/types';

export default function WishlistPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    guestApi.getWishlist()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (listingId: string) => {
    try {
      await guestApi.removeFromWishlist(listingId);
      setItems((prev) => prev.filter((i) => i.listingId !== listingId));
    } catch {
      // Silently ignore
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title">My Wishlist</h1>
        <Link href="/" className="btn-secondary text-sm">
          Explore stays
        </Link>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {items.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">&#10084;&#65039;</div>
          <h3 className="font-semibold text-gray-700 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-400 text-sm mb-6">
            Save your favourite stays by tapping the heart icon on any listing.
          </p>
          <Link href="/" className="btn-primary">Discover stays</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const listing = item.listing;
          const rate = listing.rateRules?.[0]?.baseNightlyRate ?? 0;
          return (
            <div key={item.id} className="card-hover group relative">
              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.listingId)}
                className="absolute top-3 right-3 z-10 p-1.5 bg-white/90 backdrop-blur rounded-full text-red-500 hover:text-red-600 hover:bg-white transition-all shadow-sm"
                aria-label="Remove from wishlist"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>

              <Link href={`/listings/${listing.id}`} className="block">
                {/* Image placeholder */}
                <div className="h-48 bg-brand-100 rounded-t-xl overflow-hidden">
                  {listing.media?.[0] ? (
                    <img src={listing.media[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-300 text-4xl">
                      &#127969;
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-base line-clamp-1 group-hover:text-brand-700 transition-colors">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {listing.city}, {listing.state}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    {rate > 0 ? (
                      <span className="text-brand-700 font-bold">
                        {formatINR(rate)}<span className="text-gray-400 font-normal text-sm"> / night</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Price on request</span>
                    )}
                    {listing.rateRules?.[0]?.maxGuests && (
                      <span className="text-gray-400 text-xs">{listing.rateRules[0].maxGuests} guests</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
