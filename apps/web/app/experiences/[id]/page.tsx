'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { experiencesApi, formatINR, generateUUID } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import type { Experience } from '../../../lib/types';

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookedId, setBookedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    experiencesApi
      .getById(id)
      .then(setExperience)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/experiences/${id}`);
      return;
    }
    if (user.role !== 'GUEST') {
      setBookError('Only guest accounts can book experiences.');
      return;
    }
    setBookError('');
    setBooking(true);
    try {
      const result = await experiencesApi.book(id, {
        seats,
        idempotencyKey: generateUUID(),
      });
      setBookedId(result.id);
    } catch (e: unknown) {
      setBookError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Experience not found.'}</p>
        <Link href="/experiences" className="btn-ghost mt-4 inline-block">
          ← Back to experiences
        </Link>
      </div>
    );
  }

  const total = experience.priceMinor * seats;
  const seatsAvailable = experience.seatsAvailable ?? experience.capacity;

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Link href="/experiences" className="btn-ghost text-sm mb-4 inline-block">
        ← Back to experiences
      </Link>

      {experience.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={experience.imageUrl}
          alt={experience.title}
          className="w-full h-72 object-cover rounded-2xl mb-6"
        />
      ) : (
        <div className="w-full h-72 bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl flex items-center justify-center text-7xl mb-6">
          🧘
        </div>
      )}

      <p className="text-xs text-brand-700 uppercase tracking-wide font-medium">
        {experience.category.replace(/-/g, ' ')}
      </p>
      <h1 className="page-title mt-1">{experience.title}</h1>
      <p className="text-gray-500 text-sm mt-1">
        {experience.city}, {experience.state}, {experience.country}
      </p>

      <div className="grid md:grid-cols-3 gap-4 my-6">
        <div className="card p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Starts</p>
          <p className="text-sm font-medium mt-1">
            {new Date(experience.startsAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Ends</p>
          <p className="text-sm font-medium mt-1">
            {new Date(experience.endsAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Price</p>
          <p className="text-xl font-bold text-brand-700 mt-1">
            {formatINR(experience.priceMinor)}
          </p>
          <p className="text-xs text-gray-400">per seat</p>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-2">About this experience</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line">{experience.description}</p>
      </div>

      {experience.host?.user?.fullName && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Hosted by</p>
            <p className="text-sm font-medium mt-1">{experience.host.user.fullName}</p>
          </div>
        </div>
      )}

      {bookedId ? (
        <div className="card p-6 bg-green-50 border-green-200">
          <p className="font-semibold text-green-800">Booking confirmed 🎉</p>
          <p className="text-sm text-green-700 mt-1">
            {seats} seat{seats === 1 ? '' : 's'} reserved. Total {formatINR(total)}.
          </p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block">
            View my bookings
          </Link>
        </div>
      ) : experience.status !== 'APPROVED' ? (
        <div className="card p-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            This experience is not yet open for booking (status: {experience.status}).
          </p>
        </div>
      ) : seatsAvailable <= 0 ? (
        <div className="card p-6 bg-gray-50 border-gray-200">
          <p className="text-sm text-gray-700">This experience is fully booked.</p>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Book your seat{seats === 1 ? '' : 's'}</h2>
          <div className="flex items-center gap-3 mb-4">
            <label className="label whitespace-nowrap">Seats</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, seatsAvailable)}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="input w-24"
            />
            <span className="text-sm text-gray-500 ml-auto">
              Total <span className="font-semibold text-brand-700">{formatINR(total)}</span>
            </span>
          </div>
          <button
            onClick={handleBook}
            disabled={booking || seats < 1}
            className="btn-primary w-full"
          >
            {booking ? <span className="spinner" /> : 'Book now'}
          </button>
          {bookError && <p className="text-red-500 text-sm mt-3">{bookError}</p>}
          <p className="text-xs text-gray-400 mt-3">
            {seatsAvailable} seat{seatsAvailable === 1 ? '' : 's'} remaining.
          </p>
        </div>
      )}
    </div>
  );
}
