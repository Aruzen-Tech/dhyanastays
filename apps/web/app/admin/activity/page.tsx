'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/api';
import type { AuditEntry } from '../../../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanizeAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a.includes('APPROVE') || a.includes('ACTIVATE') || a.includes('COMPLETE'))
    return 'bg-green-100 text-green-700';
  if (a.includes('REJECT') || a.includes('CANCEL') || a.includes('DEACTIVATE'))
    return 'bg-red-100 text-red-700';
  if (a.includes('CREATE') || a.includes('REGISTER') || a.includes('UPDATE'))
    return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateHeading(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 30;

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminActivityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Build admin options from unique actors in fetched entries
  const [adminOptions, setAdminOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);

  // ─── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast auto-dismiss ────────────────────────────────────────────────────

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getAdminActivity(page, PER_PAGE, adminId || undefined)
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);

        // Build admin options from unique actors on first fetch
        if (adminOptions.length === 0 && res.entries.length > 0) {
          const seen = new Map<string, string>();
          for (const entry of res.entries) {
            if (entry.actorUserId && entry.actor && !seen.has(entry.actorUserId)) {
              seen.set(
                entry.actorUserId,
                `${entry.actor.fullName} (${entry.actor.email})`,
              );
            }
          }
          setAdminOptions(
            Array.from(seen.entries()).map(([id, label]) => ({ id, label })),
          );
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, adminId, adminOptions.length]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadEntries();
  }, [user, loadEntries]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [adminId]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Group entries by date
  const groupedEntries: Array<{ date: string; heading: string; items: AuditEntry[] }> = [];
  for (const entry of entries) {
    const dk = dateKey(entry.createdAt);
    const last = groupedEntries[groupedEntries.length - 1];
    if (last && last.date === dk) {
      last.items.push(entry);
    } else {
      groupedEntries.push({
        date: dk,
        heading: formatDateHeading(entry.createdAt),
        items: [entry],
      });
    }
  }

  // ─── Metadata renderer ─────────────────────────────────────────────────────

  const renderMetadata = (metadata: Record<string, unknown>) => {
    const keys = Object.keys(metadata);
    if (keys.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
        {keys.map((key) => {
          const value = metadata[key];
          const display =
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value);
          return (
            <span key={key} className="text-xs text-gray-400 font-mono">
              {key}: {display}
            </span>
          );
        })}
      </div>
    );
  };

  // ─── Render guard ──────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Activity Log</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track actions performed by admin users
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {total} entr{total !== 1 ? 'ies' : 'y'}
            </span>
          )}
          <button onClick={loadEntries} className="btn-ghost text-sm">
            {loading ? <span className="spinner w-4 h-4" /> : <span>&#8635;</span>} Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
          className="input text-sm py-2 pr-8 min-w-[220px]"
        >
          <option value="">All Admins</option>
          {adminOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-4 border-b border-gray-100 animate-pulse flex gap-4">
              <div className="h-6 w-28 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-3 w-20 bg-gray-200 rounded shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No activity found
          </h3>
          <p className="text-gray-400 text-sm">
            {adminId
              ? 'No activity recorded for this admin. Try selecting a different admin.'
              : 'No admin activity has been recorded yet.'}
          </p>
        </div>
      )}

      {/* Activity entries grouped by date */}
      {!loading && groupedEntries.length > 0 && (
        <div className="space-y-6">
          {groupedEntries.map((group) => (
            <div key={group.date}>
              {/* Date heading */}
              <h2 className="text-sm font-semibold text-gray-900 mb-3 px-1">
                {group.heading}
              </h2>

              <div className="card divide-y divide-gray-100">
                {group.items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 px-5 py-4"
                  >
                    {/* Action badge */}
                    <div className="shrink-0 pt-0.5">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${actionColor(entry.action)}`}
                      >
                        {humanizeAction(entry.action)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {humanizeAction(entry.action)}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium">{entry.resourceType}</span>{' '}
                        <span className="font-mono text-gray-400">
                          {entry.resourceId.slice(0, 10)}
                        </span>
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {entry.actor
                          ? `${entry.actor.fullName} (${entry.actor.email})`
                          : entry.actorUserId
                            ? `User ${entry.actorUserId.slice(0, 10)}`
                            : 'System'}
                      </p>

                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 &&
                        renderMetadata(entry.metadata)}
                    </div>

                    {/* Time */}
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PER_PAGE && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
