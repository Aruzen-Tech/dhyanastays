'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminInvestorApi, formatDate } from '../../../../lib/api';
import type { AdminInvestment } from '../../../../lib/types';

export default function AdminInvestmentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AdminInvestment[]>([]);
  const [filterInvestor, setFilterInvestor] = useState('');
  const [filterListing, setFilterListing] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    investorUserId: '',
    listingId: '',
    sharePctPct: 10,
    effectiveAt: new Date().toISOString().slice(0, 10),
    endedAt: '',
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
      .listInvestments({
        ...(filterInvestor && { investorUserId: filterInvestor }),
        ...(filterListing && { listingId: filterListing }),
      })
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const create = async () => {
    if (!form.investorUserId || !form.listingId || !form.effectiveAt) {
      alert('Investor, listing and effective date are required');
      return;
    }
    if (form.sharePctPct <= 0 || form.sharePctPct > 100) {
      alert('Share % must be between 0 and 100');
      return;
    }
    setSubmitting(true);
    try {
      await adminInvestorApi.createInvestment({
        investorUserId: form.investorUserId.trim(),
        listingId: form.listingId.trim(),
        sharePct: form.sharePctPct / 100,
        effectiveAt: new Date(form.effectiveAt).toISOString(),
        ...(form.endedAt && { endedAt: new Date(form.endedAt).toISOString() }),
        ...(form.notes && { notes: form.notes }),
      });
      setForm({
        investorUserId: '',
        listingId: '',
        sharePctPct: 10,
        effectiveAt: new Date().toISOString().slice(0, 10),
        endedAt: '',
        notes: '',
      });
      setShowForm(false);
      showToast('✅ Investment recorded');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const endNow = async (id: string) => {
    if (!confirm('End this investment now? No future bookings will count toward this share.')) return;
    setActionLoading(id);
    try {
      await adminInvestorApi.updateInvestment(id, { endedAt: new Date().toISOString() });
      showToast('Investment ended');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this investment? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await adminInvestorApi.removeInvestment(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      showToast('Investment deleted');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Investor Investments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Link investors to listings with a revenue share percentage.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/admin/investor/investments" className="btn-primary text-sm py-2 px-4">Investments</Link>
        <Link href="/admin/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/admin/investor/documents" className="btn-ghost text-sm">Documents</Link>
        <Link href="/admin/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Filters + create toggle */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Investor user ID</label>
          <input
            value={filterInvestor}
            onChange={(e) => setFilterInvestor(e.target.value)}
            placeholder="cuid…"
            className="input text-sm py-2"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Listing ID</label>
          <input
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            placeholder="cuid…"
            className="input text-sm py-2"
          />
        </div>
        <button onClick={load} className="btn-primary text-sm py-2 px-4">Apply</button>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary text-sm py-2 px-4">
          {showForm ? 'Cancel' : '+ New Investment'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6 space-y-3">
          <h3 className="font-semibold">New Investment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Investor user ID *</label>
              <input
                value={form.investorUserId}
                onChange={(e) => setForm({ ...form, investorUserId: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Listing ID *</label>
              <input
                value={form.listingId}
                onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Share % (0-100) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={form.sharePctPct}
                onChange={(e) => setForm({ ...form, sharePctPct: parseFloat(e.target.value) || 0 })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Effective from *</label>
              <input
                type="date"
                value={form.effectiveAt}
                onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ended at (optional)</label>
              <input
                type="date"
                value={form.endedAt}
                onChange={(e) => setForm({ ...form, endedAt: e.target.value })}
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
              {submitting ? 'Saving…' : 'Create'}
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
          <div className="text-5xl mb-4">💼</div>
          <h3 className="font-semibold text-gray-700 mb-2">No investments</h3>
          <p className="text-gray-400 text-sm">Create the first investment above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Investor</th>
                  <th className="text-left px-4 py-3">Listing</th>
                  <th className="text-right px-4 py-3">Share %</th>
                  <th className="text-left px-4 py-3">Effective</th>
                  <th className="text-left px-4 py-3">Ended</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.investor.fullName}</p>
                      <p className="text-xs text-gray-400">{r.investor.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/listings/${r.listingId}`} className="text-brand-700 hover:underline">
                        {r.listing.title}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {r.listing.city}, {r.listing.state}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {(parseFloat(r.sharePct) * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.effectiveAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.endedAt ? (
                        formatDate(r.endedAt)
                      ) : (
                        <span className="text-green-600 font-medium">active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {!r.endedAt && (
                        <button
                          onClick={() => endNow(r.id)}
                          disabled={actionLoading === r.id}
                          className="text-xs text-amber-700 hover:underline"
                        >
                          End
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        disabled={actionLoading === r.id}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
