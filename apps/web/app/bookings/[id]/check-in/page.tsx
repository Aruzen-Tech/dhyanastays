'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi, formatDate } from '../../../../lib/api';
import type { CheckInOutStatus } from '../../../../lib/types';

export default function CheckInPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<CheckInOutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form
  const [confirmedName, setConfirmedName] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getCheckInOutStatus(id)
      .then((s) => {
        setStatus(s);
        if (user.fullName) setConfirmedName(user.fullName);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedName.trim() || !arrivalTime.trim()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await bookingsApi.checkIn(id, {
        confirmedName: confirmedName.trim(),
        arrivalTime: arrivalTime.trim(),
        ...(specialNotes.trim() && { specialNotes: specialNotes.trim() }),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access check-in</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  // Already checked in
  if (status?.checkInData) {
    return (
      <div className="container-page py-10 max-w-2xl mx-auto">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-6 inline-block">
          ← Back to booking
        </Link>
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">You&apos;re checked in!</h2>
          <div className="text-sm text-gray-600 space-y-1 mt-4">
            <p><span className="text-gray-400">Name:</span> {status.checkInData.confirmedName}</p>
            <p><span className="text-gray-400">Arrival time:</span> {status.checkInData.arrivalTime}</p>
            {status.checkInData.specialNotes && (
              <p><span className="text-gray-400">Notes:</span> {status.checkInData.specialNotes}</p>
            )}
            <p><span className="text-gray-400">Checked in at:</span> {formatDate(status.checkInData.checkedInAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Cannot check in yet
  if (!status?.canCheckIn) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🕐</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Check-in not available yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          Check-in will be available on your arrival day.
        </p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="container-page py-10 max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check-in complete!</h2>
          <p className="text-gray-500 text-sm mb-6">The host has been notified of your arrival.</p>
          <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <h1 className="page-title">Digital Check-in</h1>
        <p className="text-gray-500 text-sm mt-1">Confirm your arrival details</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="mb-4">
          <label className="label">Full Name (as on ID)</label>
          <input
            type="text"
            value={confirmedName}
            onChange={(e) => setConfirmedName(e.target.value)}
            className="input"
            maxLength={200}
            required
          />
        </div>

        <div className="mb-4">
          <label className="label">Expected Arrival Time</label>
          <input
            type="text"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            placeholder="e.g., 2:00 PM or Between 3-5 PM"
            className="input"
            maxLength={50}
            required
          />
        </div>

        <div className="mb-4">
          <label className="label">Special Notes (optional)</label>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="Any special requests or notes for the host..."
            rows={3}
            className="input resize-none"
            maxLength={500}
          />
        </div>

        {submitError && <div className="alert-error text-sm mb-4">{submitError}</div>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Checking in...' : 'Confirm Check-in'}
        </button>
      </form>
    </div>
  );
}
