'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { membershipApi } from '../../../lib/api';
import type { Membership, MemberPerks, MemberTier } from '../../../lib/types';

const TIER_META: Record<MemberTier, { label: string; icon: string; color: string; min: number }> = {
  EXPLORER:   { label: 'Explorer',   icon: '🌱', color: '#6b7280', min: 0 },
  WANDERER:   { label: 'Wanderer',   icon: '🍃', color: '#059669', min: 500 },
  SOJOURNER:  { label: 'Sojourner',  icon: '🧘', color: '#0891b2', min: 1500 },
  PATRON:     { label: 'Patron',     icon: '✨', color: '#7c3aed', min: 3500 },
  AMBASSADOR: { label: 'Ambassador', icon: '👑', color: '#b45309', min: 7500 },
};

const TIER_ORDER: MemberTier[] = ['EXPLORER', 'WANDERER', 'SOJOURNER', 'PATRON', 'AMBASSADOR'];

export default function MembershipPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [perks, setPerks] = useState<MemberPerks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([membershipApi.getMembership(), membershipApi.getPerks()])
      .then(([m, p]) => {
        setMembership(m);
        setPerks(p);
      })
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

  if (error || !membership || !perks) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Failed to load membership'}</p>
      </div>
    );
  }

  const currentMeta = TIER_META[membership.tier];
  const currentIdx = TIER_ORDER.indexOf(membership.tier);
  const nextTier = TIER_ORDER[currentIdx + 1];
  const nextMeta = nextTier ? TIER_META[nextTier] : null;
  const progressMin = currentMeta.min;
  const progressMax = nextMeta ? nextMeta.min : currentMeta.min;
  const progressPct = nextMeta
    ? Math.min(100, Math.round(((membership.points - progressMin) / Math.max(1, progressMax - progressMin)) * 100))
    : 100;

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="page-title">Membership</h1>
        <p className="text-gray-500 text-sm mt-1">
          Earn 1 point for every ₹100 of stay spend. Tier up for richer perks and platform-fee discounts.
        </p>
      </div>

      <div
        className="card p-8 mb-6 text-center"
        style={{ borderTop: `4px solid ${currentMeta.color}` }}
      >
        <div className="text-6xl mb-3">{currentMeta.icon}</div>
        <h2 className="text-2xl font-bold text-gray-900">{currentMeta.label}</h2>
        <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 text-sm text-gray-700">
          <span className="font-semibold">{membership.points.toLocaleString('en-IN')}</span>
          <span>points</span>
        </div>
        {membership.discountRate > 0 && (
          <p className="mt-3 text-sm text-emerald-700 font-medium">
            {(membership.discountRate * 100).toFixed(0)}% off platform fee on every booking
          </p>
        )}
      </div>

      {nextMeta && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium text-gray-700">Progress to {nextMeta.label}</span>
            <span className="text-gray-400">
              {membership.pointsToNextTier} more {membership.pointsToNextTier === 1 ? 'point' : 'points'}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: currentMeta.color }}
            />
          </div>
        </div>
      )}

      {!nextMeta && (
        <div className="card p-5 mb-6 text-center bg-amber-50 border border-amber-200">
          <p className="text-amber-800 font-semibold text-sm">
            👑 You&apos;ve reached our highest tier. Thank you for travelling with us.
          </p>
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Your perks</h2>
        {perks.perks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No perks unlocked yet — your first will arrive at the {nextMeta?.label} tier.
          </p>
        ) : (
          <ul className="space-y-3">
            {perks.perks.map((perk) => (
              <li key={perk.id} className="border-l-4 border-emerald-400 pl-3">
                <p className="font-medium text-gray-900 text-sm">{perk.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{perk.description}</p>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 inline-block">
                  {TIER_META[perk.tier].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">All tiers</h2>
        <div className="space-y-4">
          {TIER_ORDER.map((tier) => {
            const meta = TIER_META[tier];
            const isActive = tier === membership.tier;
            return (
              <div
                key={tier}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                  isActive ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <span className="text-2xl">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{meta.label}</p>
                    {isActive && (
                      <span className="text-xs bg-brand-700 text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {meta.min.toLocaleString('en-IN')}+ points
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/guest/sip" className="btn-primary text-sm inline-block">
          Set up a Trip Savings SIP →
        </Link>
      </div>
    </div>
  );
}
