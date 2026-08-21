'use client';

import { useState } from 'react';
import { getMockGalleryImageUrls } from '../../lib/mockListingImage';
import type { ListingMedia } from '../../lib/types';
import StayImageGrid, { type GallerySlot } from './StayImageGrid';
import StayImageModal from './StayImageModal';

const MIN_SLOTS = 5;

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
 * Listing gallery. Photos (image/* media) fill the grid; a video (video/*
 * media) becomes the inline "cover video" shown beside the cover photo. Real
 * photos come first; when a listing has fewer than MIN_SLOTS the remainder is
 * padded with the same deterministic mock set the rest of the app uses
 * (lib/mockListingImage.ts), so the teaser always looks complete.
 */
export default function StayGallery({ listingId, title, city, state, description, propertyType, media }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const allMedia = media ?? [];
  const imageMedia = allMedia.filter((m) => m.mediaType.startsWith('image'));
  const videoUrl = allMedia.find((m) => m.mediaType.startsWith('video'))?.url ?? null;

  const realSlots: GallerySlot[] = imageMedia.map((m) => ({ url: m.url, alt: title, real: true }));
  const mockNeeded = Math.max(0, MIN_SLOTS - realSlots.length);
  const mockSlots: GallerySlot[] =
    mockNeeded > 0
      ? getMockGalleryImageUrls(listingId, mockNeeded, 700, 700).map((url) => ({ url, alt: title, real: false }))
      : [];
  const imageSlots = [...realSlots, ...mockSlots];

  const cover = imageSlots[0];
  const rest = imageSlots.slice(1);
  // With a video, the cover row is [photo | video] and everything after the
  // cover photo drops below. Without one, the 2nd photo fills the cover row's
  // right tile, so the row below starts from the 3rd photo.
  const secondCover = videoUrl ? null : rest[0] ?? null;
  const below = videoUrl ? rest : rest.slice(1);

  return (
    <>
      <StayImageGrid
        cover={cover}
        videoUrl={videoUrl}
        secondCover={secondCover}
        below={below}
        totalCount={imageSlots.length}
        onOpenGallery={() => setModalOpen(true)}
      />
      <StayImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        slots={imageSlots}
        title={title}
        city={city}
        state={state}
        description={description}
        propertyType={propertyType}
      />
    </>
  );
}
