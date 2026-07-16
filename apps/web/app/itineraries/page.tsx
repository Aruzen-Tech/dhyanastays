'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { itinerariesApi } from '../../lib/api';
import type { Itinerary } from '../../lib/types';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  GENERATED: 'bg-amber-100 text-amber-700',
  FINALIZED: 'bg-green-100 text-green-700',
};

export default function ItinerariesListPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    itinerariesApi
      .list()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this itinerary?')) return;
    try {
      await itinerariesApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">AI itineraries</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personalized wellness retreat plans, generated in seconds.
          </p>
        </div>
        <Link href="/itineraries/new" className="btn-primary">
          + Generate
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-sm">No itineraries yet. Generate one for your next retreat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <Link href={`/itineraries/${i.id}`} className="hover:underline">
                      {i.destination}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(i.startsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    –{' '}
                    {new Date(i.endsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {i.travelers} traveler{i.travelers === 1 ? '' : 's'}
                  </p>
                  {i.summary && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{i.summary}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[i.status]}`}
                  >
                    {i.status}
                  </span>
                  <button
                    onClick={() => handleDelete(i.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
