'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import {
  bookingsApi,
  formatDate,
  formatINR,
  generateUUID,
  paymentsApi,
} from '../../../lib/api';
import type { Booking } from '../../../lib/types';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getById(id)
      .then(setBooking)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleCancel = async () => {
    if (!booking) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setActionError('');
    setActionLoading(true);
    try {
      const updated = await bookingsApi.cancel(id, 'Guest requested cancellation');
      setBooking(updated);
      showToast('Booking cancelled');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayBalance = async () => {
    if (!booking) return;
    setActionError('');
    setActionLoading(true);
    try {
      const result = await paymentsApi.payBalance(booking.id, generateUUID());
      // Auto-confirm in stub mode
      if (result.razorpayOrderId?.startsWith('stub_')) {
        await paymentsApi.stubConfirm(result.paymentId);
        showToast('✅ Balance payment confirmed!');
      } else {
        showToast('Payment initiated — complete via Razorpay checkout');
      }
      // Refresh booking
      const updated = await bookingsApi.getById(id);
      setBooking(updated);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Booking not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">
          Back to dashboard
        </button>
      </div>
    );
  }

  const snapshot = booking.priceSnapshot;
  const canCancel = ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'].includes(booking.status);
  const canPayBalance = booking.status === 'BALANCE_DUE';

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Booking Details</h1>
          <StatusBadge status={booking.status} />
        </div>
        <p className="text-gray-400 text-xs font-mono mt-1">{booking.id}</p>
      </div>

      {/* Balance due alert */}
      {booking.status === 'BALANCE_DUE' && booking.balanceDueAt && (
        <div className="alert-error mb-6">
          <p className="font-semibold">⚠️ Balance payment required</p>
          <p className="text-sm mt-0.5">
            {formatINR(snapshot.balanceAmount)} due by {formatDate(booking.balanceDueAt)}.
            Booking will be auto-cancelled if unpaid.
          </p>
        </div>
      )}

      {actionError && <div className="alert-error mb-4">{actionError}</div>}

      {/* Listing info */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Stay</h2>
        <p className="text-lg font-bold text-gray-900">
          {booking.listing?.title ?? `Listing ${booking.listingId.slice(0, 8)}…`}
        </p>
        {booking.listing && (
          <p className="text-sm text-gray-500 mt-0.5">
            📍 {booking.listing.city}, {booking.listing.state}
          </p>
        )}
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <div>
            <p className="text-xs text-gray-400">Check-in</p>
            <p className="font-semibold">{formatDate(booking.startsAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Check-out</p>
            <p className="font-semibold">{formatDate(booking.endsAt)}</p>
          </div>
        </div>
        {booking.listing && (
          <Link
            href={`/listings/${booking.listingId}`}
            className="btn-ghost text-xs mt-4 inline-block"
          >
            View listing →
          </Link>
        )}
      </div>

      {/* Guest details */}
      {booking.guestDetails && (
        <div className="card p-6 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Guest details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Full name</p>
              <p className="font-medium text-gray-900">{booking.guestDetails.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-gray-900">{booking.guestDetails.phone}</p>
            </div>
            {booking.guestDetails.email && (
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-900">{booking.guestDetails.email}</p>
              </div>
            )}
            {booking.guestDetails.estimatedArrival && (
              <div>
                <p className="text-xs text-gray-400">Estimated arrival</p>
                <p className="font-medium text-gray-900">{booking.guestDetails.estimatedArrival}</p>
              </div>
            )}
            {booking.guestDetails.address && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">Address</p>
                <p className="font-medium text-gray-900">{booking.guestDetails.address}</p>
              </div>
            )}
            {booking.guestDetails.specialRequests && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">Special requests</p>
                <p className="font-medium text-gray-900 whitespace-pre-line">{booking.guestDetails.specialRequests}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price breakdown */}
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Price breakdown</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{snapshot.nights} night{snapshot.nights !== 1 ? 's' : ''} × {formatINR(snapshot.baseNightlyRate)}</span>
            <span>{formatINR(snapshot.subtotal)}</span>
          </div>
          {snapshot.cleaningFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cleaning fee</span>
              <span>{formatINR(snapshot.cleaningFee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Platform fee ({Math.round((snapshot.platformFeeRate ?? 0.1) * 100)}%)</span>
            <span>{formatINR(snapshot.platformFee)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-brand-700">{formatINR(snapshot.total)}</span>
          </div>
          {booking.plan === 'DEPOSIT_50' && (
            <>
              <div className="flex justify-between text-green-700">
                <span>Deposit paid</span>
                <span>{formatINR(snapshot.depositAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Balance remaining</span>
                <span>{formatINR(snapshot.balanceAmount)}</span>
              </div>
            </>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <span>Payment plan:</span>
          <span className="font-semibold text-gray-900">
            {booking.plan === 'FULL' ? '💳 Full payment' : '🔀 50% deposit'}
          </span>
        </div>
      </div>

      {/* Payment history */}
      {booking.payments && booking.payments.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Payment history</h2>
          <div className="space-y-2">
            {booking.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{p.type}</span>
                  <span className="text-gray-400 ml-2 text-xs">{p.id.slice(0, 10)}…</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} size="sm" />
                  <span className="font-semibold text-brand-700">{formatINR(p.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {canPayBalance && (
          <button
            onClick={handlePayBalance}
            disabled={actionLoading}
            className="btn-primary py-3"
          >
            {actionLoading ? <><span className="spinner" /> Processing…</> : `💳 Pay balance — ${formatINR(snapshot.balanceAmount)}`}
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="btn-danger py-3"
          >
            {actionLoading ? <><span className="spinner" /> Cancelling…</> : 'Cancel booking'}
          </button>
        )}
        {['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(booking.status) && (
          <div className="card p-4 text-center text-sm text-gray-500">
            {booking.status === 'COMPLETED' && '✅ This booking has been completed.'}
            {booking.status === 'CANCELLED' && '❌ This booking was cancelled.'}
            {booking.status === 'REFUNDED' && '💸 This booking was cancelled and refunded.'}
          </div>
        )}
      </div>
    </div>
  );
}
