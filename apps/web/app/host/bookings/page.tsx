'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, hostAnalyticsApi } from '../../../lib/api';
import { downloadCSV } from '../../../lib/csv-export';
import type { HostBookingRow } from '../../../lib/types';

const STATUS_TABS = [
  { label: 'All', value: undefined },
  { label: 'Confirmed', value: 'CONFIRMED_PAID' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Balance Due', value: 'BALANCE_DUE' },
] as const;

const LIMIT = 20;

export default function HostBookingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<HostBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  const loadBookings = (p: number, status?: string) => {
    setLoading(true);
    hostAnalyticsApi
      .getBookings(p, LIMIT, status)
      .then((res) => {
        setBookings(res.bookings);
        setTotal(res.total);
        setPage(p);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    loadBookings(1, statusFilter);
  }, [user, statusFilter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTabChange = (value: string | undefined) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    const rows = bookings.map((b) => ({
      'Booking ID': b.id,
      Guest: b.guest.fullName,
      Email: b.guest.email,
      Listing: b.listing.title,
      City: b.listing.city,
      State: b.listing.state,
      'Check-In': b.startsAt,
      'Check-Out': b.endsAt,
      Plan: b.plan === 'FULL' ? 'Full' : 'Deposit',
      'Total (INR)': (b.priceSnapshot.total / 100).toFixed(2),
      Nights: b.priceSnapshot.nights,
      Guests: b.priceSnapshot.guests,
      Status: b.status,
      Created: b.createdAt,
    }));
    const suffix = statusFilter ? `-${statusFilter.toLowerCase()}` : '';
    downloadCSV(rows, `host-bookings${suffix}`);
    showToast('CSV exported successfully');
  };

  const totalPages = Math.ceil(total / LIMIT);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} total booking{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={bookings.length === 0}
            className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={() => loadBookings(page, statusFilter)}
            className="btn-ghost text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-brand-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && bookings.length === 0 && !error && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {statusFilter ? 'No bookings match this filter' : 'No bookings yet'}
          </h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            {statusFilter
              ? 'Try selecting a different status tab to see more bookings.'
              : 'Bookings will appear here once guests start booking your listings.'}
          </p>
        </div>
      )}

      {/* Bookings table */}
      {!loading && bookings.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Booking ID</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Guest</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Listing</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Dates</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-700">
                        {b.id.slice(0, 12)}...
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(b.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{b.guest.fullName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{b.guest.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">
                        {b.listing.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {b.listing.city}, {b.listing.state}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                      <p>{formatDate(b.startsAt)}</p>
                      <p className="text-xs text-gray-400">to {formatDate(b.endsAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.plan === 'FULL'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {b.plan === 'FULL' ? 'Full' : 'Deposit'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-brand-700 whitespace-nowrap">
                      {formatINR(b.priceSnapshot.total)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="btn-ghost text-xs text-brand-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadBookings(page - 1, statusFilter)}
                  disabled={page <= 1 || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => loadBookings(page + 1, statusFilter)}
                  disabled={page >= totalPages || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
