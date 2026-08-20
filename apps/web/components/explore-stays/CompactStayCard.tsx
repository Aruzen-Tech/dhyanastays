'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '../../lib/api';
import { getMockListingImageUrl } from '../../lib/mockListingImage';
import type { Listing } from '../../lib/types';
import { useTilt } from '../../hooks/useTilt';
import WishlistButton from '../WishlistButton';
import { IconMapPin } from './icons';

/**
 * Compact discovery card for the horizontal stays carousel.
 *
 * Deliberately a narrower read than ListingCard, which stays the card for any
 * full-width grid: this one carries only photo → name → location → price. The
 * propertyType / maxGuests / minNights metadata row and the bordered price
 * footer are dropped, because at carousel width they wrap to two lines and
 * turn a browsable row into a wall of small text. No listing field is
 * *removed* from the app — ListingCard still shows all of it, and the stay
 * page shows more still.
 *
 * The wishlist heart is kept. It is real, wired functionality (not a
 * decorative badge), so dropping it would remove a working feature rather
 * than simplify the card; it stays hidden until hover/focus, exactly as on
 * ListingCard, so it costs the compact layout nothing at rest.
 *
 * ─── Depth ───────────────────────────────────────────────────────────────
 * The card is built as a shallow 3D scene rather than a flat rectangle:
 *
 *   - `perspective` sits on the outer <article>, because a perspective only
 *     applies to an element's *children* — putting it on the rotating layer
 *     itself would produce a flat, sheared rotation with no foreshortening.
 *   - The rotating layer leans toward the cursor (see useTilt) and carries
 *     `transform-style: preserve-3d`, without which every descendant would be
 *     flattened into that layer's plane and the translateZ offsets below
 *     would do nothing at all.
 *   - Photo, text and heart sit at three different Z depths, so they part
 *     slightly as the card turns. That parallax is what sells the effect —
 *     rotation alone reads as a tilted picture, not a raised object.
 *   - The shadow deepens and drops further on hover, so the card reads as
 *     lifting off the page rather than merely rotating in place.
 *
 * All of it is tuned low — 4° of tilt, a 3px rise, a 1.03 photo scale. The
 * intent is that the card feels like a physical object with weight, not that
 * an animation is playing.
 *
 * Everything above is inert without a fine pointer, and is suppressed
 * entirely under prefers-reduced-motion — see useTilt.
 */
export default function CompactStayCard({ listing }: { listing: Listing }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { ref, enabled, onPointerMove, onPointerLeave } = useTilt<HTMLElement>();

  const nightlyRate = listing.rateRules?.[0]?.baseNightlyRate ?? 0;
  // Real photo once the API populates it, mock in the meantime — same
  // resolution order ListingCard uses (lib/mockListingImage.ts).
  const photoUrl = listing.media?.[0]?.url ?? getMockListingImageUrl(listing.id, 600, 450);

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group relative [perspective:900px]"
    >
      <div
        className="[transform-style:preserve-3d] [--lift:0px] transition-transform duration-300 ease-out group-hover:[--lift:-3px]"
        style={{
          transform:
            'translateY(var(--lift, 0px)) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
        }}
      >
        <Link
          href={`/listings/${listing.id}`}
          className="block rounded-3xl [transform-style:preserve-3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
        >
          {/*
            The card frame. `p-2` is what produces the visible inset border —
            the card's own surface showing as an 8px margin around the photo,
            rather than a drawn outline.

            Radii are concentric by construction: outer 24px = inner 16px +
            8px padding. Get that wrong and the corners look subtly warped,
            because the gap between the two curves narrows as it rounds.

            Deliberately NOT `overflow-hidden` — the photo clips itself, and
            per spec `overflow` other than `visible` forces `transform-style`
            back to `flat`, which would collapse every translateZ below into
            this plane and kill the parallax.
          */}
          {/* Shadow geometry, both states: a box-shadow reaches
              `spread + blur/2` past each edge, and `y-offset` shifts that
              window down. Both spreads here are set ~4px more negative than
              half their blur, which pulls the shadow off the left and right
              edges entirely while the y-offset still lets it fall below the
              card. That is why it now reads as sitting on the page rather
              than glowing on all four sides. */}
          <div className="rounded-3xl border border-gray-100 bg-white p-2 shadow-[0_6px_12px_-10px_rgba(17,24,39,0.18)] transition-shadow duration-300 ease-out [transform-style:preserve-3d] group-hover:shadow-[0_12px_20px_-14px_rgba(17,24,39,0.22)]">
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 [transform:translateZ(16px)]"
            >
              {imageFailed ? (
                <div
                  className="absolute inset-0 bg-gradient-to-br from-brand-200 to-brand-500"
                  aria-hidden="true"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={listing.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                />
              )}

              {/* Specular highlight tracking the cursor — the cue that reads as
                  a surface catching light, which a rotation alone cannot give.
                  Rendered only where the tilt is actually active. */}
              {enabled && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                  style={{
                    background:
                      'radial-gradient(200px circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgba(255,255,255,0.18), transparent 60%)',
                  }}
                />
              )}
            </div>

            {/* Sits inside the frame, aligned to the photo's edges. Held nearer
                the page than the photo so the two separate slightly as the card
                turns. */}
            <div className="px-1 pb-1 pt-3 [transform:translateZ(8px)]">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand-700">
                {listing.title}
              </h3>

              {/* Smaller and lighter than the title so the two read as a
                  hierarchy at a glance rather than as two equal lines. */}
              <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-4 text-gray-400">
                <IconMapPin className="h-3 w-3 shrink-0 text-gray-300" />
                <span className="truncate">
                  {listing.city}, {listing.state}
                </span>
              </p>

              {nightlyRate > 0 ? (
                <p className="mt-1.5 text-sm font-bold text-gray-900">
                  {formatINR(nightlyRate)}
                  <span className="font-normal text-gray-400"> / night</span>
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-gray-400">Price on request</p>
              )}
            </div>
          </div>
        </Link>

        {/* Outside the Link so the heart is its own control, not part of the
            card's click target — same arrangement as ListingCard. Sits at the
            front of the stack so it stays clear of the photo as it turns.

            Depth and the reveal transition are on two separate elements on
            purpose: `scale-90` and `[transform:translateZ()]` both write the
            same `transform` property, so on one element whichever rule the
            stylesheet emits last silently wins. */}
        <div className="absolute right-4 top-4 z-10 [transform:translateZ(34px)]">
          <div className="rounded-full opacity-0 scale-90 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 focus-within:opacity-100 focus-within:scale-100">
            <WishlistButton
              listingId={listing.id}
              size="sm"
              className="bg-black/20 backdrop-blur-[2px] hover:bg-black/30"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
