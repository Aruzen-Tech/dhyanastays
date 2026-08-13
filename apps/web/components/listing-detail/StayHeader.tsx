'use client';

import StatusBadge from '../StatusBadge';
import WishlistButton from '../WishlistButton';
import { IconMapPin } from '../explore-stays/icons';
import type { Listing, ListingReviews } from '../../lib/types';

function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#A6814B" className={className}>
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
    </svg>
  );
}

interface Props {
  listing: Listing;
  listingReviews: ListingReviews | null;
  canMessageHost: boolean;
  onMessageHost: () => void;
}

export default function StayHeader({ listing, listingReviews, canMessageHost, onMessageHost }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <IconMapPin className="h-4 w-4 shrink-0 text-gray-400" />
            {listing.city}, {listing.state}, {listing.country}
          </p>
          {listingReviews && listingReviews.count > 0 && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <StarIcon className="h-4 w-4" />
              <span className="font-semibold text-gray-900">{listingReviews.avgRating}</span>
              <span className="text-gray-400">({listingReviews.count})</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canMessageHost && (
          <button
            onClick={onMessageHost}
            className="btn-ghost hidden items-center gap-1.5 text-sm sm:flex"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message Host
          </button>
        )}
        <WishlistButton listingId={listing.id} size="md" className="!text-gray-400 hover:!text-red-500" />
        <StatusBadge status={listing.status} />
      </div>
    </div>
  );
}
