'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi } from '../../../../lib/api';
import type { BookingDirections } from '../../../../lib/types';

export default function DirectionsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<BookingDirections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getDirections(id)
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
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access directions</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  const directions = data?.propertyDirections;

  if (!directions) {
    return (
      <div className="container-page py-16 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No directions available yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          The host hasn&apos;t added property directions for this listing yet.
        </p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  const hasCoordinates = directions.gpsLat && directions.gpsLng;
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${directions.gpsLat},${directions.gpsLng}`
    : directions.address
      ? `https://www.google.com/maps/search/${encodeURIComponent(directions.address)}`
      : null;

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <h1 className="page-title">Property Directions</h1>
        {data?.listingTitle && (
          <p className="text-gray-500 text-sm mt-1">{data.listingTitle}</p>
        )}
      </div>

      {directions.address && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📍</span>
            <h2 className="font-semibold text-gray-900">Address</h2>
          </div>
          <p className="text-sm text-gray-700">{directions.address}</p>
        </section>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 flex items-center gap-3 hover:bg-brand-50 transition-colors mb-4"
        >
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Open in Google Maps</p>
            <p className="text-xs text-gray-500">Get navigation directions</p>
          </div>
          <span className="ml-auto text-gray-400">→</span>
        </a>
      )}

      {directions.landmarks && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏛️</span>
            <h2 className="font-semibold text-gray-900">Landmarks</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{directions.landmarks}</p>
        </section>
      )}

      {directions.transportOptions && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🚗</span>
            <h2 className="font-semibold text-gray-900">Transport Options</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{directions.transportOptions}</p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {directions.nearestAirport && (
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✈️</span>
              <h3 className="font-semibold text-gray-900 text-sm">Nearest Airport</h3>
            </div>
            <p className="text-sm text-gray-700">{directions.nearestAirport}</p>
          </section>
        )}
        {directions.nearestStation && (
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚂</span>
              <h3 className="font-semibold text-gray-900 text-sm">Nearest Station</h3>
            </div>
            <p className="text-sm text-gray-700">{directions.nearestStation}</p>
          </section>
        )}
      </div>

      {directions.parkingInfo && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🅿️</span>
            <h2 className="font-semibold text-gray-900">Parking</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{directions.parkingInfo}</p>
        </section>
      )}

      {directions.additionalNotes && (
        <section className="card p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h2 className="font-semibold text-gray-900">Additional Notes</h2>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{directions.additionalNotes}</p>
        </section>
      )}
    </div>
  );
}
