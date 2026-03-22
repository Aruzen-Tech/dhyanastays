'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatDate, formatINR } from '../../../lib/api';
import type { Refund } from '../../../lib/types';

const PER_PAGE = 20;

export default function AdminRefundsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Issue refund form state
  const [showForm, setShowForm] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // ─── Submit refund ───────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId.trim() || !amountRupees || !reason.trim()) return;

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
      setShowForm(false);
      loadRefunds();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to create refund', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Refund Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Issue and track refunds for bookings
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRefunds} className="btn-ghost text-sm">
            &#8635; Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm py-2 px-4"
          >
            {showForm ? 'Cancel' : 'Issue Refund'}
          </button>
        </div>
      </div>

      {/* Issue Refund Form */}
      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Issue New Refund</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Booking ID</label>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Enter booking ID"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label">Amount in &#8377;</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  placeholder="e.g. 1500"
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for the refund..."
                rows={3}
                className="input w-full"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-sm py-2 px-6"
              >
                {submitting ? <span className="spinner" /> : 'Submit Refund'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
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
      {!loading && refunds.length === 0 && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No refunds yet</h3>
          <p className="text-gray-400 text-sm">
            Refunds will appear here once they are issued.
          </p>
        </div>
      )}

      {/* Refund table */}
      {!loading && refunds.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">ID</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Booking ID</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Reason</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {r.id.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-brand-700">
                      {r.bookingId.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                      {formatINR(r.amount)}
                    </td>
                    <td className="px-6 py-3 text-gray-700 max-w-[300px] truncate">
                      {r.reason}
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
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
