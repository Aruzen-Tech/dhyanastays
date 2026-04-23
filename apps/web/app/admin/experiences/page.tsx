'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { experiencesApi, formatINR } from '../../../lib/api';
import type { Experience, ExperienceStatus } from '../../../lib/types';

const STATUSES: ExperienceStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CLOSED',
  'DRAFT',
];

export default function AdminExperiencesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ExperienceStatus>('PENDING_APPROVAL');
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    experiencesApi
      .listAdmin(status)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModerate = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    setBusyId(id);
    try {
      await experiencesApi.moderate(id, {
        action,
        notes: action === 'REJECTED' ? note || undefined : undefined,
      });
      setItems((prev) => prev.filter((e) => e.id !== id));
      setNoteFor(null);
      setNote('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container-page py-10">
      <h1 className="page-title mb-4">Experience moderation</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-full border ${
              status === s
                ? 'bg-brand-700 text-white border-brand-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-700'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="py-10 text-center">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No experiences with status {status.replace(/_/g, ' ')}.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start gap-4">
                {e.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-brand-700 uppercase font-medium">
                      {e.category.replace(/-/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(e.startsAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{e.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {e.city}, {e.state} · Host: {e.host?.user?.fullName ?? '—'} ·{' '}
                    {formatINR(e.priceMinor)} × {e.capacity} seats
                  </p>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-3">{e.description}</p>
                  {e.reviewNotes && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Review notes: {e.reviewNotes}
                    </p>
                  )}
                </div>
              </div>

              {status === 'PENDING_APPROVAL' && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  {noteFor === e.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={note}
                        onChange={(ev) => setNote(ev.target.value)}
                        placeholder="Reason for rejection (visible to host)"
                        rows={2}
                        className="input text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModerate(e.id, 'REJECTED')}
                          disabled={busyId === e.id}
                          className="btn-secondary text-xs"
                        >
                          Confirm reject
                        </button>
                        <button
                          onClick={() => {
                            setNoteFor(null);
                            setNote('');
                          }}
                          className="btn-ghost text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModerate(e.id, 'APPROVED')}
                        disabled={busyId === e.id}
                        className="btn-primary text-xs"
                      >
                        {busyId === e.id ? <span className="spinner" /> : 'Approve'}
                      </button>
                      <button
                        onClick={() => setNoteFor(e.id)}
                        className="btn-secondary text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
