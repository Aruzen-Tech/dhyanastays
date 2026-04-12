'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, payoutsApi } from '../../../lib/api';
import { downloadCSV } from '../../../lib/csv-export';
import type { PayoutBatch, PayoutDryRun, PayoutLine } from '../../../lib/types';

type Tab = 'eligible' | 'batches';

// ─── Dry-run preview modal ────────────────────────────────────────────────────

function DryRunModal({
  preview,
  onRun,
  onCancel,
  running,
}: {
  preview: PayoutDryRun;
  onRun: () => void;
  onCancel: () => void;
  running: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!running ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 animate-scale-in max-h-[90vh] flex flex-col">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Batch Preview</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Review this breakdown before running the batch. No payouts have been processed yet.
          </p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Lines</p>
            <p className="text-xl font-bold text-brand-700">{preview.lineCount}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total amount</p>
            <p className="text-xl font-bold text-green-700">{formatINR(preview.totalAmount)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Hosts</p>
            <p className="text-xl font-bold text-brand-700">{preview.hostCount}</p>
          </div>
        </div>

        {/* Per-host breakdown */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 mb-5">
          {preview.breakdown.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No eligible lines</div>
          ) : (
            preview.breakdown.map((row) => (
              <div key={row.hostId} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{row.hostName || row.hostEmail}</p>
                  <p className="text-xs text-gray-400">{row.hostEmail} · {row.lineCount} line{row.lineCount !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold text-brand-700 shrink-0">{formatINR(row.amount)}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={running} className="btn-ghost text-sm py-2 px-4">
            Cancel
          </button>
          <button onClick={onRun} disabled={running || preview.lineCount === 0} className="btn-primary text-sm py-2 px-5">
            {running ? <><span className="spinner" /> Running…</> : `Run batch (${preview.lineCount} lines)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark-paid confirm modal ──────────────────────────────────────────────────

function MarkPaidModal({
  batch,
  onConfirm,
  onCancel,
  loading,
}: {
  batch: PayoutBatch;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Mark Batch as Paid?</h3>
        <p className="text-sm text-gray-600 mb-4">
          This confirms that <strong>{formatINR(batch.totalAmount)}</strong> has been transferred via bank. This action is <strong>irreversible</strong>.
        </p>
        <div className="rounded-xl border border-gray-200 p-3 text-sm mb-5">
          <p className="text-gray-500">Batch ID: <span className="font-mono text-xs">{batch.id.slice(0, 16)}…</span></p>
          <p className="text-gray-500 mt-1">Lines: <strong>{batch.lines?.length ?? 0}</strong></p>
          <p className="text-gray-500 mt-1">Run date: <strong>{formatDate(batch.runDate)}</strong></p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-ghost text-sm py-2 px-4">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-primary text-sm py-2 px-5">
            {loading ? <span className="spinner" /> : 'Confirm — Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('eligible');
  const [eligible, setEligible] = useState<PayoutLine[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Dry-run state
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunPreview, setDryRunPreview] = useState<PayoutDryRun | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);

  // Mark-paid state
  const [markPaidTarget, setMarkPaidTarget] = useState<PayoutBatch | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

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

  // ─── Open dry-run preview ───────────────────────────────────────────────

  const handlePreviewBatch = async () => {
    setDryRunLoading(true);
    setError('');
    try {
      const preview = await payoutsApi.dryRun();
      setDryRunPreview(preview);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load preview');
    } finally {
      setDryRunLoading(false);
    }
  };

  // ─── Actually run the batch (from inside the modal) ─────────────────────

  const handleRunBatch = async () => {
    setRunningBatch(true);
    try {
      const batch = await payoutsApi.runWeekly();
      setDryRunPreview(null);
      showToast(`Batch created: ${batch.id.slice(0, 10)}… · ${formatINR(batch.totalAmount)}`);
      loadEligible();
      loadBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to run batch');
      setDryRunPreview(null);
    } finally {
      setRunningBatch(false);
    }
  };

  // ─── Mark batch as paid ─────────────────────────────────────────────────

  const handleMarkPaidConfirmed = async () => {
    if (!markPaidTarget) return;
    setMarkingPaid(true);
    try {
      await payoutsApi.markBatchPaid(markPaidTarget.id);
      setMarkPaidTarget(null);
      showToast('Batch marked as paid');
      loadBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to mark paid');
      setMarkPaidTarget(null);
    } finally {
      setMarkingPaid(false);
    }
  };

  const eligibleTotal = eligible.reduce((sum, l) => sum + l.amount, 0);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-down">
          {toast}
        </div>
      )}

      {/* Dry-run preview modal */}
      {dryRunPreview && (
        <DryRunModal
          preview={dryRunPreview}
          onRun={handleRunBatch}
          onCancel={() => setDryRunPreview(null)}
          running={runningBatch}
        />
      )}

      {/* Mark-paid confirm modal */}
      {markPaidTarget && (
        <MarkPaidModal
          batch={markPaidTarget}
          onConfirm={handleMarkPaidConfirmed}
          onCancel={() => setMarkPaidTarget(null)}
          loading={markingPaid}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="page-title">Payout Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage host payouts — weekly batch processing and statements
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (eligible.length === 0) return;
              const rows = eligible.map((l) => ({
                ID: l.id,
                HostID: l.hostId,
                BookingID: l.bookingId,
                'Amount (INR)': (l.amount / 100).toFixed(2),
                EligibleAt: l.eligibleAt,
                Status: l.status,
                BatchID: l.batchId ?? '',
              }));
              downloadCSV(rows, 'admin-payouts');
            }}
            disabled={eligible.length === 0}
            className="btn-secondary text-sm py-2.5 px-4 disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={handlePreviewBatch}
            disabled={dryRunLoading || eligible.length === 0}
            className="btn-primary text-sm py-2.5 px-5"
          >
            {dryRunLoading ? (
              <><span className="spinner" /> Loading preview…</>
            ) : (
              `Preview batch (${eligible.length} lines)`
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

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
            {t === 'eligible'
              ? `Eligible Lines (${eligible.length})`
              : `Batches (${batches.length})`}
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
            <div className="p-8 text-center"><span className="spinner text-brand-700" /></div>
          )}

          {!loadingEligible && eligible.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💤</div>
              <p className="text-gray-500 text-sm">No eligible payout lines right now.</p>
              <p className="text-gray-400 text-xs mt-1">Lines become eligible 24h after guest check-in.</p>
            </div>
          )}

          {!loadingEligible && eligible.length > 0 && (
            <div className="divide-y divide-gray-100">
              {eligible.map((line) => {
                const host = (line as any).host as { user?: { fullName?: string; email?: string } } | undefined;
                const listing = (line as any).listing as { title?: string } | undefined;
                return (
                  <div key={line.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={line.status} size="sm" />
                        <span className="text-xs text-gray-400 font-mono">{line.id.slice(0, 10)}…</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {listing?.title ?? `Booking ${line.bookingId.slice(0, 10)}…`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Host: {host?.user?.fullName ?? host?.user?.email ?? line.hostId.slice(0, 10) + '…'} ·
                        Eligible: {formatDate(line.eligibleAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-brand-700 text-base">{formatINR(line.amount)}</p>
                    </div>
                  </div>
                );
              })}
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
            <div className="text-center py-8"><span className="spinner text-brand-700" /></div>
          )}

          {!loadingBatches && batches.length === 0 && (
            <div className="text-center py-16 card">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500 text-sm">No payout batches yet.</p>
              <p className="text-gray-400 text-xs mt-1">Preview and run a batch to create the first one.</p>
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

              {batch.status === 'SCHEDULED' && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => setMarkPaidTarget(batch)}
                    className="btn-primary text-sm py-2 px-5"
                  >
                    Mark as Paid
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
