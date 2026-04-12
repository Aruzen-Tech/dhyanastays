'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { bookingsApi, formatDate } from '../../../../lib/api';
import type { GuestIssue, IssueCategory, IssueUrgency } from '../../../../lib/types';

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CLEANLINESS', label: 'Cleanliness' },
  { value: 'NOISE', label: 'Noise' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OTHER', label: 'Other' },
];

const URGENCY_OPTIONS: { value: IssueUrgency; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function IssuesPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<GuestIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New issue form
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<IssueCategory>('MAINTENANCE');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<IssueUrgency>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .getIssues(id)
      .then(setIssues)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const issue = await bookingsApi.createIssue(id, {
        category,
        description: description.trim(),
        urgency,
      });
      setIssues((prev) => [issue, ...prev]);
      setShowForm(false);
      setDescription('');
      setCategory('MAINTENANCE');
      setUrgency('MEDIUM');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cannot access issues</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link href={`/bookings/${id}`} className="btn-primary">Back to booking</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="page-title">Issues</h1>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              Report Issue
            </button>
          )}
        </div>
      </div>

      {/* New issue form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Report an Issue</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="input"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as IssueUrgency)}
                className="input"
              >
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="input resize-none"
              maxLength={1000}
              required
            />
          </div>

          {submitError && <div className="alert-error text-sm mb-4">{submitError}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Issues list */}
      {issues.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No issues reported for this booking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[issue.status]}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{issue.category.toLowerCase()}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-400 capitalize">{issue.urgency.toLowerCase()} urgency</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(issue.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{issue.description}</p>
              {issue.hostNotes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Host notes:</p>
                  <p className="text-sm text-gray-600">{issue.hostNotes}</p>
                </div>
              )}
              {issue.resolvedAt && (
                <p className="text-xs text-green-600 mt-2">Resolved on {formatDate(issue.resolvedAt)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
