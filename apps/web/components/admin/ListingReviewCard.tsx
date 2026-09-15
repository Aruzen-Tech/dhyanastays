'use client';

import Link from 'next/link';
import { useState } from 'react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../lib/api';
import type { PendingListing } from '../../lib/types';

const DECISION_STYLE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CHANGES_REQUESTED: 'bg-amber-100 text-amber-700',
};

const FIELD_LABEL: Record<string, string> = {
  city: 'City',
  state: 'State',
  country: 'Country',
  description: 'Description',
};

function text(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/**
 * A listing awaiting moderation, with everything a reviewer needs to decide
 * without leaving the page.
 *
 * The deliberate emphasis: the media the host is being judged on is shown
 * first, and for a re-approval the before/after diff sits above everything
 * else — that is the entire question being asked.
 */
export default function ListingReviewCard({
  listing,
  selected,
  onToggleSelect,
  note,
  onNoteChange,
  processing,
  onAction,
}: {
  listing: PendingListing;
  selected: boolean;
  onToggleSelect: () => void;
  note: string;
  onNoteChange: (v: string) => void;
  processing: boolean;
  onAction: (type: 'approve' | 'reject' | 'request_changes') => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isReapproval = listing.reviewType === 'REAPPROVAL';
  const diffEntries = Object.entries(listing.diff ?? {});
  const photos = (listing.media ?? []).filter((m) => m.mediaType.startsWith('image'));
  const videos = (listing.media ?? []).filter((m) => m.mediaType.startsWith('video'));
  const rate = listing.rateRules?.[0];
  const hasCoverVideo = videos.length > 0 || !!listing.instagramUrl;

  return (
    <div
      className={`card mb-5 overflow-hidden ${selected ? 'ring-2 ring-brand-300' : ''}`}
    >
      {/* ── Header ── */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${listing.title}`}
            className="rounded border-gray-300 mt-1 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={listing.status} />
              {isReapproval ? (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Re-approval
                </span>
              ) : (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  New listing
                </span>
              )}
              {listing.propertyType && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {listing.propertyType}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{listing.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              📍 {listing.city}, {listing.state}, {listing.country}
              {listing.latitude != null && listing.longitude != null ? (
                <>
                  {' · '}
                  <a
                    href={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    verify pin
                  </a>
                </>
              ) : (
                <span className="text-amber-600"> · no map pin set</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Submitted {formatDate(listing.submittedAt)} · ID {listing.id.slice(0, 12)}…
            </p>
          </div>
          <Link
            href={`/admin/listings/${listing.id}`}
            className="btn-ghost text-xs py-1.5 px-3 shrink-0"
          >
            Full detail →
          </Link>
        </div>
      </div>

      {/* ── What changed (re-approval only) ── */}
      {isReapproval && (
        <div className="mx-6 mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-800 mb-2">
            What the host changed
          </p>
          {diffEntries.length === 0 ? (
            <p className="text-sm text-orange-800">
              Re-approval was triggered before change tracking existed, so the previous values
              weren’t recorded. Compare against the live listing before deciding.
            </p>
          ) : (
            <dl className="space-y-3">
              {diffEntries.map(([field, entry]) => (
                <div key={field}>
                  <dt className="text-xs font-medium text-orange-900 mb-1">
                    {FIELD_LABEL[field] ?? field}
                  </dt>
                  <dd className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/70 border border-orange-200 p-2">
                      <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
                        Before
                      </span>
                      <span className="text-gray-500 line-through break-words">
                        {text(entry.before)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-white border border-orange-300 p-2">
                      <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
                        After
                      </span>
                      <span className="text-gray-900 font-medium break-words">
                        {text(entry.after)}
                      </span>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* ── Media: what we're actually approving ── */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Media
          </p>
          <p className="text-xs">
            <span className={listing.photoCount >= 5 ? 'text-green-600' : 'text-red-600'}>
              {listing.photoCount} photo{listing.photoCount === 1 ? '' : 's'}
            </span>
            <span className="text-gray-300"> · </span>
            <span className={hasCoverVideo ? 'text-green-600' : 'text-red-600'}>
              {videos.length} video{videos.length === 1 ? '' : 's'}
              {listing.instagramUrl ? ' + Instagram' : ''}
            </span>
          </p>
        </div>

        {photos.length === 0 && videos.length === 0 ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            No media uploaded — this should not have passed the submit gate.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightbox(m.url)}
                className="shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  className="h-24 w-32 object-cover bg-gray-100"
                  loading="lazy"
                />
              </button>
            ))}
            {videos.map((m) => (
              <video
                key={m.id}
                src={m.url}
                controls
                preload="metadata"
                className="shrink-0 h-24 w-32 rounded-lg border border-gray-200 bg-black object-cover"
              />
            ))}
          </div>
        )}

        {(listing.youtubeUrl || listing.instagramUrl) && (
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {listing.youtubeUrl && (
              <a
                href={listing.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                ▶ YouTube property video
              </a>
            )}
            {listing.instagramUrl && (
              <a
                href={listing.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                ◎ Instagram cover video
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Description ── */}
      <div className="px-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Description
        </p>
        <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>
      </div>

      {/* ── Host + pricing + facets ── */}
      <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Host
          </p>
          {listing.host ? (
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-900">{listing.host.user.fullName}</p>
              <p className="text-gray-500">{listing.host.user.email}</p>
              {listing.host.user.phone && (
                <p className="text-gray-500">{listing.host.user.phone}</p>
              )}
              <p className="text-xs text-gray-400 pt-1">
                Host since {formatDate(listing.host.createdAt)} ·{' '}
                {listing.host._count.listings} listing
                {listing.host._count.listings === 1 ? '' : 's'} ·{' '}
                <span
                  className={
                    listing.host.verificationStatus === 'APPROVED'
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }
                >
                  {listing.host.verificationStatus.toLowerCase()}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Host details unavailable</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Pricing &amp; stay rules
          </p>
          {rate ? (
            <div className="text-sm text-gray-600 space-y-1 tabular-nums">
              <p>
                <span className="text-gray-900 font-medium">
                  ₹{(rate.baseNightlyRate / 100).toLocaleString('en-IN')}
                </span>{' '}
                per night
              </p>
              <p>Cleaning ₹{(rate.cleaningFee / 100).toLocaleString('en-IN')}</p>
              <p>
                Min {rate.minNights} night{rate.minNights === 1 ? '' : 's'} · up to{' '}
                {rate.maxGuests} guests
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600">No rate rule set</p>
          )}
          {(listing.experienceTags?.length || listing.dietaryOptions?.length) && (
            <div className="flex flex-wrap gap-1 mt-3">
              {listing.experienceTags?.map((t) => (
                <span key={t} className="text-[11px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
              {listing.dietaryOptions?.map((t) => (
                <span key={t} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Prior decisions ── */}
      {listing.previousReviews.length > 0 && (
        <div className="mx-6 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Previously reviewed
          </p>
          <ul className="space-y-2">
            {listing.previousReviews.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2 flex-wrap">
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                    DECISION_STYLE[r.decision] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {r.decision.replace('_', ' ').toLowerCase()}
                </span>
                <span className="text-xs text-gray-400">
                  {r.decidedAt ? formatDate(r.decidedAt) : ''}
                </span>
                {r.note && <span className="text-gray-600 basis-full">“{r.note}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Decision ── */}
      <div className="p-5 bg-gray-50 border-t border-gray-100">
        <div className="mb-3">
          <label className="label text-xs" htmlFor={`note-${listing.id}`}>
            Note (required for reject / changes)
          </label>
          <input
            id={`note-${listing.id}`}
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Tell the host exactly what to fix…"
            className="input text-sm"
            disabled={processing}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onAction('approve')}
            disabled={processing}
            className="btn-primary text-sm py-2 px-5"
          >
            {processing ? <span className="spinner" /> : '✓ Approve'}
          </button>
          <button
            onClick={() => onAction('request_changes')}
            disabled={processing}
            className="btn-secondary text-sm py-2 px-5"
          >
            📝 Request changes
          </button>
          <button
            onClick={() => onAction('reject')}
            disabled={processing}
            className="btn-danger text-sm py-2 px-5"
          >
            ✗ Reject
          </button>
        </div>
      </div>

      {/* ── Photo lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-5 text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
