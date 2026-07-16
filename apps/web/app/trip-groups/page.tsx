'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { tripGroupsApi } from '../../lib/api';
import type { TripGroup } from '../../lib/types';

export default function TripGroupsListPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<TripGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', destination: '', startsAt: '', endsAt: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    tripGroupsApi
      .list()
      .then(setGroups)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await tripGroupsApi.create({
        name: form.name,
        destination: form.destination || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      router.push(`/trip-groups/${created.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create');
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

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Trip groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan retreats together and split expenses with friends.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            + New group
          </button>
        )}
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {creating && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-3">
          <div>
            <label className="label">Group name</label>
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Rishikesh yoga trip"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Destination</label>
              <input
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="input"
                placeholder="Rishikesh"
              />
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Starts</label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Ends</label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <span className="spinner" /> : 'Create group'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 && !creating ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">👯</div>
          <p className="text-sm">
            No trip groups yet. Create one to plan retreats with friends.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/trip-groups/${g.id}`}
              className="card p-4 block hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{g.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {g.destination ? `${g.destination} · ` : ''}
                    {g.startsAt
                      ? new Date(g.startsAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'dates TBD'}
                    {g.endsAt &&
                      ` – ${new Date(g.endsAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}`}
                  </p>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  <p>{g._count?.members ?? 0} member{g._count?.members === 1 ? '' : 's'}</p>
                  <p>{g._count?.expenses ?? 0} expense{g._count?.expenses === 1 ? '' : 's'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
