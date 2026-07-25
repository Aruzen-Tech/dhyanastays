'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi, formatDate, formatINR } from '../../../../lib/api';
import type { Booking } from '../../../../lib/types';

const PAID_STATUSES = ['CONFIRMED_PAID', 'CHECKED_IN', 'COMPLETED'];

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading || isLoading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="container-page py-16 text-center text-gray-500">
        {error || 'Booking not found'}
      </div>
    );
  }

  const s = booking.priceSnapshot;
  const g = booking.guestDetails;
  const nights = s.nights ?? 0;
  const paid = PAID_STATUSES.includes(booking.status);
  const isPayOnArrival = booking.plan === 'PAY_ON_ARRIVAL';

  const rows: Array<{ label: string; value: number; muted?: boolean }> = [
    { label: `Accommodation (${nights} night${nights !== 1 ? 's' : ''})`, value: s.subtotal },
  ];
  if (s.cleaningFee > 0) rows.push({ label: 'Cleaning fee', value: s.cleaningFee });
  if ((s.addOnsTotal ?? 0) > 0) rows.push({ label: 'Add-ons', value: s.addOnsTotal });
  rows.push({
    label: `Platform fee (${Math.round((s.platformFeeRate ?? 0.1) * 100)}%)`,
    value: s.platformFee,
  });
  if ((s.gstAmount ?? 0) > 0) {
    rows.push({ label: `GST (${Math.round((s.gstRate ?? 0.18) * 100)}%)`, value: s.gstAmount });
  }

  return (
    <div className="container-page py-8 max-w-2xl mx-auto">
      {/* Actions (hidden when printing) */}
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => router.push(`/bookings/${booking.id}`)} className="btn-ghost text-sm">
          ← Back to booking
        </button>
        <button onClick={() => window.print()} className="btn-primary text-sm">
          Download / Print
        </button>
      </div>

      {/* Invoice */}
      <div className="card p-8 print:shadow-none print:border-0">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏡</span>
              <span className="text-xl font-bold text-brand-700">Dhyana Stays</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Wellness retreats across India</p>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold text-gray-900">INVOICE</h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">{booking.id}</p>
            <p className="text-xs text-gray-500">Date: {formatDate(booking.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Billed to</p>
            <p className="font-medium text-gray-900">{g?.fullName ?? user?.fullName ?? 'Guest'}</p>
            {g?.email && <p className="text-gray-500">{g.email}</p>}
            {g?.phone && <p className="text-gray-500">{g.phone}</p>}
            {g?.address && <p className="text-gray-500">{g.address}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Stay</p>
            <p className="font-medium text-gray-900">
              {booking.listing?.title ?? `Listing ${booking.listingId.slice(0, 8)}`}
            </p>
            <p className="text-gray-500">
              {formatDate(booking.startsAt)} → {formatDate(booking.endsAt)}
            </p>
            <p className="text-gray-500">
              {nights} night{nights !== 1 ? 's' : ''} · {s.guests} guest{s.guests !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400">
              <th className="text-left font-semibold py-2 uppercase text-xs">Description</th>
              <th className="text-right font-semibold py-2 uppercase text-xs">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-gray-100">
                <td className="py-2.5 text-gray-700">{r.label}</td>
                <td className="py-2.5 text-right text-gray-900">{formatINR(r.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-bold text-gray-900">Total</td>
              <td className="py-3 text-right font-bold text-brand-700 text-base">
                {formatINR(s.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment status */}
        <div className="rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment plan</span>
            <span className="font-medium text-gray-900">
              {isPayOnArrival
                ? 'Pay on arrival'
                : booking.plan === 'FULL'
                  ? 'Paid in full'
                  : booking.plan === 'DEPOSIT_50'
                    ? '50% deposit'
                    : booking.plan === 'PAY_LATER'
                      ? 'Pay later'
                      : booking.plan}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">Status</span>
            <span className="font-medium text-gray-900">{booking.status.replace(/_/g, ' ')}</span>
          </div>
          {isPayOnArrival && !paid && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Due at property</span>
              <span className="font-medium text-gray-900">{formatINR(s.total)}</span>
            </div>
          )}
          {booking.plan === 'DEPOSIT_50' && (
            <>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Deposit</span>
                <span className="font-medium text-gray-900">{formatINR(s.depositAmount)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Balance</span>
                <span className="font-medium text-gray-900">{formatINR(s.balanceAmount)}</span>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          This is a computer-generated invoice. Thank you for choosing Dhyana Stays.
        </p>
      </div>
    </div>
  );
}
