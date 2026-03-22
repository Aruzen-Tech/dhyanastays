'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatDate } from '../../../lib/api';
import { downloadCSV } from '../../../lib/csv-export';
import type { AuditEntry } from '../../../lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanizeAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a.includes('APPROVE') || a.includes('ACTIVATE') || a.includes('COMPLETED'))
    return 'bg-green-100 text-green-700';
  if (a.includes('REJECT') || a.includes('CANCEL') || a.includes('DEACTIVATE'))
    return 'bg-red-100 text-red-700';
  if (a.includes('CREATE') || a.includes('REGISTER') || a.includes('UPDATE'))
    return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  'AUTH_REGISTER',
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'LISTING_CHANGES_REQUESTED',
  'HOST_APPROVED',
  'HOST_REJECTED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'USER_DEACTIVATED',
  'USER_ACTIVATED',
  'PAYOUT_BATCH_CREATED',
  'PAYOUT_BATCH_PAID',
];

const RESOURCE_TYPE_OPTIONS = [
  'User',
  'Listing',
  'Host',
  'Booking',
  'Payment',
  'PayoutBatch',
];

const PER_PAGE = 30;

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getAuditLog(
        page,
        PER_PAGE,
        actionFilter || undefined,
        resourceTypeFilter || undefined,
      )
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, actionFilter, resourceTypeFilter]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadEntries();
  }, [user, loadEntries]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, resourceTypeFilter]);

  // ─── Derived values ──────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // ─── Render guard ────────────────────────────────────────────────────────

  if (isLoading || !user) return null;

  // ─── Metadata renderer ──────────────────────────────────────────────────

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

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track all admin actions and system events
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {total} entr{total !== 1 ? 'ies' : 'y'}
            </span>
          )}
          <button
            onClick={() => {
              if (entries.length === 0) return;
              const rows = entries.map((e) => ({
                ID: e.id,
                Action: e.action,
                ResourceType: e.resourceType,
                ResourceID: e.resourceId,
                Actor: e.actor ? `${e.actor.fullName} (${e.actor.email})` : e.actorUserId ?? 'System',
                Metadata: JSON.stringify(e.metadata),
                CreatedAt: e.createdAt,
              }));
              downloadCSV(rows, 'admin-audit-log');
            }}
            disabled={entries.length === 0}
            className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
          >
            Export CSV
          </button>
          <button onClick={loadEntries} className="btn-ghost text-sm">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="input text-sm py-2 pr-8 min-w-[200px]"
        >
          <option value="">All Actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {humanizeAction(a)}
            </option>
          ))}
        </select>

        <select
          value={resourceTypeFilter}
          onChange={(e) => setResourceTypeFilter(e.target.value)}
          className="input text-sm py-2 pr-8 min-w-[160px]"
        >
          <option value="">All Resources</option>
          {RESOURCE_TYPE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
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
            No audit entries found
          </h3>
          <p className="text-gray-400 text-sm">
            {actionFilter || resourceTypeFilter
              ? 'Try adjusting your filters to see more results.'
              : 'No actions have been recorded yet.'}
          </p>
        </div>
      )}

      {/* Audit log list */}
      {!loading && entries.length > 0 && (
        <div className="card divide-y divide-gray-100">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 px-5 py-4"
            >
              {/* Left: Action badge */}
              <div className="shrink-0 pt-0.5">
                <span
                  className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${actionColor(entry.action)}`}
                >
                  {humanizeAction(entry.action)}
                </span>
              </div>

              {/* Center: Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {humanizeAction(entry.action)}
                </p>

                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium">{entry.resourceType}</span>
                  {' '}
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

              {/* Right: Time */}
              <div className="shrink-0 text-right">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(entry.createdAt)}
                </span>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  {formatDate(entry.createdAt)}
                </p>
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
