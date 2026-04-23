'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { itinerariesApi, formatINR } from '../../../lib/api';
import type { Itinerary } from '../../../lib/types';

const CATEGORY_EMOJI: Record<string, string> = {
  yoga: '🧘',
  meditation: '🕉️',
  meal: '🍽️',
  activity: '🚶',
  rest: '🌿',
  cultural: '🏛️',
};

export default function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!id || !user) return;
    itinerariesApi
      .getById(id)
      .then(setItinerary)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const updated = await itinerariesApi.finalize(id);
      setItinerary(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Finalize failed');
    } finally {
      setFinalizing(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Itinerary not found.'}</p>
        <Link href="/itineraries" className="btn-ghost mt-4 inline-block">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Link href="/itineraries" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="page-title">{itinerary.destination}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(itinerary.startsAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}{' '}
            –{' '}
            {new Date(itinerary.endsAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {itinerary.travelers} traveler{itinerary.travelers === 1 ? '' : 's'}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            itinerary.status === 'FINALIZED'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {itinerary.status}
        </span>
      </div>

      {itinerary.budgetMinor != null && (
        <p className="text-xs text-gray-500 mb-4">
          Budget: {formatINR(itinerary.budgetMinor)} per person
        </p>
      )}

      {itinerary.interests.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {itinerary.interests.map((i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200"
            >
              {i}
            </span>
          ))}
        </div>
      )}

      {itinerary.summary && (
        <div className="card p-5 mb-6 bg-brand-50/50 border-brand-100">
          <h2 className="font-semibold text-gray-900 mb-2">Overview</h2>
          <p className="text-sm text-gray-700">{itinerary.summary}</p>
        </div>
      )}

      {itinerary.days?.map((day) => (
        <div key={day.day} className="card p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold text-sm">
              {day.day}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{day.title}</h3>
              <p className="text-xs text-gray-500">
                {new Date(day.date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-l-2 border-gray-100 ml-5 pl-4">
            {day.sessions.map((s, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-200 border-2 border-brand-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{s.time}</span>
                  <span className="text-xs">{CATEGORY_EMOJI[s.category] ?? '•'}</span>
                  <span className="text-sm font-medium text-gray-900">{s.title}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {itinerary.status !== 'FINALIZED' && (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="btn-primary w-full mt-4"
        >
          {finalizing ? <span className="spinner" /> : 'Finalize itinerary'}
        </button>
      )}

      {itinerary.model && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Generated by {itinerary.model}
        </p>
      )}
    </div>
  );
}
