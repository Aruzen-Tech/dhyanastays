'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { experiencesApi, formatINR } from '../../../lib/api';
import type { Experience, ExperienceStatus } from '../../../lib/types';

const STATUS_COLOR: Record<ExperienceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

export default function HostExperiencesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'HOST')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    experiencesApi
      .listHost()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleClose = async (id: string) => {
    if (!confirm('Close this experience? It will no longer be bookable.')) return;
    try {
      await experiencesApi.close(id);
      setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'CLOSED' } : e)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to close');
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
    <div className="container-page py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">My experiences</h1>
          <p className="text-gray-500 text-sm mt-1">
            Yoga, meditation, and wellness sessions you host.
          </p>
        </div>
        <Link href="/host/experiences/new" className="btn-primary">
          + New experience
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">🧘</div>
          <p className="text-sm">No experiences yet. Create your first wellness session.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Starts</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-xs text-gray-400">
                      {e.city}, {e.state}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.category.replace(/-/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(e.startsAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{formatINR(e.priceMinor)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[e.status]}`}>
                      {e.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/host/experiences/${e.id}/edit`}
                      className="text-xs text-brand-700 hover:underline mr-3"
                    >
                      Edit
                    </Link>
                    {e.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleClose(e.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
