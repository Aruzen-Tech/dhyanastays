'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../../components/StatusBadge';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi, formatDate, formatINR } from '../../../../lib/api';
import type { AdminListingDetail } from '../../../../lib/types';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminListingDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || user.role !== 'ADMIN' || !id) return;
    setLoading(true);
    setError('');
    adminApi
      .getListingDetail(id)
      .then(setListing)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, id]);

  // ─── Render guard ────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Back link */}
      <Link href="/admin/listings" className="text-sm text-brand-700 hover:text-brand-800 mb-4 inline-block">
        &larr; Back to Listings
      </Link>

      {/* Error */}
      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-[200px] bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {/* Detail content */}
      {!loading && listing && (
        <div className="space-y-8">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="page-title">{listing.title}</h1>
                  <StatusBadge status={listing.status} />
                </div>
                <p className="text-gray-500 text-sm">
                  {listing.city}, {listing.state}, {listing.country}
                </p>
                <p className="text-gray-400 text-xs mt-1 font-mono">
                  ID: {listing.id}
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Host:</span>{' '}
                  {listing.host?.user?.fullName ?? 'Unknown'}
                </p>
                <p className="text-xs text-gray-400">
                  {listing.host?.user?.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created {formatDate(listing.createdAt)}
                </p>
              </div>
            </div>
            {listing.description && (
              <p className="mt-4 text-sm text-gray-700 leading-relaxed">
                {listing.description}
              </p>
            )}
          </div>

          {/* ── Media Gallery ──────────────────────────────────────────────── */}
          {listing.media && listing.media.length > 0 && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Media</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {listing.media.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-video rounded-lg overflow-hidden bg-gray-100"
                  >
                    {m.mediaType.startsWith('image') ? (
                      <img
                        src={m.url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        {m.mediaType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {listing.media && listing.media.length === 0 && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Media</h2>
              <p className="text-sm text-gray-400">No media uploaded yet.</p>
            </div>
          )}

          {/* ── Rate Rules ─────────────────────────────────────────────────── */}
          {listing.rateRules && listing.rateRules.length > 0 && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Rate Rules</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {listing.rateRules.map((rule) => (
                  <div key={rule.id} className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Base Nightly Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatINR(rule.baseNightlyRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cleaning Fee</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatINR(rule.cleaningFee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Min Nights</p>
                      <p className="text-sm font-semibold text-gray-900">{rule.minNights}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Max Guests</p>
                      <p className="text-sm font-semibold text-gray-900">{rule.maxGuests}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Seasonal Rates ─────────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Seasonal Rates</h2>
            </div>
            {listing.seasonalRates.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No seasonal rates configured.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3 text-right">Nightly Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listing.seasonalRates.map((sr) => (
                      <tr key={sr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">{formatDate(sr.startsAt)}</td>
                        <td className="px-6 py-3">{formatDate(sr.endsAt)}</td>
                        <td className="px-6 py-3 text-right font-semibold">
                          {formatINR(sr.nightlyRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Availability Blocks ────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Availability Blocks</h2>
            </div>
            {listing.availabilityBlocks.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No availability blocks set.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listing.availabilityBlocks.map((ab) => (
                      <tr key={ab.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">{formatDate(ab.startsAt)}</td>
                        <td className="px-6 py-3">{formatDate(ab.endsAt)}</td>
                        <td className="px-6 py-3 text-gray-600">{ab.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Revenue Summary ─────────────────────────────────────────────── */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatINR(listing.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{listing.bookingCount}</p>
              </div>
            </div>
          </div>

          {/* ── Booking History ─────────────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Booking History</h2>
            </div>
            {listing.bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No bookings for this listing yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">Guest</th>
                      <th className="px-6 py-3">Check-in</th>
                      <th className="px-6 py-3">Check-out</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listing.bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <Link
                            href={`/bookings/${b.id}`}
                            className="text-brand-700 hover:text-brand-800 font-medium"
                          >
                            {b.guest?.fullName ?? b.guest?.email ?? 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {formatDate(b.startsAt)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {formatDate(b.endsAt)}
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={b.status} size="sm" />
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                          {formatINR(b.priceSnapshot.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not found */}
      {!loading && !listing && !error && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Listing not found</h3>
          <p className="text-gray-400 text-sm">
            The listing may have been removed or the ID is invalid.
          </p>
        </div>
      )}
    </div>
  );
}
