'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { bookingsApi, formatDate, formatINR } from '../../../lib/api';
import type { Booking } from '../../../lib/types';

export default function AdminBookingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const LIMIT = 20;

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const loadBookings = (p: number) => {
    setLoading(true);
    bookingsApi
      .adminGetAll(p, LIMIT)
      .then((res) => {
        setBookings(res.bookings);
        setTotal(res.total);
        setPage(p);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadBookings(1);
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleComplete = async (bookingId: string) => {
    if (!confirm('Mark this booking as completed?')) return;
    setActionLoading(bookingId);
    try {
      const updated = await bookingsApi.complete(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      showToast('✅ Booking marked as completed');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking? This will trigger a refund if applicable.')) return;
    setActionLoading(bookingId);
    try {
      const updated = await bookingsApi.cancel(bookingId, 'Admin cancellation');
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      showToast('Booking cancelled');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
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
          <h1 className="page-title">All Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} total booking{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => loadBookings(page)}
          className="btn-ghost text-sm"
        >
          ↻ Refresh
        </button>
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
      {!loading && bookings.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No bookings yet</h3>
          <p className="text-gray-400 text-sm">Bookings will appear here once guests start booking.</p>
        </div>
      )}

      {/* Bookings table */}
      {!loading && bookings.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Booking</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Listing</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Dates</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => {
                  const isProcessing = actionLoading === b.id;
                  const canComplete = ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(b.status);
                  const canCancel = ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'].includes(b.status);

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="font-mono text-xs text-brand-700 hover:underline"
                        >
                          {b.id.slice(0, 12)}…
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(b.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">
                          {b.listing?.title ?? b.listingId.slice(0, 10) + '…'}
                        </p>
                        {b.listing && (
                          <p className="text-xs text-gray-400">
                            {b.listing.city}, {b.listing.state}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        <p>{formatDate(b.startsAt)}</p>
                        <p className="text-xs text-gray-400">→ {formatDate(b.endsAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.plan === 'FULL'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {b.plan === 'FULL' ? 'Full' : 'Deposit'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-brand-700 whitespace-nowrap">
                        {formatINR(b.priceSnapshot.total)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={b.status} size="sm" />
                        {b.status === 'BALANCE_DUE' && b.balanceDueAt && (
                          <p className="text-xs text-red-500 mt-0.5">
                            Due {formatDate(b.balanceDueAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {canComplete && (
                            <button
                              onClick={() => handleComplete(b.id)}
                              disabled={isProcessing}
                              className="btn-primary text-xs py-1 px-3"
                            >
                              {isProcessing ? <span className="spinner" /> : '✓ Complete'}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              disabled={isProcessing}
                              className="btn-danger text-xs py-1 px-3"
                            >
                              {isProcessing ? <span className="spinner" /> : 'Cancel'}
                            </button>
                          )}
                          {!canComplete && !canCancel && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  onClick={() => loadBookings(page - 1)}
                  disabled={page <= 1 || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => loadBookings(page + 1)}
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
