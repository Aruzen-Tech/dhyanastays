'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi, formatDate } from '../../../../lib/api';
import { ADMIN_LEVEL_LABELS } from '../../../../lib/types';
import type { ApplicationStatus, StaffApplication } from '../../../../lib/types';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function statusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'PENDING':  return 'bg-amber-100 text-amber-800';
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-700';
  }
}

export default function StaffApplicationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review modal state
  const [reviewing, setReviewing] = useState<StaffApplication | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 20;

  // Auth guard — L1 only
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadApplications = useCallback(
    (p: number) => {
      setLoading(true);
      setError('');
      adminApi
        .getApplications(statusFilter || undefined, p, LIMIT)
        .then((res) => {
          setApplications(res.applications);
          setTotal(res.total);
          setPage(p);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [statusFilter],
  );

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadApplications(1);
  }, [user, loadApplications]);

  const openReview = (app: StaffApplication) => {
    setReviewing(app);
    setDecision('APPROVED');
    setReviewNotes('');
    setActionError('');
  };

  const closeReview = () => {
    if (actionLoading) return;
    setReviewing(null);
    setActionError('');
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setActionLoading(true);
    setActionError('');
    try {
      await adminApi.reviewApplication(reviewing.id, { decision, reviewNotes: reviewNotes.trim() || undefined });
      showToast(
        decision === 'APPROVED'
          ? `Application approved — ${reviewing.fullName} will be promoted once they log in`
          : 'Application rejected',
        'success',
      );
      setReviewing(null);
      loadApplications(page);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Review Application</h2>
            <p className="text-sm text-gray-500 mb-5">
              {reviewing.fullName} &bull; {reviewing.email}
            </p>

            {/* Application summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Requested level</span>
                <span className="font-medium text-gray-900">
                  {reviewing.requestedLevel} &mdash; {ADMIN_LEVEL_LABELS[reviewing.requestedLevel]}
                </span>
              </div>
              {reviewing.requestedService && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 flex-shrink-0">Service type</span>
                  <span className="font-medium text-gray-900">{reviewing.requestedService}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Applied on</span>
                <span className="text-gray-700">{formatDate(reviewing.createdAt)}</span>
              </div>
              <div className="pt-1 border-t border-gray-200">
                <p className="text-gray-500 mb-1">Justification</p>
                <p className="text-gray-800 leading-relaxed">{reviewing.justification}</p>
              </div>
            </div>

            {/* Decision */}
            <div className="mb-4">
              <p className="label mb-2">Decision</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVED')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    decision === 'APPROVED'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECTED')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    decision === 'REJECTED'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label htmlFor="reviewNotes" className="label">
                Notes to applicant
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                id="reviewNotes"
                rows={3}
                maxLength={500}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  decision === 'APPROVED'
                    ? 'Welcome message or instructions...'
                    : 'Reason for rejection...'
                }
                className="input resize-none text-sm"
              />
            </div>

            {actionError && (
              <div className="alert-error mb-4 text-sm">{actionError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeReview}
                disabled={actionLoading}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitReview()}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 ${
                  decision === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionLoading ? <span className="spinner" /> : `Confirm ${decision === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Staff Applications</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and action incoming staff role requests
            {!loading && (
              <span className="ml-2 inline-flex items-center bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {total} {statusFilter || 'total'}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/staff')}
          className="btn-secondary text-sm py-2 px-4"
        >
          View Staff Roster
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`text-sm px-4 py-1.5 rounded-full border font-medium transition-all ${
              statusFilter === opt.value
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => loadApplications(page)}
          className="ml-auto btn-ghost text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && applications.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No applications</h3>
          <p className="text-gray-400 text-sm">
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} applications found.`
              : 'Applications will appear here when submitted.'}
          </p>
        </div>
      )}

      {/* Applications list */}
      {!loading && applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Left: applicant info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{app.fullName}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{app.email}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {app.requestedLevel} &mdash; {ADMIN_LEVEL_LABELS[app.requestedLevel]}
                    </span>
                    {app.requestedService && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">
                        {app.requestedService}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{app.justification}</p>

                  {app.reviewNotes && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Review notes: {app.reviewNotes}
                    </p>
                  )}
                </div>

                {/* Right: date + action */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-xs text-gray-400">{formatDate(app.createdAt)}</p>
                  {app.status === 'PENDING' && (
                    <button
                      onClick={() => openReview(app)}
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Review
                    </button>
                  )}
                  {app.reviewedAt && (
                    <p className="text-xs text-gray-400">
                      Reviewed {formatDate(app.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => loadApplications(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => loadApplications(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
