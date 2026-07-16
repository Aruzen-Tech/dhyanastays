'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminInvestorApi, formatDate, formatINR } from '../../../../lib/api';
import type { AdminCapitalCall, CapitalCallStatus } from '../../../../lib/types';

const STATUS_TABS: (CapitalCallStatus | 'ALL')[] = [
  'ALL',
  'OPEN',
  'FUNDED',
  'CLOSED',
  'CANCELLED',
];

const STATUS_STYLES: Record<CapitalCallStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  FUNDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminCapitalCallsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<CapitalCallStatus | 'ALL'>('ALL');
  const [rows, setRows] = useState<AdminCapitalCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    listingId: '',
    amountRupees: 0,
    reason: '',
    dueAt: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    setError('');
    adminInvestorApi
      .listCapitalCalls(tab === 'ALL' ? undefined : { status: tab })
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const create = async () => {
    if (!form.listingId || !form.reason || !form.dueAt || form.amountRupees <= 0) {
      alert('Listing, amount, reason and due date are required');
      return;
    }
    setSubmitting(true);
    try {
      await adminInvestorApi.createCapitalCall({
        listingId: form.listingId.trim(),
        amountMinor: Math.round(form.amountRupees * 100),
        reason: form.reason,
        dueAt: new Date(form.dueAt).toISOString(),
        ...(form.notes && { notes: form.notes }),
      });
      setForm({ listingId: '', amountRupees: 0, reason: '', dueAt: '', notes: '' });
      setShowForm(false);
      showToast('✅ Capital call opened');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: CapitalCallStatus) => {
    setActionLoading(id);
    try {
      await adminInvestorApi.updateCapitalCall(id, { status });
      showToast(`Marked ${status}`);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Capital Calls</h1>
        <p className="text-gray-500 text-sm mt-1">
          Open a funding request against a listing; investors are notified per their share %.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/admin/investor/investments" className="btn-ghost text-sm">Investments</Link>
        <Link href="/admin/investor/capital-calls" className="btn-primary text-sm py-2 px-4">Capital Calls</Link>
        <Link href="/admin/investor/documents" className="btn-ghost text-sm">Documents</Link>
        <Link href="/admin/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap ${
              tab === t ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={() => setShowForm((v) => !v)} className="ml-auto btn-secondary text-sm py-1.5 px-3">
          {showForm ? 'Cancel' : '+ New Call'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6 space-y-3">
          <h3 className="font-semibold">New Capital Call</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Listing ID *</label>
              <input
                value={form.listingId}
                onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="1"
                value={form.amountRupees}
                onChange={(e) => setForm({ ...form, amountRupees: parseFloat(e.target.value) || 0 })}
                className="input text-sm py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Reason *</label>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. HVAC replacement, roof repair"
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due date *</label>
              <input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="input text-sm py-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={submitting} className="btn-primary text-sm py-2 px-4">
              {submitting ? 'Saving…' : 'Open Call'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="font-semibold text-gray-700 mb-2">No capital calls</h3>
          <p className="text-gray-400 text-sm">Open the first capital call above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <Link href={`/listings/${r.listingId}`} className="font-semibold text-brand-700 hover:underline">
                    {r.listing.title}
                  </Link>
                  <p className="text-xs text-gray-400">{r.listing.city}, {r.listing.state}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3">{r.reason}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold">{formatINR(r.amountMinor)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due</p>
                  <p className="font-semibold">{formatDate(r.dueAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="font-semibold">{formatDate(r.createdAt)}</p>
                </div>
              </div>

              {r.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span className="font-medium">Notes:</span> {r.notes}
                </div>
              )}

              {r.status === 'OPEN' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatus(r.id, 'FUNDED')}
                    disabled={actionLoading === r.id}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Mark funded
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'CLOSED')}
                    disabled={actionLoading === r.id}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'CANCELLED')}
                    disabled={actionLoading === r.id}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
