'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, investorApi } from '../../../lib/api';
import type { CapitalCallForInvestor, CapitalCallStatus } from '../../../lib/types';

const STATUS_STYLES: Record<CapitalCallStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  FUNDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function StatusPill({ status }: { status: CapitalCallStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export default function InvestorCapitalCallsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<CapitalCallForInvestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.kind !== 'INVESTOR' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    if (user.kind !== 'INVESTOR' && user.role !== 'ADMIN') return;
    investorApi
      .listCapitalCalls()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || !user) return null;

  const openCount = rows.filter((r) => r.status === 'OPEN').length;
  const openAmount = rows
    .filter((r) => r.status === 'OPEN')
    .reduce((s, r) => s + r.investorShareMinor, 0);

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Capital Calls</h1>
        <p className="text-gray-500 text-sm mt-1">
          Funding requests from listings you co-own. Your share is pro-rated by investment %.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/investor/portfolio" className="btn-ghost text-sm">Portfolio</Link>
        <Link href="/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
        <Link href="/investor/capital-calls" className="btn-primary text-sm py-2 px-4">Capital Calls</Link>
        <Link href="/investor/documents" className="btn-ghost text-sm">Documents</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Open Calls</p>
          <p className="text-2xl font-bold text-amber-600">{openCount}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Your Outstanding Share</p>
          <p className="text-2xl font-bold text-brand-700">{formatINR(openAmount)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="font-semibold text-gray-700 mb-2">No capital calls</h3>
          <p className="text-gray-400 text-sm">
            Capital calls appear here when a listing needs additional funding.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <Link
                    href={`/listings/${r.listingId}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {r.listing.title}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {r.listing.city}, {r.listing.state}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>

              <p className="text-sm text-gray-700 mb-3">{r.reason}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total Call</p>
                  <p className="font-semibold">{formatINR(r.amountMinor)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Share %</p>
                  <p className="font-semibold">{(r.investorSharePct * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Contribution</p>
                  <p className="font-semibold text-brand-700">
                    {formatINR(r.investorShareMinor)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due By</p>
                  <p className="font-semibold">{formatDate(r.dueAt)}</p>
                </div>
              </div>

              {r.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span className="font-medium">Notes:</span> {r.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
