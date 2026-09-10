'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate, payoutsApi } from '../../../../lib/api';
import type { PayoutAccountReview, PayoutAccountStatus } from '../../../../lib/types';

const TABS: Array<{ key: PayoutAccountStatus | 'ALL'; label: string }> = [
  { key: 'SUBMITTED', label: 'Awaiting review' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

const STATUS_BADGE: Record<PayoutAccountStatus, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

/**
 * Payout KYC review queue. Approving a host unlocks their payouts and releases
 * any money held while they were unverified; rejecting keeps it held.
 */
export default function AdminPayoutAccountsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<PayoutAccountStatus | 'ALL'>('SUBMITTED');
  const [rows, setRows] = useState<PayoutAccountReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await payoutsApi.listAccounts(tab === 'ALL' ? undefined : tab));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payout accounts');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (row: PayoutAccountReview) => {
    setBusy(row.hostId);
    setError('');
    setNotice('');
    try {
      const res = await payoutsApi.reviewAccount(row.hostId, { status: 'VERIFIED' });
      setNotice(
        `Verified ${row.hostName || row.hostEmail}` +
          (res.linesReleased > 0 ? ` — released ${res.linesReleased} held payout line(s).` : '.'),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify this account');
    } finally {
      setBusy('');
    }
  };

  const reject = async (row: PayoutAccountReview) => {
    const reason = window.prompt('Why is this being rejected? (shown to the host)');
    if (!reason?.trim()) return;
    setBusy(row.hostId);
    setError('');
    setNotice('');
    try {
      await payoutsApi.reviewAccount(row.hostId, {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
      });
      setNotice(`Rejected ${row.hostName || row.hostEmail}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reject this account');
    } finally {
      setBusy('');
    }
  };

  const onboard = async (row: PayoutAccountReview) => {
    setBusy(row.hostId);
    setError('');
    setNotice('');
    try {
      const res = await payoutsApi.onboardToRoute(row.hostId);
      setNotice(`Onboarded to Route — linked account ${res.linkedAccountId}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not onboard this host to Route');
    } finally {
      setBusy('');
    }
  };

  const hold = async (row: PayoutAccountReview) => {
    const reason = window.prompt('Reason for the payout hold (leave blank to lift it):') ?? null;
    if (reason === null) return;
    setBusy(row.hostId);
    try {
      const res = await payoutsApi.setHold(row.hostId, reason.trim() || undefined);
      setNotice(
        res.payoutsBlockedReason
          ? `Hold placed — ${res.linesAffected} line(s) held.`
          : `Hold lifted — ${res.linesAffected} line(s) released.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the hold');
    } finally {
      setBusy('');
    }
  };

  if (isLoading || (loading && rows.length === 0)) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <Link href="/admin/payouts" className="text-sm text-muted hover:text-brand-700">
        ← Payouts
      </Link>
      <h1 className="page-title mt-2">Payout KYC review</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Hosts cannot be paid until their payout account is verified. Approving releases any money
        held while they were unverified.
      </p>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-brand-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {notice && <div className="alert-success mb-4">{notice}</div>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.hostId} className="card p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {r.hostName || r.hostEmail}
                    </span>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{r.hostEmail}</p>

                  <dl className="mt-2 text-sm text-gray-700 space-y-0.5">
                    <div>
                      <span className="text-muted">Legal name:</span> {r.legalName}
                    </div>
                    {r.method === 'BANK_ACCOUNT' ? (
                      <div>
                        <span className="text-muted">Bank:</span>{' '}
                        {r.bankName ? `${r.bankName} · ` : ''}A/C ••••{r.accountLast4} · {r.ifsc}
                      </div>
                    ) : (
                      <div>
                        <span className="text-muted">UPI:</span> {r.upiVpa}
                      </div>
                    )}
                    <div>
                      <span className="text-muted">PAN:</span> ••••{r.panLast4}
                    </div>
                    <div>
                      <span className="text-muted">Route:</span>{' '}
                      {r.linkedAccountId ? (
                        <span className="text-green-700">{r.linkedAccountId}</span>
                      ) : (
                        <span className="text-amber-700">not onboarded</span>
                      )}
                    </div>
                    {r.rejectionReason && (
                      <div className="text-red-600">Rejected: {r.rejectionReason}</div>
                    )}
                    <div className="text-xs text-muted">
                      Updated {formatDate(r.updatedAt)}
                      {r.verifiedAt ? ` · verified ${formatDate(r.verifiedAt)}` : ''}
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {r.status !== 'VERIFIED' && (
                    <button
                      className="btn-primary text-sm py-1.5"
                      disabled={busy === r.hostId}
                      onClick={() => approve(r)}
                    >
                      Verify
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button
                      className="btn-secondary text-sm py-1.5"
                      disabled={busy === r.hostId}
                      onClick={() => reject(r)}
                    >
                      Reject
                    </button>
                  )}
                  {r.status === 'VERIFIED' && !r.linkedAccountId && (
                    <button
                      className="btn-secondary text-sm py-1.5"
                      disabled={busy === r.hostId}
                      onClick={() => onboard(r)}
                    >
                      Onboard to Route
                    </button>
                  )}
                  <button
                    className="btn-ghost text-sm py-1.5"
                    disabled={busy === r.hostId}
                    onClick={() => hold(r)}
                  >
                    Hold…
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
