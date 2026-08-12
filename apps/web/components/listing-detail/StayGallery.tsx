'use client';

import { useState } from 'react';
import { getMockGalleryImageUrls } from '../../lib/mockListingImage';
import type { ListingMedia } from '../../lib/types';
import StayImageGrid, { type GallerySlot } from './StayImageGrid';
import StayImageModal from './StayImageModal';

const GRID_SIZE = 5;

interface Props {
  listingId: string;
  title: string;
  city: string;
  state: string;
  description: string;
  propertyType?: string | null;
  media?: ListingMedia[];
}

/**
 * Same "real photo once the API populates it, mock in the meantime" rule
 * every other gallery in this app follows (lib/mockListingImage.ts) —
 * extended per-slot rather than per-listing, since this composition needs
 * up to 5 teaser images. Real photos (listing.media, in order) fill the
 * first slots; any remaining slots get a deterministic mock photo so the
 * grid always looks complete today. Once the API starts returning 5+ real
 * photos for a listing, every teaser slot is real automatically.
 *
 * modalSlots is the *full* set the "view all" lightbox opens to: every real
 * photo when there are more than 5 (not just the teaser's first 5), or the
 * same mock-filled set as the teaser when there's nothing more to show.
 */
export default function StayGallery({ listingId, title, city, state, description, propertyType, media }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const realMedia = media ?? [];

  const teaserRealSlots: GallerySlot[] = realMedia
    .slice(0, GRID_SIZE)
    .map((m) => ({ url: m.url, alt: title, real: true }));
  const mockNeeded = GRID_SIZE - teaserRealSlots.length;
  const mockSlots: GallerySlot[] =
    mockNeeded > 0
      ? getMockGalleryImageUrls(listingId, mockNeeded, 700, 700).map((url) => ({ url, alt: title, real: false }))
      : [];
  const teaserSlots = [...teaserRealSlots, ...mockSlots];

  const modalSlots: GallerySlot[] =
    realMedia.length > GRID_SIZE
      ? realMedia.map((m) => ({ url: m.url, alt: title, real: true }))
      : teaserSlots;

  return (
    <>
      <StayImageGrid
        slots={teaserSlots}
        realCount={realMedia.length}
        totalCount={modalSlots.length}
        onOpenGallery={() => setModalOpen(true)}
      />
      <StayImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        slots={modalSlots}
        title={title}
        city={city}
        state={state}
        description={description}
        propertyType={propertyType}
      />
    </>
  );
}
