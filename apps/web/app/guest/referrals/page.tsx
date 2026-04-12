'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { formatINR, guestApi } from '../../../lib/api';
import type { ReferralInfo } from '../../../lib/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending sign-up',
  SIGNED_UP: 'Signed up',
  FIRST_BOOKING: 'Booked',
  CREDITED: 'Credited',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SIGNED_UP: 'bg-blue-100 text-blue-700',
  FIRST_BOOKING: 'bg-amber-100 text-amber-700',
  CREDITED: 'bg-green-100 text-green-700',
};

export default function ReferralsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;
    guestApi.getReferral()
      .then(setInfo)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCopy = () => {
    if (!info) return;
    const url = `${window.location.origin}/auth/register?ref=${info.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    setApplyError('');
    setApplyMsg('');
    setApplying(true);
    try {
      await guestApi.applyReferralCode(applyCode.trim().toUpperCase());
      setApplyMsg('Referral code applied! Credits will be added after your first stay.');
      setApplyCode('');
    } catch (e: unknown) {
      setApplyError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setApplying(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Failed to load referral info'}</p>
      </div>
    );
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?ref=${info.referralCode}`;

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="page-title">Referral Program</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite friends to Dhyana Stays and earn wellness credits.
        </p>
      </div>

      {/* Reward summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-brand-700">{formatINR(info.referrerReward)}</p>
          <p className="text-xs text-gray-500 mt-1">You earn per referral</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{formatINR(info.referredReward)}</p>
          <p className="text-xs text-gray-500 mt-1">Friend earns on first stay</p>
        </div>
      </div>

      {/* Credit balance */}
      <div className="card p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Credit Balance</p>
          <p className="text-2xl font-bold text-brand-700">{formatINR(info.creditBalance)}</p>
        </div>
        <Link href="/guest/credits" className="btn-ghost text-sm">
          View ledger →
        </Link>
      </div>

      {/* Share your code */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Your referral code</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
            <p className="text-xl font-mono font-bold text-brand-800 tracking-widest">
              {info.referralCode}
            </p>
          </div>
          <button onClick={handleCopy} className="btn-primary px-4 py-3 text-sm whitespace-nowrap">
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
        <p className="text-xs text-gray-400 break-all">{shareUrl}</p>
        <p className="text-xs text-gray-500 mt-3">
          Credits are added when your friend completes their first stay.
        </p>
      </div>

      {/* Apply a code */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Have a referral code?</h2>
        <div className="flex gap-2">
          <input
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g. ABC12345)"
            maxLength={12}
            className="input flex-1 font-mono uppercase"
          />
          <button
            onClick={handleApply}
            disabled={applying || !applyCode.trim()}
            className="btn-primary px-4 whitespace-nowrap"
          >
            {applying ? <span className="spinner" /> : 'Apply'}
          </button>
        </div>
        {applyMsg && <p className="text-green-600 text-sm mt-2">{applyMsg}</p>}
        {applyError && <p className="text-red-500 text-sm mt-2">{applyError}</p>}
      </div>

      {/* Referral history */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            Your referrals
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {info.creditedReferrals}/{info.totalReferrals} credited
            </span>
          </h2>
          <span className="text-sm text-gray-500">
            Total earned: <span className="font-semibold text-brand-700">{formatINR(info.totalEarned)}</span>
          </span>
        </div>

        {info.referrals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm">No referrals yet. Share your code to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {info.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.guestName}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.status === 'CREDITED' && (
                    <span className="text-sm font-semibold text-brand-700">+{formatINR(r.credit)}</span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
