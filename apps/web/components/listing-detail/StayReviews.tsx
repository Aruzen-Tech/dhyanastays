import { formatDate } from '../../lib/api';
import type { ListingReviews } from '../../lib/types';

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? '#A6814B' : '#E5E7EB'} className={cls}>
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
        </svg>
      ))}
    </div>
  );
}

interface Props {
  listingReviews: ListingReviews;
}

/**
 * The 5/4/3/2/1-star breakdown bars are a real distribution computed from
 * listingReviews.reviews[].rating (already-fetched data) — not a fabricated
 * chart. No new field or endpoint; purely a client-side bucket count.
 */
export default function StayReviews({ listingReviews }: Props) {
  const { avgRating, count, reviews } = listingReviews;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => Math.round(r.rating) === star).length;
    return { star, n, pct: count > 0 ? Math.round((n / count) * 100) : 0 };
  });

  return (
    <div className="card p-6 lg:p-7">
      <h2 className="mb-4 font-semibold text-gray-900">Guest reviews</h2>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center sm:items-start">
          <p className="text-4xl font-bold text-gray-900">{avgRating}</p>
          <StarRow rating={avgRating} size="md" />
          <p className="mt-1 text-sm text-gray-400">{count} review{count === 1 ? '' : 's'}</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, n, pct }) => (
            <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 shrink-0 tabular-nums">{star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
        {reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
            <div className="mb-1.5 flex items-center gap-3">
              {review.user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                  {(review.user?.fullName ?? 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{review.user?.fullName ?? 'Guest'}</p>
                <div className="flex items-center gap-2">
                  <StarRow rating={review.rating} />
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>
            {review.comment && (
              <p className="ml-11 text-sm leading-relaxed text-gray-600">{review.comment}</p>
            )}
          </div>
        ))}
        {count > 5 && (
          <p className="text-center text-sm text-gray-400">Showing 5 of {count} reviews</p>
        )}
      </div>
    </div>
  );
}
