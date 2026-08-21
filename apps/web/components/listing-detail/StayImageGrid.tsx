'use client';

import { useState } from 'react';

export interface GallerySlot {
  url: string;
  alt: string;
  /** False for slots filled by the mock placeholder set — see StayGallery. */
  real: boolean;
}

export function GridImage({ slot }: { slot: GallerySlot }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="h-full w-full bg-gradient-to-br from-brand-100 to-brand-50" aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slot.url}
      alt={slot.alt}
      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

interface Props {
  /** The cover photo (first image). */
  cover: GallerySlot;
  /** The cover video (short promo) shown inline next to the cover photo. */
  videoUrl?: string | null;
  /** Poster for the cover video (the cover photo). */
  posterUrl?: string;
  /** When there's no cover video, a second photo fills the cover row's right tile. */
  secondCover?: GallerySlot | null;
  /** Remaining photos shown in a row beneath the cover medias. */
  below: GallerySlot[];
  /** Total real photos (drives the "view all / +N" label). */
  totalCount: number;
  onOpenGallery: () => void;
}

const BELOW_MAX = 4;

/**
 * Listing gallery teaser. Two cover medias sit side by side — the cover photo
 * and the cover video (a short promo that plays inline) — with the remaining
 * photos in a row underneath. Clicking any photo tile opens the full gallery
 * modal; the video plays in place. Each image keeps its own load-failure
 * fallback (GridImage).
 */
export default function StayImageGrid({
  cover,
  videoUrl,
  posterUrl,
  secondCover,
  below,
  totalCount,
  onOpenGallery,
}: Props) {
  const belowShown = below.slice(0, BELOW_MAX);
  // Photos already surfaced: the cover, plus the second cover tile when it's a
  // photo (i.e. there's no video), plus the ones in the row below.
  const surfaced = 1 + (!videoUrl && secondCover ? 1 : 0) + belowShown.length;
  const remaining = Math.max(0, totalCount - surfaced);

  return (
    <div>
      {/* Cover medias — photo + video side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenGallery}
          aria-label={`View all ${totalCount} photos`}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
        >
          <GridImage slot={cover} />
          {totalCount > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              View all {totalCount} photo{totalCount === 1 ? '' : 's'}
            </span>
          )}
        </button>

        {videoUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-900">
            <video
              src={videoUrl}
              poster={posterUrl}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              ▶ Property video
            </span>
          </div>
        ) : secondCover ? (
          <button
            type="button"
            onClick={onOpenGallery}
            aria-label={`View all ${totalCount} photos`}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
          >
            <GridImage slot={secondCover} />
          </button>
        ) : (
          <div className="hidden rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 sm:block" aria-hidden="true" />
        )}
      </div>

      {/* Remaining photos */}
      {belowShown.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {belowShown.map((slot, i) => {
            const isLast = i === belowShown.length - 1;
            return (
              <button
                key={i}
                type="button"
                onClick={onOpenGallery}
                aria-label={`View all ${totalCount} photos`}
                className="group relative aspect-square overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
              >
                <GridImage slot={slot} />
                {isLast && remaining > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 transition-colors group-hover:bg-black/65">
                    <span className="text-sm font-semibold text-white">+{remaining} Photos</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
