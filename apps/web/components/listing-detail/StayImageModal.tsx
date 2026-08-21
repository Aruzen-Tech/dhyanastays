'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';
import { IconMapPin, IconX } from '../explore-stays/icons';
import { GridImage, type GallerySlot } from './StayImageGrid';

/** 'boutique-hotel' -> 'Boutique Hotel' — display formatting only. */
function formatPropertyType(value: string): string {
  return value
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Placeholder rating shown in the gallery panel until this modal is wired
 * to a listing's real review data (same "hardcode now, wire up later" call
 * the reviews section elsewhere already makes with real data — this one is
 * genuinely static for now, per explicit product direction). Swap for a
 * real `avgRating` prop once available; nothing else here needs to change.
 */
const PLACEHOLDER_RATING = 4.8;

/** Same star-row visual as StayReviews.tsx's StarRow, inlined here since
 * that one isn't exported — kept visually identical (gold fill, same path). */
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? '#A6814B' : '#E5E7EB'}
          className="h-3.5 w-3.5"
        >
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
        </svg>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** The full image set — real photos beyond the teaser grid's 5 slots
   * included when there are more than 5, so "view all" genuinely means
   * all. See StayGallery for how this is computed. */
  slots: GallerySlot[];
  title: string;
  city: string;
  state: string;
  description: string;
  propertyType?: string | null;
}

/**
 * Full-gallery lightbox. Reuses useScrollLock (the same hook the mobile nav
 * drawer uses) rather than a second hand-rolled body-scroll toggle, and
 * GridImage (StayImageGrid's own fallback-aware image) so a failed load
 * here degrades the same way it does in the teaser grid.
 *
 * Portaled straight to document.body rather than rendered in place: `<main>`
 * in the root layout carries a permanent (fill-mode `both`) transform from
 * its page-enter animation, which per the CSS spec makes it the containing
 * block for any `position: fixed` descendant instead of the viewport — so a
 * plain `fixed inset-0` nested inside `<main>` silently stops covering the
 * real viewport (confirmed: the sticky navbar, which lives outside `<main>`,
 * was still receiving clicks through it). Portaling is the standard fix and
 * avoids touching that shared layout/animation for one page's modal.
 */
export default function StayImageModal({ open, onClose, slots, title, city, state, description, propertyType }: Props) {
  useScrollLock(open);

  // Single-photo full-screen viewer (opened by clicking a photo in the grid).
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const viewerStep = useCallback(
    (delta: number) =>
      setViewerIndex((p) => (p === null ? p : (p + delta + slots.length) % slots.length)),
    [slots.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape closes the single-photo viewer first, then the gallery.
        if (viewerIndex !== null) closeViewer();
        else onClose();
      } else if (viewerIndex !== null && e.key === 'ArrowLeft') {
        viewerStep(-1);
      } else if (viewerIndex !== null && e.key === 'ArrowRight') {
        viewerStep(1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, viewerIndex, closeViewer, viewerStep]);

  // Close the viewer whenever the gallery itself closes.
  useEffect(() => {
    if (!open) setViewerIndex(null);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-0 sm:p-6 lg:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo gallery`}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white sm:rounded-2xl lg:h-[85vh] lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-md transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>

        {/* Left ~25%: stay context */}
        <div className="min-h-0 shrink-0 overflow-y-auto border-b border-gray-100 p-6 lg:w-1/4 lg:border-b-0 lg:border-r lg:border-gray-100">
          <h2 className="pr-8 text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <IconMapPin className="h-4 w-4 shrink-0 text-gray-400" />
            {city}, {state}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <StarRow rating={PLACEHOLDER_RATING} />
            <span className="text-sm font-semibold text-gray-900">{PLACEHOLDER_RATING.toFixed(1)}</span>
          </div>
          {propertyType && (
            <span className="mt-3 inline-block rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {formatPropertyType(propertyType)}
            </span>
          )}
          {description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-500">{description}</p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            {slots.length} photo{slots.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Right ~75%: full image grid. Extra top padding (pt-16, same at
            every breakpoint since the close button's size/offset don't
            change) clears the absolutely-positioned close button above,
            which would otherwise sit on top of the first row of images. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-16 sm:p-7 sm:pt-16 lg:p-8 lg:pt-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {slots.map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewerIndex(i)}
                aria-label={`View photo ${i + 1} full size`}
                className="group aspect-square cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                <GridImage slot={slot} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Single-photo full-screen viewer, above the gallery grid. */}
      {viewerIndex !== null && slots[viewerIndex] && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            // Don't let the click bubble to the gallery backdrop (which closes it).
            e.stopPropagation();
            closeViewer();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${viewerIndex + 1} of ${slots.length}`}
        >
          <button
            type="button"
            onClick={closeViewer}
            aria-label="Close photo"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <IconX className="h-4 w-4" />
          </button>

          {slots.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  viewerStep(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  viewerStep(1);
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          <div className="flex max-h-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slots[viewerIndex].url}
              alt={slots[viewerIndex].alt || `Photo ${viewerIndex + 1}`}
              className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain"
            />
            <p className="mt-3 text-sm text-white/80">
              {viewerIndex + 1} / {slots.length}
            </p>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
