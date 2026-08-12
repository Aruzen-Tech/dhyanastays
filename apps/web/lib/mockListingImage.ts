/**
 * Temporary mock listing photos. The /listings API doesn't populate `media`
 * for any listing yet — every consumer already prefers `listing.media[0]`
 * (or the real array) when it's present, so once the backend starts
 * returning real photos, each consumer switches to them automatically and
 * these stop being used for that listing. No other change needed then.
 *
 * Picsum Photos (https://picsum.photos) is a public "Lorem Ipsum for
 * images" placeholder service. Its default seed-based endpoint hands back
 * *any* photo in its library for a given seed — landscapes, but just as
 * often a random object, a city street, someone's phone — which read as
 * obviously wrong next to real hospitality content. CURATED_PHOTO_IDS below
 * is a hand-checked set of Picsum's fixed-ID photos, verified by eye to
 * actually look like real houses/villas worth staying in — exteriors,
 * courtyards, village streets, and room interiors — and deliberately
 * ordered so that any 5 consecutive entries (wrapping) mix those themes
 * rather than all landing on the same category for a given listing.
 */
const CURATED_PHOTO_IDS = [
  116,  // Tuscan hillside villa, cypress-lined driveway
  42,   // sunlit interior dining table by a window
  49,   // whitewashed hillside village houses
  691,  // bedroom detail — bed linens, morning coffee
  142,  // grand countryside estate, tree-lined approach
  322,  // cobblestone village alley between terracotta buildings
  311,  // quiet interior corner, shuttered window and chair
  397,  // cliffside coastal village houses
  625,  // modern dining nook, wood table and chairs
  859,  // red-painted cottage facade with white door
  1059, // cozy interior vignette, framed art and shelving
  946,  // yellow cottage facade with green door and shutters
  1040, // hillside castle estate framed by forest
  163,  // plant-filled outdoor café patio
  947,  // whitewashed courtyard with terracotta pot
  369,  // colorful village street with balconies
  1065, // village alley opening to the sea
];

/** Small stable string hash — deterministic across renders/reloads, no crypto needed. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function photoIdAt(offset: number, index: number): number {
  return CURATED_PHOTO_IDS[(offset + index) % CURATED_PHOTO_IDS.length];
}

/** Same curated photo for the same listing every time — used for card art,
 * hero fallbacks and the video poster fallback. */
export function getMockListingImageUrl(listingId: string, width: number, height: number): string {
  const offset = hashString(listingId) % CURATED_PHOTO_IDS.length;
  return `https://picsum.photos/id/${photoIdAt(offset, 0)}/${width}/${height}`;
}

/**
 * Same curated pool, extended to a set — used to fill out the gallery
 * grid's supporting-image slots when a listing has fewer real photos than
 * the grid has room for (currently every listing). Walks `count`
 * consecutive entries starting from a per-listing offset (wrapping around
 * the pool), so every slot in one listing's grid is a distinct, themed-
 * varied photo, stable across reloads.
 */
export function getMockGalleryImageUrls(listingId: string, count: number, width: number, height: number): string[] {
  const offset = hashString(listingId) % CURATED_PHOTO_IDS.length;
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/id/${photoIdAt(offset, i)}/${width}/${height}`);
}
