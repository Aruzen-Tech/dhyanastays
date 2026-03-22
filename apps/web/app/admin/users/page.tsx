'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatDate } from '../../../lib/api';
import { downloadCSV } from '../../../lib/csv-export';
import type { AdminUser } from '../../../lib/types';

// ─── Inline useDebounce hook ─────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 20;
  const debouncedSearch = useDebounce(search, 350);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast helper ────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const loadUsers = useCallback(
    (p: number) => {
      setLoading(true);
      setError('');
      setSelected(new Set());
      adminApi
        .getUsers(p, LIMIT, roleFilter || undefined, debouncedSearch || undefined)
        .then((res) => {
          setUsers(res.users);
          setTotal(res.total);
          setPage(p);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [roleFilter, debouncedSearch],
  );

  // Initial load + refetch on filter/search change
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadUsers(1);
  }, [user, loadUsers]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user? They will lose access to the platform.')) return;
    setActionLoading(userId);
    try {
      const updated = await adminApi.deactivateUser(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      showToast('User deactivated', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleActivate = async (userId: string) => {
    if (!confirm('Activate this user? They will regain access to the platform.')) return;
    setActionLoading(userId);
    try {
      const updated = await adminApi.activateUser(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      showToast('User activated', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const rows = users.map((u) => ({
      ID: u.id,
      Name: u.fullName,
      Email: u.email,
      Role: u.role,
      Active: u.isActive ? 'Yes' : 'No',
      Joined: u.createdAt,
      Bookings: u._count?.bookings ?? 0,
      HostStatus: u.host?.verificationStatus ?? 'N/A',
    }));
    downloadCSV(rows, 'admin-users');
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selected);
    const deactivatable = users.filter(
      (u) => ids.includes(u.id) && u.role !== 'ADMIN' && u.isActive,
    );
    if (deactivatable.length === 0) {
      alert('No selected users are eligible for deactivation (admins and already-inactive users are excluded).');
      return;
    }
    if (!confirm(`Deactivate ${deactivatable.length} user(s)?`)) return;
    setActionLoading('bulk');
    try {
      const result = await adminApi.bulkDeactivateUsers(deactivatable.map((u) => u.id));
      showToast(`${result.count} user(s) deactivated`, 'success');
      setSelected(new Set());
      loadUsers(page);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Bulk action failed', 'error');
    } finally {
      setActionLoading('');
    }
  };

  // ─── Derived state ──────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / LIMIT);

  if (isLoading || !user) return null;

  // ─── Role badge colors ──────────────────────────────────────────────────

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      GUEST: 'bg-gray-100 text-gray-700',
      HOST: 'bg-blue-100 text-blue-700',
      ADMIN: 'bg-purple-100 text-purple-700',
    };
    return map[role] ?? 'bg-gray-100 text-gray-700';
  };

  const verificationBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-700';
  };

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
          <h1 className="page-title">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            View and manage all platform users
            {!loading && (
              <span className="ml-2 inline-flex items-center bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {total} total
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={users.length === 0}
          className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Filters Row */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-full sm:w-44"
        >
          <option value="">All Roles</option>
          <option value="GUEST">Guest</option>
          <option value="HOST">Host</option>
          <option value="ADMIN">Admin</option>
        </select>

        <button
          onClick={() => loadUsers(page)}
          className="btn-ghost text-sm whitespace-nowrap"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No users found</h3>
          <p className="text-gray-400 text-sm">
            {debouncedSearch || roleFilter
              ? 'Try adjusting your search or filters.'
              : 'Users will appear here once they register.'}
          </p>
        </div>
      )}

      {/* Users table */}
      {!loading && users.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Bookings</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isProcessing = actionLoading === u.id || actionLoading === 'bulk';
                  const bookingCount = u._count?.bookings ?? 0;

                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${selected.has(u.id) ? 'bg-brand-50/50' : ''}`}>
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      {/* User (name + email) */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{u.fullName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                      </td>

                      {/* Role badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${roleBadge(u.role)}`}
                        >
                          {u.role}
                        </span>
                        {u.host && (
                          <span
                            className={`ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${verificationBadge(u.host.verificationStatus)}`}
                          >
                            {u.host.verificationStatus}
                          </span>
                        )}
                      </td>

                      {/* Status (active / inactive) */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              u.isActive ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                          <span className={`text-xs font-medium ${u.isActive ? 'text-green-700' : 'text-red-600'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </span>
                      </td>

                      {/* Joined date */}
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Bookings count */}
                      <td className="px-5 py-4 text-gray-600 text-center">
                        {bookingCount}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {u.role === 'ADMIN' ? (
                          <span className="text-xs text-gray-400 font-medium">Admin</span>
                        ) : u.isActive ? (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            disabled={isProcessing}
                            className="btn-danger text-xs py-1 px-3"
                          >
                            {isProcessing ? <span className="spinner" /> : 'Deactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u.id)}
                            disabled={isProcessing}
                            className="text-xs py-1 px-3 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40"
                          >
                            {isProcessing ? <span className="spinner" /> : 'Activate'}
                          </button>
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
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadUsers(page - 1)}
                  disabled={page <= 1 || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => loadUsers(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={handleBulkDeactivate}
            disabled={actionLoading === 'bulk'}
            className="text-sm font-medium bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {actionLoading === 'bulk' ? 'Processing...' : 'Bulk Deactivate'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
