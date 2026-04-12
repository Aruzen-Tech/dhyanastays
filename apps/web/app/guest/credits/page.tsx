'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { formatINR, guestApi } from '../../../lib/api';
import type { CreditLedger } from '../../../lib/types';

const REASON_LABEL: Record<string, string> = {
  referral_bonus: 'Referral bonus',
  referred_welcome_credit: 'Welcome credit',
  loyalty_reward: 'Loyalty reward',
  credit_used: 'Credits used',
};

export default function CreditsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [ledger, setLedger] = useState<CreditLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;
    guestApi.getCredits()
      .then(setLedger)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !ledger) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Failed to load credits'}</p>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/guest/referrals" className="btn-ghost text-sm mb-4 inline-block">
          ← Back to referrals
        </Link>
        <h1 className="page-title">My Credits</h1>
      </div>

      {/* Balance */}
      <div className="card p-6 mb-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Available Balance</p>
        <p className="text-4xl font-bold text-brand-700">{formatINR(ledger.balance)}</p>
        <p className="text-xs text-gray-500 mt-2">Applied automatically at checkout</p>
      </div>

      {/* Ledger entries */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Transaction history</h2>
        {ledger.entries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-sm">No transactions yet. Earn credits by referring friends!</p>
            <Link href="/guest/referrals" className="btn-primary mt-4 inline-block text-sm">
              View referral program
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ledger.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {REASON_LABEL[entry.reason] ?? entry.reason}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {entry.amount >= 0 ? '+' : ''}{formatINR(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
