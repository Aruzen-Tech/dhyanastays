'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, guestApi } from '../../../lib/api';
import type { Review } from '../../../lib/types';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={star <= rating ? '#f59e0b' : '#e5e7eb'}
          className="w-4 h-4"
        >
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
        </svg>
      ))}
    </div>
  );
}

export default function MyReviewsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    guestApi.getMyReviews()
      .then(setReviews)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <h1 className="page-title mb-8">My Reviews</h1>

      {error && <div className="alert-error mb-4">{error}</div>}

      {reviews.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">&#11088;</div>
          <h3 className="font-semibold text-gray-700 mb-2">No reviews yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            After completing a stay, you can leave a review to help other guests.
          </p>
          <Link href="/dashboard" className="btn-primary">Go to bookings</Link>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {review.listing && (
                  <Link
                    href={`/listings/${review.listing.id}`}
                    className="text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                  >
                    {review.listing.title} — {review.listing.city}, {review.listing.state}
                  </Link>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
