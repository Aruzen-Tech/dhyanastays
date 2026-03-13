'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, payoutsApi } from '../../../lib/api';
import type { HostStatement } from '../../../lib/types';

export default function HostPayoutsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [statement, setStatement] = useState<HostStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    payoutsApi
      .getHostStatements()
      .then(setStatement)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Payout Statements</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your earnings from confirmed bookings. Payouts are processed weekly.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      )}

      {!loading && !statement && !error && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="font-semibold text-gray-700 mb-2">No payout data yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Earnings appear here after guests check in. Payouts are processed weekly, 24h after check-in.
          </p>
        </div>
      )}

      {!loading && statement && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Total Earned</p>
              <p className="text-3xl font-bold text-brand-700">{formatINR(statement.totalEarned)}</p>
              <p className="text-xs text-gray-400 mt-1">All-time paid out</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Pending</p>
              <p className="text-3xl font-bold text-amber-600">{formatINR(statement.totalPending)}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting payout</p>
            </div>
          </div>

          {/* Payout info */}
          <div className="alert-info">
            <p className="font-medium mb-1">ℹ️ How payouts work</p>
            <ul className="text-xs space-y-1 opacity-80">
              <li>• Earnings become eligible 24 hours after guest check-in</li>
              <li>• Eligible earnings are batched in weekly payout runs</li>
              <li>• Refunds after payout create a negative carry-forward balance</li>
              <li>• Platform commission of 10% is deducted from each booking</li>
            </ul>
          </div>

          {/* Payout lines table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Payout Lines</h2>
              <p className="text-xs text-gray-500 mt-0.5">{statement.lines.length} total entries</p>
            </div>

            {statement.lines.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm">No payout lines yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {statement.lines.map((line) => (
                  <div key={line.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={line.status} size="sm" />
                          {line.batchId && (
                            <span className="text-xs text-gray-400">
                              Batch: {line.batchId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Booking {line.bookingId.slice(0, 10)}…
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Eligible from: {formatDate(line.eligibleAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {formatDate(line.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-brand-700 text-lg">{formatINR(line.amount)}</p>
                        <p className="text-xs text-gray-400">after 10% fee</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
