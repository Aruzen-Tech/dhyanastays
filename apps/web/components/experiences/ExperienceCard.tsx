'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '../../lib/api';
import type { Experience } from '../../lib/types';
import { IconMapPin, IconClock, IconLeaf } from '../explore-stays/icons';

// Deterministic petrol gradient palette — same family as ListingCard's
// placeholder art, so a stay card and an experience card without a photo
// still read as part of one visual system.
const GRADIENTS: [string, string][] = [
  ['#04090a', '#0e3b47'],
  ['#05100f', '#1d6371'],
  ['#03070a', '#0a2c35'],
  ['#050b0c', '#3a7f8c'],
];

/** Last-resort art when an experience has no imageUrl (or it fails to load)
 * — decorative only, never a stand-in for a real photo. */
function ExperiencePlaceholder({ id }: { id: string }) {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      <IconLeaf className="h-9 w-9 text-white/45" />
    </div>
  );
}

/** 'yoga-class' -> 'Yoga Class' — display formatting only. */
function formatCategory(value: string): string {
  return value
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

interface Props {
  experience: Experience;
}

/**
 * Every field here comes straight from the existing Experience shape
 * (lib/types.ts) — no fabricated rating/review data. The API has no rating
 * field on Experience, so unlike a typical marketplace card there is no
 * star row; seatsAvailable (real, already fetched) fills that "urgency /
 * social proof" role instead, surfaced as a badge only when scarce.
 */
export default function ExperienceCard({ experience }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPlaceholder = !experience.imageUrl || imageFailed;
  const seatsAvailable = experience.seatsAvailable;

  return (
    <article className="card-hover group relative flex h-full flex-col animate-fade-in">
      <Link
        href={`/experiences/${experience.id}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-inset"
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
          <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.045]">
            {showPlaceholder ? (
              <ExperiencePlaceholder id={experience.id} />
            ) : (
              <img
                src={experience.imageUrl ?? ''}
                alt={experience.title}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          {typeof seatsAvailable === 'number' && seatsAvailable <= 3 && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm backdrop-blur">
              {seatsAvailable === 0 ? 'Fully booked' : `${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} left`}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {formatCategory(experience.category)}
          </p>

          <h3 className="mt-1.5 font-semibold text-gray-900 leading-6 line-clamp-2 transition-colors group-hover:text-brand-700">
            {experience.title}
          </h3>

          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
            <IconMapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{experience.city}, {experience.state}</span>
          </p>

          {experience.description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">
              {experience.description}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <IconClock className="h-3.5 w-3.5 shrink-0" />
              {new Date(experience.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
            <p className="text-lg font-bold text-gray-900">
              {formatINR(experience.priceMinor)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
