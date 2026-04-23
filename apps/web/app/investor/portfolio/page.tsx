'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, investorApi } from '../../../lib/api';
import type { InvestorPortfolio } from '../../../lib/types';

export default function InvestorPortfolioPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [portfolio, setPortfolio] = useState<InvestorPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.kind !== 'INVESTOR' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    if (user.kind !== 'INVESTOR' && user.role !== 'ADMIN') return;
    investorApi
      .getPortfolio()
      .then(setPortfolio)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Portfolio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your investments, revenue share and distribution totals.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/investor/portfolio" className="btn-primary text-sm py-2 px-4">Portfolio</Link>
        <Link href="/investor/distributions" className="btn-ghost text-sm">Distributions</Link>
        <Link href="/investor/capital-calls" className="btn-ghost text-sm">Capital Calls</Link>
        <Link href="/investor/documents" className="btn-ghost text-sm">Documents</Link>
      </nav>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      )}

      {!loading && portfolio && (
        <div className="space-y-6">
          {/* Investor header */}
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-500">Investor</p>
                <p className="font-semibold text-gray-900">
                  {portfolio.investor.investorProfile?.legalName ?? portfolio.investor.fullName}
                </p>
                <p className="text-xs text-gray-400">{portfolio.investor.email}</p>
                {portfolio.investor.investorProfile?.panMasked && (
                  <p className="text-xs text-gray-400 mt-1">
                    PAN: {portfolio.investor.investorProfile.panMasked}
                  </p>
                )}
              </div>
              {portfolio.investor.investorProfile && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    portfolio.investor.investorProfile.kycStatus === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : portfolio.investor.investorProfile.kycStatus === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  KYC: {portfolio.investor.investorProfile.kycStatus}
                </span>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Active Listings</p>
              <p className="text-xl font-bold text-brand-700">{portfolio.totals.activeListings}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Gross Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatINR(portfolio.totals.grossRevenueMinor)}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Owner-side Net</p>
              <p className="text-xl font-bold text-blue-600">
                {formatINR(portfolio.totals.ownerSideNetMinor)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">After 10% platform fee</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Your Share</p>
              <p className="text-xl font-bold text-green-600">
                {formatINR(portfolio.totals.investorShareMinor)}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Distributed</p>
              <p className="text-xl font-bold text-amber-600">
                {formatINR(portfolio.totals.totalDistributedMinor)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">PAID status</p>
            </div>
          </div>

          {/* Investments table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Investments</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {portfolio.investments.length} position{portfolio.investments.length === 1 ? '' : 's'}
              </p>
            </div>

            {portfolio.investments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-gray-500 text-sm">No investments recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3">Listing</th>
                      <th className="text-right px-4 py-3">Share %</th>
                      <th className="text-left px-4 py-3">Effective</th>
                      <th className="text-right px-4 py-3">Bookings</th>
                      <th className="text-right px-4 py-3">Gross</th>
                      <th className="text-right px-4 py-3">Owner Net</th>
                      <th className="text-right px-4 py-3">Your Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {portfolio.investments.map((inv) => (
                      <tr key={inv.investmentId}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/listings/${inv.listingId}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {inv.listing.title}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {inv.listing.city}, {inv.listing.state} · {inv.listing.status}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {(inv.sharePct * 100).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDate(inv.effectiveAt)}
                          {inv.endedAt && <span className="block">→ {formatDate(inv.endedAt)}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">{inv.bookingsCounted}</td>
                        <td className="px-4 py-3 text-right">{formatINR(inv.grossRevenueMinor)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">
                          {formatINR(inv.ownerSideNetMinor)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {formatINR(inv.investorShareMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
