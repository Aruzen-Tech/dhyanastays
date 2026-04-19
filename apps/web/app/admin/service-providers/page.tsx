'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { addOnsApi, formatDate } from '../../../lib/api';
import type { ServiceProvider, ServiceProviderKind } from '../../../lib/types';

const KIND_OPTIONS: ServiceProviderKind[] = [
  'TRANSPORT',
  'FOOD',
  'WELLNESS',
  'EXPERIENCE',
  'CONCIERGE',
  'HOUSEKEEPING',
];

const KIND_ICON: Record<ServiceProviderKind, string> = {
  TRANSPORT: '🚗',
  FOOD: '🍽️',
  WELLNESS: '🧘',
  EXPERIENCE: '✨',
  CONCIERGE: '🛎️',
  HOUSEKEEPING: '🧹',
};

export default function AdminServiceProvidersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    kind: 'TRANSPORT' as ServiceProviderKind,
    ownerUserId: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    setError('');
    addOnsApi
      .listProviders(false)
      .then(setProviders)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load();
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleActive = async (p: ServiceProvider) => {
    setActionLoading(p.id);
    try {
      const updated = p.active
        ? await addOnsApi.deactivateProvider(p.id)
        : await addOnsApi.activateProvider(p.id);
      setProviders((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      showToast(updated.active ? '✅ Provider activated' : 'Provider deactivated');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await addOnsApi.createProvider({
        name: form.name.trim(),
        kind: form.kind,
        ownerUserId: form.ownerUserId.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      });
      setProviders((prev) => [created, ...prev]);
      setForm({
        name: '',
        kind: 'TRANSPORT',
        ownerUserId: '',
        contactEmail: '',
        contactPhone: '',
      });
      setShowForm(false);
      showToast('✅ Provider created');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Service Providers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading
              ? 'Loading…'
              : `${providers.length} provider${providers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn-primary text-sm"
          >
            {showForm ? 'Cancel' : '+ New provider'}
          </button>
        </div>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-gray-700">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Kind</span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as ServiceProviderKind })
                }
                className="input mt-1"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_ICON[k]} {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-gray-700">Owner User ID</span>
              <input
                required
                value={form.ownerUserId}
                onChange={(e) =>
                  setForm({ ...form, ownerUserId: e.target.value })
                }
                className="input mt-1 font-mono text-xs"
                placeholder="cuid…"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Contact email</span>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Contact phone</span>
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                className="input mt-1"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? <span className="spinner" /> : 'Create provider'}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && providers.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">🛎️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No providers yet
          </h3>
          <p className="text-gray-400 text-sm">
            Create a service provider to start offering add-ons.
          </p>
        </div>
      )}

      {!loading && providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((p) => {
            const busy = actionLoading === p.id;
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{KIND_ICON[p.kind]}</span>
                      <span className="font-semibold text-gray-900">
                        {p.name}
                      </span>
                      <span className="text-xs text-gray-500">· {p.kind}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                      {p._count && (
                        <span className="text-xs text-gray-500">
                          · {p._count.addOns} add-on
                          {p._count.addOns !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {p.owner && (
                      <p className="text-sm text-gray-600">
                        Owner: {p.owner.fullName} ({p.owner.email})
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {p.contactEmail ?? '—'} · {p.contactPhone ?? '—'} ·
                      created {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(p)}
                      disabled={busy}
                      className={p.active ? 'btn-danger text-sm' : 'btn-primary text-sm'}
                    >
                      {busy ? (
                        <span className="spinner" />
                      ) : p.active ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
