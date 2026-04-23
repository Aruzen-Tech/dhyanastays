'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { formatINR, tripGroupsApi } from '../../../lib/api';
import type {
  TripGroupDetail,
  TripGroupBalances,
  ExpenseSplitMethod,
} from '../../../lib/types';

export default function TripGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<TripGroupDetail | null>(null);
  const [balances, setBalances] = useState<TripGroupBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '' });
  const [inviteBusy, setInviteBusy] = useState(false);

  // Expense form
  const [showExpense, setShowExpense] = useState(false);
  const [expForm, setExpForm] = useState<{
    title: string;
    totalRupees: number;
    method: ExpenseSplitMethod;
    selectedMemberIds: string[];
    customShares: Record<string, number>; // memberId -> rupees
    notes: string;
  }>({
    title: '',
    totalRupees: 0,
    method: 'EQUAL',
    selectedMemberIds: [],
    customShares: {},
    notes: '',
  });
  const [expBusy, setExpBusy] = useState(false);

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, b] = await Promise.all([
        tripGroupsApi.getDetail(id),
        tripGroupsApi.getBalances(id),
      ]);
      setGroup(g);
      setBalances(b);
      setExpForm((f) => ({
        ...f,
        selectedMemberIds: g.members.filter((m) => m.status === 'ACCEPTED').map((m) => m.id),
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberName = (memberId: string) => {
    const m = group?.members.find((mm) => mm.id === memberId);
    return m?.fullName ?? 'Member';
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteBusy(true);
    try {
      await tripGroupsApi.invite(id, inviteForm);
      setInviteForm({ email: '', fullName: '' });
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleAccept = async () => {
    try {
      await tripGroupsApi.accept(id);
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Accept failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this group? This cannot be undone.')) return;
    try {
      await tripGroupsApi.remove(id);
      router.push('/trip-groups');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      await tripGroupsApi.removeMember(id, memberId);
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinor = Math.round(expForm.totalRupees * 100);
    if (totalMinor <= 0) {
      alert('Total must be positive');
      return;
    }
    setExpBusy(true);
    try {
      if (expForm.method === 'EQUAL') {
        if (expForm.selectedMemberIds.length === 0) {
          alert('Select at least one member');
          return;
        }
        await tripGroupsApi.createExpense(id, {
          title: expForm.title,
          totalMinor,
          method: 'EQUAL',
          memberIds: expForm.selectedMemberIds,
          notes: expForm.notes || undefined,
        });
      } else {
        const shares = Object.entries(expForm.customShares)
          .filter(([, v]) => v > 0)
          .map(([memberId, v]) => ({ memberId, amountMinor: Math.round(v * 100) }));
        const sum = shares.reduce((s, sh) => s + sh.amountMinor, 0);
        if (sum !== totalMinor) {
          alert(`Custom shares sum (₹${sum / 100}) must equal total (₹${totalMinor / 100})`);
          return;
        }
        await tripGroupsApi.createExpense(id, {
          title: expForm.title,
          totalMinor,
          method: 'CUSTOM',
          shares,
          notes: expForm.notes || undefined,
        });
      }
      setShowExpense(false);
      setExpForm({
        ...expForm,
        title: '',
        totalRupees: 0,
        customShares: {},
        notes: '',
      });
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Expense create failed');
    } finally {
      setExpBusy(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await tripGroupsApi.deleteExpense(id, expenseId);
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggleSettled = async (expenseId: string, shareId: string, current: string | null) => {
    try {
      await tripGroupsApi.markShareSettled(id, expenseId, shareId, !current);
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const pendingInvite = useMemo(
    () =>
      group?.members.find(
        (m) =>
          (m.userId === user?.sub || m.email === user?.email) && m.status === 'PENDING',
      ),
    [group, user],
  );

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Group not found.'}</p>
        <Link href="/trip-groups" className="btn-ghost mt-4 inline-block">
          ← Back
        </Link>
      </div>
    );
  }

  const acceptedMembers = group.members.filter((m) => m.status === 'ACCEPTED');
  const pendingMembers = group.members.filter((m) => m.status === 'PENDING');

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Link href="/trip-groups" className="btn-ghost text-sm mb-4 inline-block">
        ← Back
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {group.destination ? `${group.destination} · ` : ''}
            Owner: {group.owner.fullName}
          </p>
        </div>
        {group.viewerIsOwner && (
          <button onClick={handleDelete} className="text-xs text-red-600 hover:underline">
            Delete group
          </button>
        )}
      </div>

      {pendingInvite && (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            You&apos;ve been invited to this group.
          </p>
          <button onClick={handleAccept} className="btn-primary text-xs">
            Accept invite
          </button>
        </div>
      )}

      {/* Members */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Members ({acceptedMembers.length})</h2>
        <div className="space-y-2">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm border-b border-gray-50 py-2 last:border-0"
            >
              <div>
                <p className="font-medium">
                  {m.fullName}
                  {m.role === 'OWNER' && (
                    <span className="ml-2 text-xs text-brand-700">owner</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-700'
                      : m.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m.status}
                </span>
                {group.viewerIsOwner && m.role !== 'OWNER' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {group.viewerIsOwner && (
          <form onSubmit={handleInvite} className="mt-4 grid grid-cols-5 gap-2 items-end">
            <div className="col-span-2">
              <label className="label">Full name</label>
              <input
                required
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input
                required
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="input text-sm"
              />
            </div>
            <button type="submit" disabled={inviteBusy} className="btn-secondary text-sm">
              {inviteBusy ? <span className="spinner" /> : 'Invite'}
            </button>
          </form>
        )}
        {pendingMembers.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {pendingMembers.length} invite{pendingMembers.length === 1 ? '' : 's'} pending.
          </p>
        )}
      </div>

      {/* Balances */}
      {balances && acceptedMembers.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Balances</h2>
          <div className="space-y-1 text-sm">
            {Object.values(balances).map((b) => {
              const name = memberName(b.memberId);
              const pos = b.netMinor >= 0;
              return (
                <div key={b.memberId} className="flex items-center justify-between">
                  <span>{name}</span>
                  <span className={pos ? 'text-green-700' : 'text-red-700'}>
                    {pos ? '+' : ''}
                    {formatINR(b.netMinor)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Positive = paid more than owed. Negative = owes to the group.
          </p>
        </div>
      )}

      {/* Expenses */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">
            Expenses ({group.expenses.length})
          </h2>
          {acceptedMembers.length > 0 && !showExpense && (
            <button onClick={() => setShowExpense(true)} className="btn-primary text-xs">
              + Add expense
            </button>
          )}
        </div>

        {showExpense && (
          <form onSubmit={handleCreateExpense} className="border border-gray-100 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Title</label>
                <input
                  required
                  value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                  className="input text-sm"
                  placeholder="Dinner at café"
                />
              </div>
              <div>
                <label className="label">Total (₹)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={expForm.totalRupees}
                  onChange={(e) =>
                    setExpForm({ ...expForm, totalRupees: Number(e.target.value) })
                  }
                  className="input text-sm"
                />
              </div>
            </div>
            <div>
              <label className="label">Split method</label>
              <div className="flex gap-2">
                {(['EQUAL', 'CUSTOM'] as ExpenseSplitMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExpForm({ ...expForm, method: m })}
                    className={`px-3 py-1.5 text-xs rounded-full border ${
                      expForm.method === m
                        ? 'bg-brand-700 text-white border-brand-700'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {expForm.method === 'EQUAL' ? (
              <div>
                <label className="label">Split between</label>
                <div className="space-y-1">
                  {acceptedMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={expForm.selectedMemberIds.includes(m.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...expForm.selectedMemberIds, m.id]
                            : expForm.selectedMemberIds.filter((x) => x !== m.id);
                          setExpForm({ ...expForm, selectedMemberIds: next });
                        }}
                      />
                      {m.fullName}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Custom shares (₹)</label>
                <div className="space-y-2">
                  {acceptedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{m.fullName}</span>
                      <input
                        type="number"
                        min={0}
                        value={expForm.customShares[m.id] ?? 0}
                        onChange={(e) =>
                          setExpForm({
                            ...expForm,
                            customShares: {
                              ...expForm.customShares,
                              [m.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="input w-24 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">Notes (optional)</label>
              <input
                value={expForm.notes}
                onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })}
                className="input text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={expBusy} className="btn-primary text-xs">
                {expBusy ? <span className="spinner" /> : 'Save expense'}
              </button>
              <button
                type="button"
                onClick={() => setShowExpense(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {group.expenses.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No expenses yet. Add the first one to start splitting.
          </p>
        ) : (
          <div className="space-y-4">
            {group.expenses.map((exp) => (
              <div key={exp.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{exp.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(exp.incurredAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · paid by {exp.createdBy?.fullName ?? 'member'} · {exp.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-700">{formatINR(exp.totalMinor)}</p>
                    {(group.viewerIsOwner || exp.createdById === user?.sub) && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-xs text-red-600 hover:underline mt-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  {exp.shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs text-gray-600"
                    >
                      <span>{memberName(s.memberId)}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatINR(s.amountMinor)}</span>
                        {group.viewerIsOwner ? (
                          <button
                            onClick={() => handleToggleSettled(exp.id, s.id, s.settledAt)}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.settledAt
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {s.settledAt ? '✓ settled' : 'mark settled'}
                          </button>
                        ) : (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.settledAt
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {s.settledAt ? 'settled' : 'pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {exp.notes && (
                  <p className="text-xs text-gray-400 italic mt-1">{exp.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
