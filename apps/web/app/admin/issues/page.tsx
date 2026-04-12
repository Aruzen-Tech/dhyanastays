'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminIssuesApi, formatDate } from '../../../lib/api';
import type { GuestIssue, IssueStatus } from '../../../lib/types';

const STATUS_FILTERS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminIssuesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<GuestIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<IssueStatus | ''>('');

  // Update modal
  const [editingIssue, setEditingIssue] = useState<GuestIssue | null>(null);
  const [newStatus, setNewStatus] = useState<IssueStatus>('OPEN');
  const [hostNotes, setHostNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    adminIssuesApi
      .getAll(filter || undefined)
      .then(setIssues)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, filter]);

  const handleUpdate = async () => {
    if (!editingIssue) return;
    setUpdateError('');
    setUpdating(true);
    try {
      const updated = await adminIssuesApi.updateStatus(editingIssue.id, {
        status: newStatus,
        ...(hostNotes.trim() && { hostNotes: hostNotes.trim() }),
      });
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setEditingIssue(null);
    } catch (e: unknown) {
      setUpdateError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-4xl mx-auto">
      <h1 className="page-title mb-6">All Guest Issues</h1>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as IssueStatus | '')}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-brand-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {issues.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No issues found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[issue.status]}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{issue.category.toLowerCase()}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500 capitalize">{issue.urgency.toLowerCase()} urgency</span>
                </div>
                <button
                  onClick={() => {
                    setEditingIssue(issue);
                    setNewStatus(issue.status);
                    setHostNotes(issue.hostNotes ?? '');
                    setUpdateError('');
                  }}
                  className="btn-ghost text-xs"
                >
                  Update
                </button>
              </div>

              {issue.listing && (
                <p className="text-xs text-gray-400 mb-1">{issue.listing.title}</p>
              )}
              {issue.guest && (
                <p className="text-xs text-gray-400 mb-2">Guest: {issue.guest.fullName} ({issue.guest.email})</p>
              )}
              {issue.booking && (
                <p className="text-xs text-gray-400 mb-2">
                  Stay: {formatDate(issue.booking.startsAt)} — {formatDate(issue.booking.endsAt)}
                </p>
              )}

              <p className="text-sm text-gray-700 whitespace-pre-line">{issue.description}</p>

              {issue.hostNotes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Notes:</p>
                  <p className="text-sm text-gray-600">{issue.hostNotes}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">Reported {formatDate(issue.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Update modal */}
      {editingIssue && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-4">Update Issue Status</h2>
            <p className="text-sm text-gray-500 mb-4 capitalize">
              {editingIssue.category.toLowerCase()} issue — {editingIssue.urgency.toLowerCase()} urgency
            </p>

            <div className="mb-4">
              <label className="label">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                className="input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="label">Notes (optional)</label>
              <textarea
                value={hostNotes}
                onChange={(e) => setHostNotes(e.target.value)}
                placeholder="Add notes..."
                rows={3}
                className="input resize-none"
              />
            </div>

            {updateError && <div className="alert-error text-sm mb-4">{updateError}</div>}

            <div className="flex gap-3">
              <button onClick={handleUpdate} disabled={updating} className="btn-primary flex-1">
                {updating ? 'Updating...' : 'Update'}
              </button>
              <button onClick={() => setEditingIssue(null)} className="btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
