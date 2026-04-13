'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatDate } from '../../../lib/api';
import { ADMIN_LEVEL_LABELS } from '../../../lib/types';
import type { AdminLevel, StaffMember } from '../../../lib/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const LEVEL_BADGE: Record<AdminLevel, string> = {
  L1: 'bg-purple-100 text-purple-800',
  L2: 'bg-blue-100 text-blue-800',
  L3: 'bg-teal-100 text-teal-800',
  L4: 'bg-sky-100 text-sky-700',
  L5: 'bg-indigo-100 text-indigo-700',
};

// ── Assign Role Modal ────────────────────────────────────────────────────────

interface AssignModalProps {
  member: StaffMember;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignRoleModal({ member, onClose, onSuccess }: AssignModalProps) {
  const [level, setLevel] = useState<AdminLevel>((member.staffRole?.level as AdminLevel) ?? 'L2');
  const [serviceType, setServiceType] = useState(member.staffRole?.serviceType ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const LEVEL_OPTIONS: AdminLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await adminApi.assignStaffRole(member.id, {
        level,
        serviceType: level === 'L5' && serviceType ? serviceType : undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Assign / Update Role</h2>
        <p className="text-sm text-gray-500 mb-5">
          {member.fullName} &bull; {member.email}
        </p>

        <div className="mb-4">
          <label className="label mb-2">Admin level</label>
          <div className="space-y-2">
            {LEVEL_OPTIONS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                  level === lvl
                    ? 'border-brand-700 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                    level === lvl ? 'bg-brand-700 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {lvl}
                </span>
                <span className="font-medium text-gray-800">{ADMIN_LEVEL_LABELS[lvl]}</span>
              </button>
            ))}
          </div>
        </div>

        {level === 'L5' && (
          <div className="mb-5">
            <label className="label">Service type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="input"
            >
              <option value="">None</option>
              {['TRANSPORT','FOOD','WELLNESS','EXPERIENCE','CONCIERGE','HOUSEKEEPING'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="alert-error mb-4 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 btn-secondary py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={loading}
            className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? <span className="spinner" /> : 'Save Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRosterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [assigningMember, setAssigningMember] = useState<StaffMember | null>(null);
  const [revokeLoading, setRevokeLoading] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 20;
  const debouncedSearch = useDebounce(search, 350);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadStaff = useCallback(
    (p: number) => {
      setLoading(true);
      setError('');
      adminApi
        .getStaff(debouncedSearch || undefined, p, LIMIT)
        .then((res) => {
          setStaff(res.staff);
          setTotal(res.total);
          setPage(p);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [debouncedSearch],
  );

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadStaff(1);
  }, [user, loadStaff]);

  const handleRevoke = async (member: StaffMember) => {
    setRowErrors((prev) => { const n = { ...prev }; delete n[member.id]; return n; });
    setRevokeLoading(member.id);
    try {
      await adminApi.revokeStaffRole(member.id);
      showToast(`${member.fullName}'s staff role revoked`, 'success');
      loadStaff(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke';
      setRowErrors((prev) => ({ ...prev, [member.id]: msg }));
    } finally {
      setRevokeLoading('');
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

      {/* Assign modal */}
      {assigningMember && (
        <AssignRoleModal
          member={assigningMember}
          onClose={() => setAssigningMember(null)}
          onSuccess={() => {
            setAssigningMember(null);
            showToast('Role updated', 'success');
            loadStaff(page);
          }}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Staff Roster</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage all administrative staff members
            {!loading && (
              <span className="ml-2 inline-flex items-center bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {total} total
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/staff/applications')}
          className="btn-secondary text-sm py-2 px-4"
        >
          View Applications
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
        <button onClick={() => loadStaff(page)} className="btn-ghost text-sm">
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading */}
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

      {/* Empty */}
      {!loading && staff.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No staff members</h3>
          <p className="text-gray-400 text-sm">
            {debouncedSearch
              ? 'No staff match your search.'
              : 'Staff members will appear here once assigned.'}
          </p>
        </div>
      )}

      {/* Staff table */}
      {!loading && staff.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Staff member</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Admin level</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((member) => {
                  const isRevoking = revokeLoading === member.id;
                  const isSelf = member.id === user.sub;
                  const level = member.staffRole?.level as AdminLevel | undefined;

                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name + email */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {member.fullName}
                          {isSelf && (
                            <span className="ml-2 text-xs text-brand-700 font-medium">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                      </td>

                      {/* Level badge */}
                      <td className="px-5 py-4">
                        {level ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_BADGE[level]}`}>
                            {level} &mdash; {ADMIN_LEVEL_LABELS[level]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No role assigned</span>
                        )}
                        {member.staffRole?.serviceType && (
                          <p className="text-xs text-gray-500 mt-1">{member.staffRole.serviceType}</p>
                        )}
                      </td>

                      {/* Active status */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`text-xs font-medium ${member.isActive ? 'text-green-700' : 'text-red-600'}`}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </span>
                        {member.staffRole?.revokedAt && (
                          <p className="text-xs text-red-500 mt-1">Role revoked</p>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(member.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {isSelf ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAssigningMember(member)}
                              disabled={isRevoking}
                              className="text-xs btn-secondary py-1 px-3 disabled:opacity-40"
                            >
                              Edit Role
                            </button>
                            {level !== 'L1' && (
                              <button
                                onClick={() => void handleRevoke(member)}
                                disabled={isRevoking}
                                className="text-xs btn-danger py-1 px-3"
                              >
                                {isRevoking ? <span className="spinner" /> : 'Revoke'}
                              </button>
                            )}
                            {rowErrors[member.id] && (
                              <p className="text-xs text-red-600 max-w-[120px]">{rowErrors[member.id]}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadStaff(page - 1)}
                  disabled={page <= 1 || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadStaff(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
