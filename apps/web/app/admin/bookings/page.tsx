'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, bookingsApi, formatDate, formatINR } from '../../../lib/api';
import { downloadCSV } from '../../../lib/csv-export';
import type { Booking } from '../../../lib/types';

// ─── Inline debounce hook ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Confirm Modal (replaces browser confirm()) ──────────────────────────────

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ title, message, confirmLabel, confirmClass = 'btn-danger', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost text-sm py-2 px-4">
            Cancel
          </button>
          <button onClick={onConfirm} className={`${confirmClass} text-sm py-2 px-5`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking status options ──────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { value: 'CONFIRMED_DEPOSIT', label: 'Confirmed (Deposit)' },
  { value: 'CONFIRMED_PAID', label: 'Confirmed (Full)' },
  { value: 'BALANCE_DUE', label: 'Balance Due' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass?: string;
    onConfirm: () => void;
  } | null>(null);

  const LIMIT = 20;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast helper ────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  // ─── Data fetching ───────────────────────────────────────────────────────

  const loadBookings = useCallback(
    (p: number) => {
      setLoading(true);
      setSelected(new Set());
      bookingsApi
        .adminGetAll(p, LIMIT, statusFilter || undefined, debouncedSearch || undefined)
        .then((res) => {
          setBookings(res.bookings);
          setTotal(res.total);
          setPage(p);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [statusFilter, debouncedSearch],
  );

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadBookings(1);
  }, [user, loadBookings]);

  // ─── Actions (with custom confirm modal) ─────────────────────────────────

  const handleComplete = (bookingId: string) => {
    setConfirmModal({
      title: 'Mark booking as completed?',
      message: 'This will transition the booking to COMPLETED status and make the payout line eligible.',
      confirmLabel: 'Yes, complete',
      confirmClass: 'btn-primary',
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(bookingId);
        try {
          const updated = await bookingsApi.complete(bookingId);
          setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
          showToast('Booking marked as completed');
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Action failed');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleCancel = (bookingId: string) => {
    setConfirmModal({
      title: 'Cancel this booking?',
      message: 'This will cancel the booking. A refund may apply depending on cancellation policy.',
      confirmLabel: 'Yes, cancel',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(bookingId);
        try {
          const updated = await bookingsApi.cancel(bookingId, 'Admin cancellation');
          setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
          showToast('Booking cancelled');
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Action failed');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBulkComplete = () => {
    const ids = Array.from(selected);
    const completable = bookings.filter(
      (b) => ids.includes(b.id) && ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(b.status),
    );
    if (completable.length === 0) {
      setError('No selected bookings are eligible for completion.');
      return;
    }
    setConfirmModal({
      title: `Complete ${completable.length} booking(s)?`,
      message: `This will mark ${completable.length} booking(s) as COMPLETED. Non-eligible bookings in the selection will be skipped.`,
      confirmLabel: `Complete ${completable.length}`,
      confirmClass: 'btn-primary',
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading('bulk');
        try {
          const result = await adminApi.bulkCompleteBookings(completable.map((b) => b.id));
          showToast(`${result.count} booking(s) completed`);
          setSelected(new Set());
          loadBookings(page);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Bulk action failed');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    const rows = bookings.map((b) => ({
      ID: b.id,
      Guest: (b as any).guest?.fullName ?? '',
      GuestEmail: (b as any).guest?.email ?? '',
      Listing: b.listing?.title ?? b.listingId,
      City: b.listing?.city ?? '',
      CheckIn: b.startsAt,
      CheckOut: b.endsAt,
      Plan: b.plan,
      'Total (INR)': (b.priceSnapshot.total / 100).toFixed(2),
      Status: b.status,
      Created: b.createdAt,
    }));
    downloadCSV(rows, 'admin-bookings');
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === bookings.length) setSelected(new Set());
    else setSelected(new Set(bookings.map((b) => b.id)));
  };

  const totalPages = Math.ceil(total / LIMIT);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-down">
          {toast}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          {...confirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">All Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Loading…' : `${total} booking${total !== 1 ? 's' : ''}`}
            {(statusFilter || debouncedSearch) && !loading && (
              <span className="ml-1 text-amber-600 font-medium">(filtered)</span>
            )}
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
          <button onClick={() => loadBookings(page)} className="btn-ghost text-sm">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            placeholder="Search by booking ID, guest name, email, or listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-52"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(statusFilter || search) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="btn-ghost text-sm whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 rounded w-1/3 mb-2" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && bookings.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {statusFilter || debouncedSearch ? 'No bookings match your filters' : 'No bookings yet'}
          </h3>
          <p className="text-gray-400 text-sm">
            {statusFilter || debouncedSearch
              ? 'Try adjusting your search or status filter.'
              : 'Bookings will appear here once guests start booking.'}
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
                  <th className="text-left px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === bookings.length && bookings.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Booking</th>
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
                {bookings.map((b) => {
                  const isProcessing = actionLoading === b.id || actionLoading === 'bulk';
                  const canComplete = ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(b.status);
                  const canCancel = ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'].includes(b.status);
                  const guest = (b as any).guest as { fullName?: string; email?: string } | undefined;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-gray-50 transition-colors ${selected.has(b.id) ? 'bg-brand-50/50' : ''}`}
                    >
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={() => toggleSelect(b.id)}
                          className="rounded border-gray-300"
                        />
                      </td>

                      {/* Booking ID + date */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="font-mono text-xs text-brand-700 hover:underline"
                        >
                          {b.id.slice(0, 12)}…
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.createdAt)}</p>
                      </td>

                      {/* Guest */}
                      <td className="px-5 py-4">
                        {guest ? (
                          <>
                            <p className="font-medium text-gray-900">{guest.fullName ?? '—'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{guest.email ?? ''}</p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Listing */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">
                          {b.listing?.title ?? b.listingId.slice(0, 10) + '…'}
                        </p>
                        {b.listing && (
                          <p className="text-xs text-gray-400">{b.listing.city}, {b.listing.state}</p>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        <p>{formatDate(b.startsAt)}</p>
                        <p className="text-xs text-gray-400">→ {formatDate(b.endsAt)}</p>
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.plan === 'FULL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {b.plan === 'FULL' ? 'Full' : 'Deposit'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 font-semibold text-brand-700 whitespace-nowrap">
                        {formatINR(b.priceSnapshot.total)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={b.status} size="sm" />
                        {b.status === 'BALANCE_DUE' && b.balanceDueAt && (
                          <p className="text-xs text-red-500 mt-0.5">
                            Due {formatDate(b.balanceDueAt)}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {canComplete && (
                            <button
                              onClick={() => handleComplete(b.id)}
                              disabled={isProcessing}
                              className="btn-primary text-xs py-1 px-3"
                            >
                              {isProcessing ? <span className="spinner" /> : 'Complete'}
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={handleBulkComplete}
            disabled={actionLoading === 'bulk'}
            className="text-sm font-medium bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {actionLoading === 'bulk' ? 'Processing…' : 'Bulk Complete'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
