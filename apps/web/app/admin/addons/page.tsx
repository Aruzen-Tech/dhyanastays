'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { addOnsApi, formatINR, formatDate } from '../../../lib/api';
import type {
  AddOn,
  AddOnScope,
  AddOnStatus,
  CancellationTier,
  ServiceProvider,
} from '../../../lib/types';

const STATUS_TABS: AddOnStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'RETIRED'];
const TIER_OPTIONS: CancellationTier[] = [
  'FLEXIBLE',
  'MODERATE',
  'STRICT',
  'NON_REFUNDABLE',
];
const SCOPE_OPTIONS: AddOnScope[] = ['GLOBAL', 'CLUSTER', 'LISTING'];

const STATUS_COLOR: Record<AddOnStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  RETIRED: 'bg-gray-200 text-gray-600',
};

export default function AdminAddOnsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<AddOnStatus>('PENDING');
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    providerId: '',
    title: '',
    description: '',
    priceMinor: 0,
    commissionRate: 0.15,
    cancellationTier: 'MODERATE' as CancellationTier,
    minLeadHours: 24,
    maxPerBooking: 1,
    scope: 'GLOBAL' as AddOnScope,
    listingId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = (status: AddOnStatus) => {
    setLoading(true);
    setError('');
    addOnsApi
      .listAdmin({ status })
      .then(setAddOns)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load(tab);
  }, [user, tab]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    addOnsApi.listProviders(true).then(setProviders).catch(() => {});
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const approve = async (id: string) => {
    const notes = prompt('Optional review notes:') ?? undefined;
    setActionLoading(id);
    try {
      await addOnsApi.approve(id, notes || undefined);
      setAddOns((prev) => prev.filter((a) => a.id !== id));
      showToast('✅ Add-on approved');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id: string) => {
    const notes = prompt('Reason for rejection (optional):') ?? undefined;
    setActionLoading(id);
    try {
      await addOnsApi.reject(id, notes || undefined);
      setAddOns((prev) => prev.filter((a) => a.id !== id));
      showToast('Add-on rejected');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const retire = async (id: string) => {
    if (!confirm('Retire this add-on? It will no longer be bookable.')) return;
    setActionLoading(id);
    try {
      await addOnsApi.retire(id);
      setAddOns((prev) => prev.filter((a) => a.id !== id));
      showToast('Add-on retired');
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
      const body: Parameters<typeof addOnsApi.create>[0] = {
        providerId: form.providerId,
        title: form.title.trim(),
        description: form.description.trim(),
        priceMinor: Math.round(form.priceMinor),
        commissionRate: form.commissionRate,
        cancellationTier: form.cancellationTier,
        minLeadHours: form.minLeadHours,
        maxPerBooking: form.maxPerBooking,
        scope: form.scope,
      };
      if (form.scope === 'LISTING' && form.listingId.trim()) {
        body.listingId = form.listingId.trim();
      }
      await addOnsApi.create(body);
      setShowForm(false);
      setForm({
        providerId: '',
        title: '',
        description: '',
        priceMinor: 0,
        commissionRate: 0.15,
        cancellationTier: 'MODERATE',
        minLeadHours: 24,
        maxPerBooking: 1,
        scope: 'GLOBAL',
        listingId: '',
      });
      showToast('✅ Add-on created (PENDING review)');
      if (tab === 'PENDING') load('PENDING');
      else setTab('PENDING');
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

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">Add-ons</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and manage service add-ons
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(tab)} className="btn-ghost text-sm">
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn-primary text-sm"
          >
            {showForm ? 'Cancel' : '+ New add-on'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-sm md:col-span-2">
              <span className="text-gray-700">Provider</span>
              <select
                required
                value={form.providerId}
                onChange={(e) =>
                  setForm({ ...form, providerId: e.target.value })
                }
                className="input mt-1"
              >
                <option value="">Select active provider…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.kind})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-gray-700">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input mt-1"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-gray-700">Description</span>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Price (paise)</span>
              <input
                type="number"
                required
                min={0}
                value={form.priceMinor}
                onChange={(e) =>
                  setForm({ ...form, priceMinor: Number(e.target.value) })
                }
                className="input mt-1"
              />
              <span className="text-xs text-gray-400">
                = {formatINR(form.priceMinor)}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Commission rate (0–1)</span>
              <input
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={form.commissionRate}
                onChange={(e) =>
                  setForm({ ...form, commissionRate: Number(e.target.value) })
                }
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Cancellation tier</span>
              <select
                value={form.cancellationTier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cancellationTier: e.target.value as CancellationTier,
                  })
                }
                className="input mt-1"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Min lead hours</span>
              <input
                type="number"
                min={0}
                value={form.minLeadHours}
                onChange={(e) =>
                  setForm({ ...form, minLeadHours: Number(e.target.value) })
                }
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Max per booking</span>
              <input
                type="number"
                min={1}
                value={form.maxPerBooking}
                onChange={(e) =>
                  setForm({ ...form, maxPerBooking: Number(e.target.value) })
                }
                className="input mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Scope</span>
              <select
                value={form.scope}
                onChange={(e) =>
                  setForm({ ...form, scope: e.target.value as AddOnScope })
                }
                className="input mt-1"
              >
                {SCOPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {form.scope === 'LISTING' && (
              <label className="block text-sm md:col-span-2">
                <span className="text-gray-700">Listing ID</span>
                <input
                  value={form.listingId}
                  onChange={(e) =>
                    setForm({ ...form, listingId: e.target.value })
                  }
                  className="input mt-1 font-mono text-xs"
                />
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? <span className="spinner" /> : 'Create add-on'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === s
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

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

      {!loading && addOns.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">🗂️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No {tab.toLowerCase()} add-ons
          </h3>
        </div>
      )}

      {!loading && addOns.length > 0 && (
        <div className="space-y-3">
          {addOns.map((a) => {
            const busy = actionLoading === a.id;
            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">
                        {a.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}
                      >
                        {a.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {a.scope}
                        {a.listing ? ` · ${a.listing.title}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {a.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                      <span>{formatINR(a.priceMinor)}</span>
                      <span>Commission {(a.commissionRate * 100).toFixed(0)}%</span>
                      <span>{a.cancellationTier}</span>
                      <span>Lead {a.minLeadHours}h</span>
                      <span>Max {a.maxPerBooking}/booking</span>
                      {a.provider && (
                        <span>
                          Provider: {a.provider.name} ({a.provider.kind})
                        </span>
                      )}
                      <span>Created {formatDate(a.createdAt)}</span>
                    </div>
                    {a.reviewNotes && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Review note: {a.reviewNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {a.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => approve(a.id)}
                          disabled={busy}
                          className="btn-primary text-sm"
                        >
                          {busy ? <span className="spinner" /> : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => reject(a.id)}
                          disabled={busy}
                          className="btn-danger text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {a.status === 'APPROVED' && (
                      <button
                        onClick={() => retire(a.id)}
                        disabled={busy}
                        className="btn-danger text-sm"
                      >
                        {busy ? <span className="spinner" /> : 'Retire'}
                      </button>
                    )}
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
