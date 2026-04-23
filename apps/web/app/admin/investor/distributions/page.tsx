'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminInvestorApi, formatDate, formatINR } from '../../../../lib/api';
import type { AdminDistribution, DistributionStatus } from '../../../../lib/types';

const STATUS_STYLES: Record<DistributionStatus, string> = {
  CALCULATED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function AdminDistributionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState('');
  const [rows, setRows] = useState<AdminDistribution[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [recomputeForm, setRecomputeForm] = useState({ period: '', investorUserId: '' });
  const [showRecompute, setShowRecompute] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    setError('');
    adminInvestorApi
      .listDistributions(period || undefined)
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

  const recompute = async () => {
    if (!recomputeForm.period && !recomputeForm.investorUserId) {
      if (!confirm('Recompute distributions for the previous month across all investors?')) return;
    }
    setRecomputing(true);
    try {
      const res = await adminInvestorApi.recompute({
        ...(recomputeForm.period && { period: recomputeForm.period }),
        ...(recomputeForm.investorUserId && { investorUserId: recomputeForm.investorUserId }),
      });
      showToast(`✅ Recomputed ${res.computed} distribution(s) for ${res.period}`);
      setRecomputeForm({ period: '', investorUserId: '' });
      setShowRecompute(false);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  const markPaid = async (r: AdminDistribution) => {
    const ledgerEventId = prompt('Ledger event ID (payout reference):') ?? '';
    if (!ledgerEventId.trim()) return;
    setActionLoading(r.id);
    try {
      await adminInvestorApi.updateDistribution(r.id, {
        status: 'PAID',
        ledgerEventId: ledgerEventId.trim(),
      });
      showToast('Marked PAID');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const markFailed = async (id: string) => {
    if (!confirm('Mark this distribution as FAILED?')) return;
    setActionLoading(id);
    try {
      await adminInvestorApi.updateDistribution(id, { status: 'FAILED' });
      showToast('Marked FAILED');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) return null;

  const totalCalculated = rows
    .filter((r) => r.status === 'CALCULATED')
    .reduce((s, r) => s + r.amountMinor, 0);
  const totalPaid = rows
    .filter((r) => r.status === 'PAID')
    .reduce((s, r) => s + r.amountMinor, 0);

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
        <h1 className="page-title">Distributions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monthly revenue-share close. Runs automatically on the 1st of each month (02:00 UTC).
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/admin/investor/investments" className="btn-ghost text-sm">Investments</Link>
        <Link href="/admin/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/admin/investor/documents" className="btn-ghost text-sm">Documents</Link>
        <Link href="/admin/investor/distributions" className="btn-primary text-sm py-2 px-4">Distributions</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filter by period (YYYY-MM)</label>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-03"
            className="input text-sm py-2"
          />
        </div>
        <button onClick={load} className="btn-primary text-sm py-2 px-4">Apply</button>
        <button onClick={() => setShowRecompute((v) => !v)} className="btn-secondary text-sm py-2 px-4">
          {showRecompute ? 'Cancel' : 'Recompute'}
        </button>
      </div>

      {showRecompute && (
        <div className="card p-5 mb-6 space-y-3">
          <h3 className="font-semibold">Recompute Distributions</h3>
          <p className="text-xs text-gray-500">
            Leave blank to recompute all investors for the previous month. Provide a period (YYYY-MM) or
            investor user ID to narrow the scope. Idempotent — existing CALCULATED rows for the period are
            overwritten; PAID rows are skipped.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Period (YYYY-MM)</label>
              <input
                value={recomputeForm.period}
                onChange={(e) => setRecomputeForm({ ...recomputeForm, period: e.target.value })}
                placeholder="2026-03"
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Investor user ID (optional)</label>
              <input
                value={recomputeForm.investorUserId}
                onChange={(e) =>
                  setRecomputeForm({ ...recomputeForm, investorUserId: e.target.value })
                }
                className="input text-sm py-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={recompute}
              disabled={recomputing}
              className="btn-primary text-sm py-2 px-4"
            >
              {recomputing ? 'Running…' : 'Run Recompute'}
            </button>
            <button onClick={() => setShowRecompute(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Calculated</p>
          <p className="text-2xl font-bold text-amber-600">{formatINR(totalCalculated)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatINR(totalPaid)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📑</div>
          <h3 className="font-semibold text-gray-700 mb-2">No distributions</h3>
          <p className="text-gray-400 text-sm">Run a recompute to generate the first period.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-left px-4 py-3">Investor</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Computed</th>
                  <th className="text-left px-4 py-3">Paid</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="px-4 py-3 font-medium">{r.period}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.investor.fullName}</p>
                        <p className="text-xs text-gray-400">{r.investor.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatINR(r.amountMinor)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[r.status]}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.computedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.paidAt ? formatDate(r.paidAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {r.breakdown && r.breakdown.length > 0 && (
                          <button
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className="text-xs text-brand-700 hover:underline"
                          >
                            {expanded === r.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                        {r.status === 'CALCULATED' && (
                          <>
                            <button
                              onClick={() => markPaid(r)}
                              disabled={actionLoading === r.id}
                              className="text-xs text-green-700 hover:underline"
                            >
                              Mark paid
                            </button>
                            <button
                              onClick={() => markFailed(r.id)}
                              disabled={actionLoading === r.id}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Mark failed
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expanded === r.id && r.breakdown && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="text-left py-1">Listing</th>
                                <th className="text-right py-1">Share %</th>
                                <th className="text-right py-1">Gross</th>
                                <th className="text-right py-1">Share Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.breakdown.map((b) => (
                                <tr key={b.listingId}>
                                  <td className="py-1">{b.listingTitle}</td>
                                  <td className="py-1 text-right">
                                    {(b.sharePct * 100).toFixed(2)}%
                                  </td>
                                  <td className="py-1 text-right">{formatINR(b.grossMinor)}</td>
                                  <td className="py-1 text-right font-semibold">
                                    {formatINR(b.sharedMinor)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {r.ledgerEventId && (
                            <p className="text-xs text-gray-500 mt-2">
                              Ledger ref: <code className="font-mono">{r.ledgerEventId}</code>
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
