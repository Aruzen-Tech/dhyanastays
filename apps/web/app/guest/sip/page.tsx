'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { membershipApi, formatINR, formatDate } from '../../../lib/api';
import type { TripSip, TripSipDetail } from '../../../lib/types';

export default function SipPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sips, setSips] = useState<TripSip[]>([]);
  const [activeSip, setActiveSip] = useState<TripSipDetail | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Start-SIP form
  const [showStart, setShowStart] = useState(false);
  const [monthlyRupees, setMonthlyRupees] = useState('1000');
  const [anchorDay, setAnchorDay] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Contribute form
  const [contributeRupees, setContributeRupees] = useState('1000');
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await membershipApi.listSips();
      setSips(list);
      const active = list.find((s) => s.status === 'ACTIVE') ?? list[0];
      if (active) {
        const [detail, bal] = await Promise.all([
          membershipApi.getSip(active.id),
          membershipApi.getSipBalance(active.id),
        ]);
        setActiveSip(detail);
        setBalance(bal.balance);
      } else {
        setActiveSip(null);
        setBalance(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SIPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const startSip = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthly = Math.round(parseFloat(monthlyRupees) * 100);
    const day = parseInt(anchorDay, 10);
    if (!Number.isFinite(monthly) || monthly < 50000) {
      alert('Minimum monthly SIP is ₹500');
      return;
    }
    setSubmitting(true);
    try {
      await membershipApi.startSip({ monthlyMinor: monthly, anchorDay: day });
      showToast('✅ SIP started');
      setShowStart(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start SIP');
    } finally {
      setSubmitting(false);
    }
  };

  const contribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSip) return;
    const amount = Math.round(parseFloat(contributeRupees) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a positive amount');
      return;
    }
    setContributing(true);
    try {
      await membershipApi.contribute(activeSip.id, { amountMinor: amount });
      showToast(`✅ Contributed ${formatINR(amount)} to your SIP`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Contribution failed');
    } finally {
      setContributing(false);
    }
  };

  const setStatus = async (status: 'PAUSED' | 'ACTIVE' | 'CLOSED') => {
    if (!activeSip) return;
    if (status === 'CLOSED' && !confirm('Close this SIP? You will need to start a new one to resume saving.')) return;
    try {
      await membershipApi.setStatus(activeSip.id, status);
      showToast(`SIP ${status.toLowerCase()}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Status change failed');
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
    <div className="container-page py-10 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <Link href="/guest/membership" className="btn-ghost text-sm mb-4 inline-block">
        ← Back to membership
      </Link>
      <h1 className="page-title">Trip Savings SIP</h1>
      <p className="text-gray-500 text-sm mt-1 mb-6">
        Save monthly toward your next retreat. Every contribution adds to your spendable credit balance and earns loyalty points.
      </p>

      {error && <div className="alert-error mb-6">{error}</div>}

      {!activeSip && !showStart && (
        <div className="card p-8 text-center">
          <p className="text-gray-700 mb-4">
            You don&apos;t have an active SIP yet. Start saving for your next stay.
          </p>
          <button onClick={() => setShowStart(true)} className="btn-primary">
            Start a SIP
          </button>
        </div>
      )}

      {showStart && (
        <form onSubmit={startSip} className="card p-6 mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Start a SIP</h2>
          <label className="block text-sm">
            <span className="text-gray-700">Monthly amount (₹)</span>
            <input
              type="number"
              min={500}
              step={100}
              value={monthlyRupees}
              onChange={(e) => setMonthlyRupees(e.target.value)}
              className="input mt-1"
            />
            <span className="text-xs text-gray-500 mt-1 block">Minimum ₹500/month</span>
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Day of month for autodebit</span>
            <input
              type="number"
              min={1}
              max={28}
              value={anchorDay}
              onChange={(e) => setAnchorDay(e.target.value)}
              className="input mt-1"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowStart(false)} className="btn-ghost text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? <span className="spinner" /> : 'Start saving'}
            </button>
          </div>
        </form>
      )}

      {activeSip && (
        <>
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current SIP</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Started {formatDate(activeSip.startedAt)} · Day {activeSip.anchorDay} each month
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  activeSip.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : activeSip.status === 'PAUSED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {activeSip.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatINR(activeSip.monthlyMinor)}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-700 uppercase tracking-wider">Saved</p>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  {balance !== null ? formatINR(balance) : '—'}
                </p>
              </div>
            </div>

            {activeSip.status === 'ACTIVE' && (
              <button onClick={() => setStatus('PAUSED')} className="btn-ghost text-sm w-full">
                Pause SIP
              </button>
            )}
            {activeSip.status === 'PAUSED' && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setStatus('ACTIVE')} className="btn-primary text-sm">
                  Resume
                </button>
                <button onClick={() => setStatus('CLOSED')} className="btn-ghost text-sm text-red-600">
                  Close SIP
                </button>
              </div>
            )}
          </div>

          {activeSip.status === 'ACTIVE' && (
            <form onSubmit={contribute} className="card p-6 mb-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">Make a contribution</h2>
              <p className="text-xs text-gray-500">
                Manual contributions help you save ahead of your monthly autodebit.
              </p>
              <label className="block text-sm">
                <span className="text-gray-700">Amount (₹)</span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={contributeRupees}
                  onChange={(e) => setContributeRupees(e.target.value)}
                  className="input mt-1"
                />
              </label>
              <button type="submit" disabled={contributing} className="btn-primary text-sm">
                {contributing ? <span className="spinner" /> : 'Contribute'}
              </button>
            </form>
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent contributions{' '}
              <span className="text-sm font-normal text-gray-500">
                ({activeSip.contributions.length})
              </span>
            </h2>
            {activeSip.contributions.length === 0 ? (
              <p className="text-sm text-gray-500">No contributions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeSip.contributions.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        {formatINR(c.amountMinor)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(c.depositedAt)}
                        {c.paymentRef && ` · ${c.paymentRef}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      ledger:{c.ledgerEventId.slice(-6)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {sips.length > 1 && (
        <div className="mt-6 text-xs text-gray-500 text-center">
          You have {sips.length} SIPs · viewing the active one
        </div>
      )}
    </div>
  );
}
