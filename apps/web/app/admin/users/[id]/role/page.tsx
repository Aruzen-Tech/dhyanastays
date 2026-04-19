'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { adminApi, formatDate } from '../../../../../lib/api';
import type { UserRoleHistory } from '../../../../../lib/types';

const KIND_OPTIONS = ['GUEST', 'OWNER', 'INVESTOR', 'STAFF'] as const;
const LEVEL_OPTIONS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
const SERVICE_OPTIONS = [
  'TRANSPORT',
  'FOOD',
  'WELLNESS',
  'EXPERIENCE',
  'CONCIERGE',
  'HOUSEKEEPING',
] as const;

const KIND_BADGE: Record<string, string> = {
  GUEST: 'bg-gray-100 text-gray-700',
  OWNER: 'bg-emerald-100 text-emerald-700',
  INVESTOR: 'bg-indigo-100 text-indigo-700',
  STAFF: 'bg-amber-100 text-amber-700',
};

export default function AdminUserRolePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [data, setData] = useState<UserRoleHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({
    kind: 'GUEST' as (typeof KIND_OPTIONS)[number],
    level: 'L5' as (typeof LEVEL_OPTIONS)[number],
    serviceType: '' as '' | (typeof SERVICE_OPTIONS)[number],
    clusterId: '',
    propertyId: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .getUserRoleHistory(userId)
      .then((d) => {
        setData(d);
        const currentKind = (d.user.kind ?? 'GUEST') as (typeof KIND_OPTIONS)[number];
        setForm((f) => ({
          ...f,
          kind: KIND_OPTIONS.includes(currentKind) ? currentKind : 'GUEST',
          level: (d.user.staffRole?.level ?? 'L5') as (typeof LEVEL_OPTIONS)[number],
        }));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN' || !userId) return;
    load();
  }, [user, userId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.reason.trim().length < 3) {
      alert('Please provide a reason (at least 3 characters)');
      return;
    }
    if (
      !confirm(
        `Change user's role to ${form.kind}${
          form.kind === 'STAFF' ? ` (${form.level})` : ''
        }? This action is audited.`,
      )
    )
      return;
    setSubmitting(true);
    try {
      await adminApi.changeUserKind(userId, {
        kind: form.kind,
        reason: form.reason.trim(),
        ...(form.kind === 'STAFF'
          ? {
              level: form.level,
              serviceType: form.serviceType || undefined,
              clusterId: form.clusterId.trim() || undefined,
              propertyId: form.propertyId.trim() || undefined,
            }
          : {}),
      });
      showToast('✅ Role changed');
      setForm((f) => ({ ...f, reason: '' }));
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Role change failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <button
        onClick={() => router.push('/admin/users')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back to users
      </button>

      <div className="mb-8">
        <h1 className="page-title">User Role Management</h1>
        {data?.user && (
          <div className="mt-2 text-sm text-gray-600">
            {data.user.fullName} · {data.user.email} · joined{' '}
            {formatDate(data.user.createdAt)}
          </div>
        )}
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="space-y-4">
          <div className="card p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Current role */}
          <div className="card p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Current role
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  KIND_BADGE[data.user.kind ?? 'GUEST']
                }`}
              >
                {data.user.kind ?? 'GUEST'}
              </span>
              {data.user.staffRole &&
                !data.user.staffRole.revokedAt && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    {data.user.staffRole.level}
                  </span>
                )}
              <span className="text-xs text-gray-500">
                Legacy role: {data.user.role}
              </span>
            </div>
          </div>

          {/* Change role form */}
          <form onSubmit={submit} className="card p-5 mb-8 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Change role
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-gray-700">New kind</span>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kind: e.target.value as (typeof KIND_OPTIONS)[number],
                    })
                  }
                  className="input mt-1"
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              {form.kind === 'STAFF' && (
                <label className="block text-sm">
                  <span className="text-gray-700">Admin level</span>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        level: e.target.value as (typeof LEVEL_OPTIONS)[number],
                      })
                    }
                    className="input mt-1"
                  >
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {form.kind === 'STAFF' && form.level === 'L5' && (
                <label className="block text-sm">
                  <span className="text-gray-700">Service type</span>
                  <select
                    value={form.serviceType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        serviceType: e.target
                          .value as (typeof SERVICE_OPTIONS)[number],
                      })
                    }
                    className="input mt-1"
                  >
                    <option value="">—</option>
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {form.kind === 'STAFF' && form.level === 'L3' && (
                <label className="block text-sm">
                  <span className="text-gray-700">Cluster ID</span>
                  <input
                    value={form.clusterId}
                    onChange={(e) =>
                      setForm({ ...form, clusterId: e.target.value })
                    }
                    className="input mt-1 font-mono text-xs"
                  />
                </label>
              )}
              {form.kind === 'STAFF' && form.level === 'L4' && (
                <label className="block text-sm">
                  <span className="text-gray-700">Property ID</span>
                  <input
                    value={form.propertyId}
                    onChange={(e) =>
                      setForm({ ...form, propertyId: e.target.value })
                    }
                    className="input mt-1 font-mono text-xs"
                  />
                </label>
              )}
              <label className="block text-sm md:col-span-2">
                <span className="text-gray-700">
                  Reason <span className="text-red-500">*</span>
                </span>
                <textarea
                  required
                  rows={2}
                  minLength={3}
                  maxLength={500}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="input mt-1"
                  placeholder="Audit trail: why is this role change happening?"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-sm"
              >
                {submitting ? <span className="spinner" /> : 'Apply change'}
              </button>
            </div>
          </form>

          {/* History */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Role change history{' '}
              <span className="text-sm font-normal text-gray-500">
                ({data.history.length})
              </span>
            </h2>
            {data.history.length === 0 ? (
              <p className="text-sm text-gray-500">
                No prior role changes for this user.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.history.map((h) => {
                  const before = h.before as {
                    kind?: string;
                    staffLevel?: string | null;
                  };
                  const after = h.after as {
                    kind?: string;
                    staffLevel?: string | null;
                  };
                  return (
                    <li key={h.id} className="py-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            KIND_BADGE[before.kind ?? 'GUEST']
                          }`}
                        >
                          {before.kind ?? '—'}
                          {before.staffLevel ? ` (${before.staffLevel})` : ''}
                        </span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            KIND_BADGE[after.kind ?? 'GUEST']
                          }`}
                        >
                          {after.kind ?? '—'}
                          {after.staffLevel ? ` (${after.staffLevel})` : ''}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDate(h.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{h.reason}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        by{' '}
                        {h.actor.fullName ??
                          h.actor.email ??
                          h.actor.id.slice(0, 12) + '…'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
