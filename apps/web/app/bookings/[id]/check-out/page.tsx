'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi, formatDate } from '../../../../lib/api';
import type { CheckInOutStatus } from '../../../../lib/types';

export default function CheckOutPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<CheckInOutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form
  const [feedback, setFeedback] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
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
      .then(setStatus)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await bookingsApi.checkOut(id, {
        ...(feedback.trim() && { feedback: feedback.trim() }),
        ...(conditionNotes.trim() && { conditionNotes: conditionNotes.trim() }),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Check-out failed');
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
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access check-out</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  // Already checked out
  if (status?.checkOutData) {
    return (
      <div className="container-page py-10 max-w-2xl mx-auto">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-6 inline-block">
          ← Back to booking
        </Link>
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">You&apos;ve checked out</h2>
          <div className="text-sm text-gray-600 space-y-1 mt-4">
            {status.checkOutData.feedback && (
              <p><span className="text-gray-400">Feedback:</span> {status.checkOutData.feedback}</p>
            )}
            <p><span className="text-gray-400">Checked out at:</span> {formatDate(status.checkOutData.checkedOutAt)}</p>
          </div>
          <Link href={`/bookings/${id}`} className="btn-primary mt-6 inline-block">Back to booking</Link>
        </div>
      </div>
    );
  }

  // Must check in first
  if (!status?.checkInData) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Check in first</h2>
        <p className="text-gray-400 text-sm mb-6">
          You need to complete check-in before you can check out.
        </p>
        <Link href={`/bookings/${id}/check-in`} className="btn-primary">Go to Check-in</Link>
      </div>
    );
  }

  // Cannot check out yet
  if (!status?.canCheckOut) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🕐</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Check-out not available yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          Check-out is available within 24 hours of your departure date.
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
          <div className="text-5xl mb-4">🙏</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check-out complete!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Thank you for staying with us. We hope you had a wonderful retreat!
          </p>
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
        <h1 className="page-title">Digital Check-out</h1>
        <p className="text-gray-500 text-sm mt-1">We hope you enjoyed your stay!</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="mb-4">
          <label className="label">How was your stay? (optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your overall experience..."
            rows={4}
            className="input resize-none"
            maxLength={1000}
          />
        </div>

        <div className="mb-4">
          <label className="label">Property condition notes (optional)</label>
          <textarea
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            placeholder="Any notes about the property condition on departure..."
            rows={3}
            className="input resize-none"
            maxLength={500}
          />
        </div>

        {submitError && <div className="alert-error text-sm mb-4">{submitError}</div>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Checking out...' : 'Confirm Check-out'}
        </button>
      </form>
    </div>
  );
}
