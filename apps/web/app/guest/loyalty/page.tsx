'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { guestApi } from '../../../lib/api';
import type { LoyaltyInfo } from '../../../lib/types';

const TIERS = [
  { id: 'SEEKER', label: 'Seeker', icon: '🌱', min: 0, max: 2, color: '#6b7280' },
  { id: 'PRACTITIONER', label: 'Practitioner', icon: '🧘', min: 3, max: 5, color: '#059669' },
  { id: 'SAGE', label: 'Sage', icon: '✨', min: 6, max: null, color: '#7c3aed' },
];

export default function LoyaltyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'GUEST') return;
    guestApi.getLoyalty()
      .then(setLoyalty)
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

  if (error || !loyalty) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Failed to load loyalty info'}</p>
      </div>
    );
  }

  // Progress toward next tier
  const currentTierDef = TIERS.find((t) => t.id === loyalty.tier)!;
  const nextTierDef = TIERS.find((t) => t.id === loyalty.nextTier);
  const progressMin = currentTierDef.min;
  const progressMax = nextTierDef ? nextTierDef.min : currentTierDef.min;
  const progressPct = loyalty.nextTier
    ? Math.min(100, Math.round(((loyalty.completedStays - progressMin) / (progressMax - progressMin)) * 100))
    : 100;

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="page-title">Loyalty Program</h1>
        <p className="text-gray-500 text-sm mt-1">
          The more you retreat, the more you're rewarded.
        </p>
      </div>

      {/* Current tier hero */}
      <div
        className="card p-8 mb-6 text-center"
        style={{ borderTop: `4px solid ${loyalty.color}` }}
      >
        <div className="text-6xl mb-3">{loyalty.icon}</div>
        <h2 className="text-2xl font-bold text-gray-900">{loyalty.label}</h2>
        <p className="text-gray-500 text-sm mt-1">{loyalty.description}</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 text-sm text-gray-700">
          <span className="font-semibold">{loyalty.completedStays}</span>
          <span>completed {loyalty.completedStays === 1 ? 'stay' : 'stays'}</span>
        </div>
      </div>

      {/* Progress to next tier */}
      {loyalty.nextTier && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium text-gray-700">Progress to {loyalty.nextTier.charAt(0) + loyalty.nextTier.slice(1).toLowerCase()}</span>
            <span className="text-gray-400">
              {loyalty.staysToNext} more {loyalty.staysToNext === 1 ? 'stay' : 'stays'}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: loyalty.color }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {loyalty.completedStays} of {progressMax} stays completed
          </p>
        </div>
      )}

      {loyalty.tier === 'SAGE' && (
        <div className="card p-5 mb-6 text-center bg-purple-50 border border-purple-200">
          <p className="text-purple-700 font-semibold text-sm">
            ✨ You've reached the highest tier — Sage. Thank you for your dedication to your wellness journey.
          </p>
        </div>
      )}

      {/* Current benefits */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Your benefits</h2>
        <ul className="space-y-2">
          {loyalty.benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* All tiers overview */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">All tiers</h2>
        <div className="space-y-4">
          {TIERS.map((tier) => {
            const isActive = tier.id === loyalty.tier;
            return (
              <div
                key={tier.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                  isActive ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <span className="text-2xl">{tier.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{tier.label}</p>
                    {isActive && (
                      <span className="text-xs bg-brand-700 text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tier.max === null ? `${tier.min}+ stays` : `${tier.min}–${tier.max} stays`}
                  </p>
                </div>
                {tier.id !== 'SEEKER' && (
                  <span className="text-xs font-semibold text-green-700 whitespace-nowrap">
                    {tier.id === 'PRACTITIONER' ? '10% off fee' : '15% off fee'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
