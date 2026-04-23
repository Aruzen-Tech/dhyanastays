'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { experiencesApi, formatINR } from '../../../lib/api';
import type { ExperienceBooking } from '../../../lib/types';

const STATUS_COLOR: Record<string, string> = {
  HELD: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

export default function GuestExperienceBookingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<ExperienceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'GUEST')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;
    experiencesApi
      .listGuestBookings()
      .then(setBookings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const updated = await experiencesApi.cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">My experience bookings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Yoga, meditation and wellness sessions you&apos;ve booked.
          </p>
        </div>
        <Link href="/experiences" className="btn-primary">
          Browse
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {bookings.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">🧘</div>
          <p className="text-sm">No experience bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-brand-700 uppercase font-medium">
                    {b.experience?.category.replace(/-/g, ' ')}
                  </p>
                  <h3 className="font-semibold text-gray-900 truncate">
                    <Link href={`/experiences/${b.experienceId}`} className="hover:underline">
                      {b.experience?.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-500">
                    {b.experience?.city}, {b.experience?.state} ·{' '}
                    {b.experience &&
                      new Date(b.experience.startsAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.seats} seat{b.seats === 1 ? '' : 's'} · {formatINR(b.totalMinor)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                  {(b.status === 'HELD' || b.status === 'CONFIRMED') && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
