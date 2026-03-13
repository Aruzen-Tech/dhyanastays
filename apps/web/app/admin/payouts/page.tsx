'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, payoutsApi } from '../../../lib/api';
import type { PayoutBatch, PayoutLine } from '../../../lib/types';

type Tab = 'eligible' | 'batches';

export default function AdminPayoutsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('eligible');
  const [eligible, setEligible] = useState<PayoutLine[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadEligible = () => {
    setLoadingEligible(true);
    setError('');
    payoutsApi
      .getEligible()
      .then(setEligible)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingEligible(false));
  };

  const loadBatches = () => {
    setLoadingBatches(true);
    payoutsApi
      .getBatches()
      .then(setBatches)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingBatches(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadEligible();
    loadBatches();
  }, [user]);

  const handleRunWeekly = async () => {
    if (!confirm('Run weekly payout batch? This will schedule all eligible payout lines.')) return;
    setRunningBatch(true);
    try {
      const batch = await payoutsApi.runWeekly();
      showToast(`✅ Batch created: ${batch.id.slice(0, 10)}… · ${formatINR(batch.totalAmount)}`);
      loadEligible();
      loadBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to run batch');
    } finally {
      setRunningBatch(false);
    }
  };

  const handleMarkPaid = async (batchId: string) => {
    if (!confirm('Mark this batch as PAID? This is irreversible.')) return;
    setMarkingPaid(batchId);
    try {
      await payoutsApi.markBatchPaid(batchId);
      showToast('✅ Batch marked as paid');
      loadBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to mark paid');
    } finally {
      setMarkingPaid(null);
    }
  };

  const eligibleTotal = eligible.reduce((sum, l) => sum + l.amount, 0);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="page-title">Payout Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage host payouts — weekly batch processing and statements
          </p>
        </div>
        <button
          onClick={handleRunWeekly}
          disabled={runningBatch || eligible.length === 0}
          className="btn-primary text-sm py-2.5 px-5 shrink-0"
        >
          {runningBatch ? (
            <><span className="spinner" /> Running batch…</>
          ) : (
            `▶ Run weekly batch (${eligible.length} lines)`
          )}
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">Eligible lines</p>
          <p className="text-3xl font-bold text-brand-700">{eligible.length}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">Eligible amount</p>
          <p className="text-3xl font-bold text-green-600">{formatINR(eligibleTotal)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">Total batches</p>
          <p className="text-3xl font-bold text-gray-700">{batches.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {(['eligible', 'batches'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'eligible' ? `💰 Eligible Lines (${eligible.length})` : `📦 Batches (${batches.length})`}
          </button>
        ))}
      </div>

      {/* Eligible lines tab */}
      {tab === 'eligible' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Eligible Payout Lines</p>
            <button onClick={loadEligible} className="btn-ghost text-xs">↻ Refresh</button>
          </div>

          {loadingEligible && (
            <div className="p-8 text-center">
              <span className="spinner text-brand-700" />
            </div>
          )}

          {!loadingEligible && eligible.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💤</div>
              <p className="text-gray-500 text-sm">No eligible payout lines right now.</p>
              <p className="text-gray-400 text-xs mt-1">
                Lines become eligible 24h after guest check-in.
              </p>
            </div>
          )}

          {!loadingEligible && eligible.length > 0 && (
            <div className="divide-y divide-gray-100">
              {eligible.map((line) => (
                <div key={line.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={line.status} size="sm" />
                      <span className="text-xs text-gray-400 font-mono">{line.id.slice(0, 10)}…</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      Booking {line.bookingId.slice(0, 10)}…
                    </p>
                    <p className="text-xs text-gray-500">
                      Host: {line.hostId.slice(0, 10)}… · Eligible: {formatDate(line.eligibleAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700 text-base">{formatINR(line.amount)}</p>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 bg-brand-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-800">Total eligible</span>
                <span className="font-bold text-brand-700 text-lg">{formatINR(eligibleTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batches tab */}
      {tab === 'batches' && (
        <div className="space-y-4">
          {loadingBatches && (
            <div className="text-center py-8">
              <span className="spinner text-brand-700" />
            </div>
          )}

          {!loadingBatches && batches.length === 0 && (
            <div className="text-center py-16 card">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500 text-sm">No payout batches yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Run a weekly batch to create the first one.
              </p>
            </div>
          )}

          {!loadingBatches && batches.map((batch) => (
            <div key={batch.id} className="card overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={batch.status} />
                      <span className="text-xs text-gray-400 font-mono">{batch.id.slice(0, 12)}…</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Run date: <strong>{formatDate(batch.runDate)}</strong>
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Lines: <strong>{batch.lines?.length ?? 0}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-700">{formatINR(batch.totalAmount)}</p>
                    <p className="text-xs text-gray-400">total amount</p>
                  </div>
                </div>
              </div>

              {/* Batch lines */}
              {batch.lines && batch.lines.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {batch.lines.slice(0, 5).map((line) => (
                    <div key={line.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-mono text-xs">{line.id.slice(0, 12)}…</span>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={line.status} size="sm" />
                        <span className="font-medium text-gray-900">{formatINR(line.amount)}</span>
                      </div>
                    </div>
                  ))}
                  {batch.lines.length > 5 && (
                    <div className="px-5 py-2 text-xs text-gray-400 text-center">
                      +{batch.lines.length - 5} more lines
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {batch.status === 'SCHEDULED' && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handleMarkPaid(batch.id)}
                    disabled={markingPaid === batch.id}
                    className="btn-primary text-sm py-2 px-5"
                  >
                    {markingPaid === batch.id ? (
                      <><span className="spinner" /> Marking paid…</>
                    ) : (
                      '✓ Mark as paid'
                    )}
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
