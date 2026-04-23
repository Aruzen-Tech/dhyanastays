'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, investorApi } from '../../../lib/api';
import type { Distribution, DistributionStatus } from '../../../lib/types';

const STATUS_STYLES: Record<DistributionStatus, string> = {
  CALCULATED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

function StatusPill({ status }: { status: DistributionStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export default function InvestorDistributionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<Distribution[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.kind !== 'INVESTOR' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const load = () => {
    if (!user) return;
    setLoading(true);
    setError('');
    investorApi
      .listDistributions({
        ...(from && { from }),
        ...(to && { to }),
      })
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    if (user.kind !== 'INVESTOR' && user.role !== 'ADMIN') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading || !user) return null;

  const totalPaid = rows
    .filter((r) => r.status === 'PAID')
    .reduce((s, r) => s + r.amountMinor, 0);
  const totalPending = rows
    .filter((r) => r.status === 'CALCULATED')
    .reduce((s, r) => s + r.amountMinor, 0);

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Distribution Statements</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monthly revenue-share distributions. Closed on the 1st of each month.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/investor/portfolio" className="btn-ghost text-sm">Portfolio</Link>
        <Link href="/investor/distributions" className="btn-primary text-sm py-2 px-4">Distributions</Link>
        <Link href="/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/investor/documents" className="btn-ghost text-sm">Documents</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Filter */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From (YYYY-MM)</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="2026-01"
            className="input text-sm py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To (YYYY-MM)</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="2026-12"
            className="input text-sm py-2"
          />
        </div>
        <button onClick={load} className="btn-primary text-sm py-2 px-4">Apply</button>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              setTimeout(load, 0);
            }}
            className="btn-ghost text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatINR(totalPaid)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{formatINR(totalPending)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📑</div>
          <h3 className="font-semibold text-gray-700 mb-2">No distributions yet</h3>
          <p className="text-gray-400 text-sm">
            Monthly distributions appear here after the period close on the 1st of each month.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Period</th>
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
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        {formatINR(r.amountMinor)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.computedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.paidAt ? formatDate(r.paidAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.breakdown && r.breakdown.length > 0 && (
                          <button
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className="text-xs text-brand-700 hover:underline"
                          >
                            {expanded === r.id ? 'Hide' : 'Breakdown'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === r.id && r.breakdown && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="text-left py-1">Listing</th>
                                <th className="text-right py-1">Share %</th>
                                <th className="text-right py-1">Gross</th>
                                <th className="text-right py-1">Your Share</th>
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
