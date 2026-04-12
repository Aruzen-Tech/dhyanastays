'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { guestApi } from '../lib/api';

interface Props {
  listingId: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function WishlistButton({ listingId, className = '', size = 'md' }: Props) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;
    guestApi.isWishlisted(listingId)
      .then(({ wishlisted: w }) => setWishlisted(w))
      .catch(() => {});
  }, [listingId, user]);

  if (!user || user.role !== 'GUEST') return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (wishlisted) {
        await guestApi.removeFromWishlist(listingId);
        setWishlisted(false);
      } else {
        await guestApi.addToWishlist(listingId);
        setWishlisted(true);
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`p-1.5 rounded-full transition-all ${
        wishlisted
          ? 'text-red-500 hover:text-red-600'
          : 'text-white/80 hover:text-white'
      } ${loading ? 'opacity-50' : ''} ${className}`}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={wishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        className={iconSize}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
