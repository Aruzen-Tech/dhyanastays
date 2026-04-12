'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi } from '../../../../lib/api';
import type { BookingPreparation } from '../../../../lib/types';

export default function PreparationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<BookingPreparation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getPreparation(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

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
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access preparation guide</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">
          Back to booking
        </Link>
      </div>
    );
  }

  const guide = data?.preparationGuide;

  if (!guide) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No preparation guide yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          The host hasn&apos;t added a preparation guide for this listing yet. Check back closer to your stay!
        </p>
        <Link href={`/bookings/${id}`} className="btn-primary">
          Back to booking
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <h1 className="page-title">Prepare for Your Retreat</h1>
        {data?.listingTitle && (
          <p className="text-gray-500 text-sm mt-1">{data.listingTitle}</p>
        )}
      </div>

      {/* Arrival Instructions */}
      {guide.arrivalInstructions && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📍</span>
            <h2 className="font-semibold text-gray-900">Arrival Instructions</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{guide.arrivalInstructions}</p>
        </section>
      )}

      {/* What to Expect */}
      {guide.whatToExpect && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h2 className="font-semibold text-gray-900">What to Expect</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{guide.whatToExpect}</p>
        </section>
      )}

      {/* Daily Schedule */}
      {guide.dailySchedule && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🕐</span>
            <h2 className="font-semibold text-gray-900">Typical Daily Schedule</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{guide.dailySchedule}</p>
        </section>
      )}

      {/* Packing List */}
      {guide.packingList && guide.packingList.length > 0 && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎒</span>
            <h2 className="font-semibold text-gray-900">Packing Checklist</h2>
          </div>
          <ul className="space-y-2">
            {guide.packingList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 w-4 h-4 rounded border border-gray-300 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dietary Info */}
      {guide.dietaryInfo && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🍽️</span>
            <h2 className="font-semibold text-gray-900">Food & Dietary Information</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{guide.dietaryInfo}</p>
        </section>
      )}

      {/* Additional Notes */}
      {guide.additionalNotes && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h2 className="font-semibold text-gray-900">Additional Notes</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{guide.additionalNotes}</p>
        </section>
      )}
    </div>
  );
}
