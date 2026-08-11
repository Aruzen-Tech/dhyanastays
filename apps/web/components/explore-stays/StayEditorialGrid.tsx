import ListingCard from '../ListingCard';
import type { Listing } from '../../lib/types';

/**
 * A 3-column editorial grid. Every card renders at the same fixed size —
 * `items-stretch` (the grid default) combined with `h-full` on each card
 * makes every card in a row match the row's tallest card, and ListingCard
 * itself reserves consistent space for its variable-length content so that
 * natural height is already equal before any stretching happens.
 */
export default function StayEditorialGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
