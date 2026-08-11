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
  /** Always exactly 5 — real photos first, mock-filled for the rest (see StayGallery). */
  slots: GallerySlot[];
  /** listing.media?.length ?? 0 — the real count, independent of how many mock fillers padded the grid. */
  realCount: number;
  /** Total images available in the full gallery modal (real, or mock-filled
   * up to 5 when there are fewer real photos than that) — used only to
   * compute the last tile's "+N" / "View all" label, never hardcoded. */
  totalCount: number;
  onOpenGallery: () => void;
}

/**
 * Pure presentation: a large main tile plus a supporting bento-style grid
 * on desktop, collapsing to a single swipeable-feeling image with a
 * photo-count badge on mobile. The support grid is two asymmetric columns
 * (wider left, narrower right) rather than a flat uniform 2x2, per explicit
 * visual reference — larger gaps and a chunkier corner radius than the main
 * tile give it its own distinct "card" rhythm. Every image already has its
 * own load-failure fallback (GridImage above), independent of whether the
 * source was real or mock. The last (bottom-right) tile always doubles as
 * the "open full gallery" trigger — the only interactive image in the
 * teaser grid besides the main tile, per spec ("do not introduce
 * unnecessary functionality").
 */
export default function StayImageGrid({ slots, realCount, totalCount, onOpenGallery }: Props) {
  const [main, ...thumbs] = slots;
  const remaining = totalCount - slots.length;

  return (
    <div className="grid grid-cols-5 grid-rows-2 gap-3" style={{ aspectRatio: '3.2 / 1' }}>
      <button
        type="button"
        onClick={onOpenGallery}
        aria-label={`View all ${totalCount} photos`}
        className="group relative col-span-5 row-span-2 overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2 sm:col-span-3"
      >
        <GridImage slot={main} />
        {realCount > 1 && (
          <span className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur sm:flex">
            View all {realCount} photo{realCount === 1 ? '' : 's'}
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur sm:hidden">
          1 / {Math.max(realCount, 1)} photo{realCount === 1 ? '' : 's'}
        </span>
      </button>

      {/* Bento support grid — occupies the same outer footprint (cols 4-5,
          both rows) the old flat 2x2 used, but as its own nested grid so
          the two columns can be unequal widths. min-h-0 at every nested
          level below: grid items default to min-height:auto, which lets a
          nested grid's content (the images wanting their intrinsic size)
          override the height "stretch"d down from the aspect-ratio'd
          outermost grid — the classic grid/flex "blowout" bug, causing this
          block to render taller than the main tile and overflow into the
          content below it. min-h-0 disables that auto-minimum so every
          level actually respects the stretched height instead. */}
      <div className="col-span-2 row-span-2 hidden min-h-0 grid-cols-[1.15fr_1fr] gap-3.5 sm:grid">
        <div className="grid min-h-0 grid-rows-2 gap-3.5">
          <div className="group relative min-h-0 overflow-hidden rounded-2xl">
            <GridImage slot={thumbs[0]} />
          </div>
          <div className="group relative min-h-0 overflow-hidden rounded-2xl">
            <GridImage slot={thumbs[2]} />
          </div>
        </div>
        <div className="grid min-h-0 grid-rows-2 gap-3.5">
          <div className="group relative min-h-0 overflow-hidden rounded-2xl">
            <GridImage slot={thumbs[1]} />
          </div>
          <button
            type="button"
            onClick={onOpenGallery}
            aria-label={`View all ${totalCount} photos`}
            className="group relative min-h-0 overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
          >
            <GridImage slot={thumbs[3]} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors group-hover:bg-black/60">
              <span className="text-sm font-semibold text-white">
                {remaining > 0 ? `+${remaining} Photos` : `View all ${totalCount} photos`}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
