'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatDate, formatINR } from '../../../lib/api';
import type { Refund, RefundValidation } from '../../../lib/types';

const PER_PAGE = 20;

// ─── Confirm dialog for refund submission ────────────────────────────────────

function RefundConfirmModal({
  preview,
  amountRupees,
  reason,
  onConfirm,
  onCancel,
  submitting,
}: {
  preview: RefundValidation;
  amountRupees: string;
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const amountPaise = Math.round(parseFloat(amountRupees) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!submitting ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Confirm Refund</h3>
        <p className="text-sm text-gray-500 mb-5">Review the details before issuing this refund. This action cannot be undone.</p>

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 mb-5 text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-500">Booking</span>
            <span className="font-mono text-xs text-brand-700">{preview.bookingId.slice(0, 16)}…</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-500">Listing</span>
            <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">{preview.listingTitle}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-500">Guest</span>
            <span className="font-medium text-gray-900">{preview.guestName}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-500">Total paid</span>
            <span className="font-medium">{formatINR(preview.totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-500">Already refunded</span>
            <span className="font-medium">{formatINR(preview.totalRefunded)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50">
            <span className="text-amber-700 font-medium">Refund amount</span>
            <span className="font-bold text-amber-700 text-base">{formatINR(amountPaise)}</span>
          </div>
          <div className="flex items-start gap-2 px-4 py-3">
            <span className="text-gray-500 shrink-0 mt-0.5">Reason</span>
            <span className="text-gray-700 text-right flex-1">{reason}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={submitting} className="btn-ghost text-sm py-2 px-4">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={submitting} className="btn-danger text-sm py-2 px-5">
            {submitting ? <span className="spinner" /> : 'Issue Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-validation state
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<RefundValidation | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast helper ────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const loadRefunds = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getRefunds(page, PER_PAGE)
      .then((res) => {
        setRefunds(res.refunds);
        setTotal(res.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadRefunds();
  }, [user, loadRefunds]);

  // ─── Pre-validate booking ────────────────────────────────────────────────

  const handleValidateBooking = async () => {
    if (!bookingId.trim()) return;
    setValidating(true);
    setPreview(null);
    setPreviewError('');
    try {
      const data = await adminApi.validateRefundBooking(bookingId.trim());
      setPreview(data);
      // Pre-fill max refundable if amount not set
      if (!amountRupees) {
        setAmountRupees((data.maxRefundable / 100).toFixed(2));
      }
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : 'Booking not found');
    } finally {
      setValidating(false);
    }
  };

  // ─── Submit refund (after confirm) ──────────────────────────────────────

  const handleConfirmedSubmit = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      const amountPaise = Math.round(parseFloat(amountRupees) * 100);
      await adminApi.createRefund({
        bookingId: bookingId.trim(),
        amount: amountPaise,
        reason: reason.trim(),
      });
      showToast('Refund issued successfully', 'success');
      setBookingId('');
      setAmountRupees('');
      setReason('');
      setPreview(null);
      setShowForm(false);
      setShowConfirm(false);
      loadRefunds();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to create refund', 'error');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Validate form before showing confirm ────────────────────────────────

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId.trim() || !amountRupees || !reason.trim() || !preview) return;

    const amountPaise = Math.round(parseFloat(amountRupees) * 100);
    if (amountPaise <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }
    if (amountPaise > preview.maxRefundable) {
      showToast(`Amount exceeds max refundable (${formatINR(preview.maxRefundable)})`, 'error');
      return;
    }

    setShowConfirm(true);
  };

  // ─── Reset form ──────────────────────────────────────────────────────────

  const handleCancelForm = () => {
    setShowForm(false);
    setBookingId('');
    setAmountRupees('');
    setReason('');
    setPreview(null);
    setPreviewError('');
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const maxRefundableRupees = preview ? (preview.maxRefundable / 100).toFixed(2) : null;
  const amountExceedsMax = preview && amountRupees
    ? Math.round(parseFloat(amountRupees) * 100) > preview.maxRefundable
    : false;

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-down ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && preview && (
        <RefundConfirmModal
          preview={preview}
          amountRupees={amountRupees}
          reason={reason}
          submitting={submitting}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Refund Management</h1>
          <p className="text-gray-500 text-sm mt-1">Issue and track refunds for bookings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRefunds} className="btn-ghost text-sm">&#8635; Refresh</button>
          <button
            onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
            className="btn-primary text-sm py-2 px-4"
          >
            {showForm ? 'Cancel' : 'Issue Refund'}
          </button>
        </div>
      </div>

      {/* Issue Refund Form */}
      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Issue New Refund</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enter the booking ID to load refund details, then specify the amount and reason.
          </p>

          <form onSubmit={handleSubmitClick} className="space-y-5">
            {/* Step 1: Booking ID + validate */}
            <div>
              <label className="label">Booking ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => {
                    setBookingId(e.target.value);
                    setPreview(null);
                    setPreviewError('');
                  }}
                  placeholder="Enter full booking ID"
                  className="input flex-1"
                  required
                />
                <button
                  type="button"
                  onClick={handleValidateBooking}
                  disabled={!bookingId.trim() || validating}
                  className="btn-secondary text-sm py-2 px-4 whitespace-nowrap disabled:opacity-40"
                >
                  {validating ? <span className="spinner" /> : 'Look up'}
                </button>
              </div>
              {previewError && (
                <p className="text-xs text-red-600 mt-1.5">{previewError}</p>
              )}
            </div>

            {/* Preview card */}
            {preview && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm space-y-1.5">
                <p className="font-semibold text-green-800 mb-2">Booking found</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-gray-500">Listing:</span>
                  <span className="font-medium text-gray-800 truncate">{preview.listingTitle}</span>
                  <span className="text-gray-500">Guest:</span>
                  <span className="font-medium text-gray-800">{preview.guestName}</span>
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-gray-800">{preview.status}</span>
                  <span className="text-gray-500">Total paid:</span>
                  <span className="font-medium">{formatINR(preview.totalPaid)}</span>
                  <span className="text-gray-500">Already refunded:</span>
                  <span className="font-medium">{formatINR(preview.totalRefunded)}</span>
                  <span className="text-green-700 font-semibold">Max refundable:</span>
                  <span className="font-bold text-green-700">{formatINR(preview.maxRefundable)}</span>
                </div>
              </div>
            )}

            {/* Step 2: Amount + reason (only shown after preview loads) */}
            {preview && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Amount in &#8377;
                      {maxRefundableRupees && (
                        <span className="ml-1 text-xs text-gray-400 font-normal">
                          (max ₹{maxRefundableRupees})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxRefundableRupees ?? undefined}
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      placeholder={`0.00 – ${maxRefundableRupees}`}
                      className={`input w-full ${amountExceedsMax ? 'border-red-400 focus:border-red-500' : ''}`}
                      required
                    />
                    {amountExceedsMax && (
                      <p className="text-xs text-red-600 mt-1">
                        Exceeds max refundable ({formatINR(preview.maxRefundable)})
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the reason for the refund…"
                    rows={3}
                    className="input w-full"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="btn-ghost text-sm py-2 px-4"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={!amountRupees || !reason.trim() || amountExceedsMax}
                    className="btn-danger text-sm py-2 px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Preview & Confirm
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Error */}
      {error && <div className="alert-error mb-6">{error}</div>}

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
      {!loading && refunds.length === 0 && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No refunds yet</h3>
          <p className="text-gray-400 text-sm">Refunds will appear here once they are issued.</p>
        </div>
      )}

      {/* Refund table */}
      {!loading && refunds.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Refund ID</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Booking</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Guest</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Reason</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map((r) => {
                  const booking = (r as any).booking as { listing?: { title?: string }; guest?: { fullName?: string; email?: string } } | undefined;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">
                        {r.id.slice(0, 12)}…
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-brand-700">
                          {r.bookingId.slice(0, 12)}…
                        </span>
                        {booking?.listing?.title && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">
                            {booking.listing.title}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {booking?.guest ? (
                          <>
                            <p className="font-medium text-gray-900">{booking.guest.fullName ?? '—'}</p>
                            <p className="text-xs text-gray-400">{booking.guest.email ?? ''}</p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                        {formatINR(r.amount)}
                      </td>
                      <td className="px-6 py-3 text-gray-700 max-w-[260px] truncate">
                        {r.reason}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
