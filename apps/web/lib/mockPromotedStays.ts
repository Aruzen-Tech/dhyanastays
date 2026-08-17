import { getMockListingImageUrl } from './mockListingImage';

/**
 * Mock promoted/featured stays for the Explore page's Stay Spotlight section.
 *
 * FRONTEND-ONLY placeholder data — there is no promotions endpoint yet. The
 * shape below is deliberately close to what a real `/promotions` response
 * would look like so the swap is a one-file change: replace PROMOTED_STAYS
 * with the fetched array and everything downstream keeps working.
 *
 * Two fields carry the "real value once the API supplies it, placeholder in
 * the meantime" pattern already used across this app (see mockListingImage.ts):
 *
 *   - `imageUrl`  — null today; `promotedStayImage()` falls back to the same
 *                   curated placeholder photo pool every listing card uses.
 *   - `listingId` — null today; `promotedStayHref()` falls back to an in-page
 *                   anchor to the live results grid rather than linking to a
 *                   /listings/<id> route that would 404. Delete the fallback
 *                   branch once real listing ids arrive.
 */
export interface PromotedStay {
  id: string;
  /** The stay this promotion points at. Null while this data is mocked. */
  listingId: string | null;
  title: string;
  location: string;
  description: string;
  /** Real photo once available; null falls back to the curated mock pool. */
  imageUrl: string | null;
  /**
   * Nightly rate in paise — the same unit every real rate in this app is
   * stored and formatted in, so formatINR() works unchanged after the swap.
   */
  nightlyRate: number;
  rating: number;
  reviewCount: number;
  /** Short editorial label, e.g. "Featured Stay" / "Guest Favourite". */
  badge: string;
}

export const PROMOTED_STAYS: PromotedStay[] = [
  {
    id: 'promo-1',
    listingId: null,
    title: 'The Palm Grove Retreat',
    location: 'Pondicherry, Tamil Nadu',
    description:
      'A peaceful coastal retreat wrapped in tropical gardens, five minutes from the promenade — with a shaded courtyard pool and breakfast served under the palms.',
    imageUrl: null,
    nightlyRate: 850000,
    rating: 4.9,
    reviewCount: 128,
    badge: 'Featured Stay',
  },
  {
    id: 'promo-2',
    listingId: null,
    title: 'Misty Hills Estate',
    location: 'Munnar, Kerala',
    description: 'A private hillside escape overlooking the Western Ghats.',
    imageUrl: null,
    nightlyRate: 1200000,
    rating: 4.8,
    reviewCount: 96,
    badge: 'Guest Favourite',
  },
  {
    id: 'promo-3',
    listingId: null,
    title: 'Anantha Riverside Villa',
    location: 'Coorg, Karnataka',
    description: 'Wake to birdsong and coffee blossom beside the Kaveri.',
    imageUrl: null,
    nightlyRate: 960000,
    rating: 4.9,
    reviewCount: 74,
    badge: 'Newly Curated',
  },
];

/** Real photo once the API populates it, curated mock in the meantime. */
export function promotedStayImage(stay: PromotedStay, width: number, height: number): string {
  return stay.imageUrl ?? getMockListingImageUrl(stay.id, width, height);
}

/** Anchor on the Explore page that the placeholder CTAs fall back to. */
export const EXPLORE_RESULTS_ANCHOR = 'explore-results';

/**
 * Where a promotion links. Real stay page once `listingId` exists; until then
 * the live results grid further up the same page, so a click never lands on a
 * 404 for an id that was never real.
 */
export function promotedStayHref(stay: PromotedStay): string {
  return stay.listingId ? `/listings/${stay.listingId}` : `#${EXPLORE_RESULTS_ANCHOR}`;
}
