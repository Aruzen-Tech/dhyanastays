'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { adminApi, formatDate, formatINR } from '../../lib/api';
import type { AdminStats } from '../../lib/types';

// ─── Relative time helper ────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

function QuickAction({
  href,
  label,
  description,
  count,
}: {
  href: string;
  label: string;
  description: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="card p-4 hover:shadow-card-hover transition-shadow group flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors text-sm">
            {label}
          </h3>
          {count !== undefined && count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
              {count}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-300 group-hover:text-brand-500 transition-colors text-lg shrink-0">
        &rarr;
      </span>
    </Link>
  );
}

// ─── Booking Status Color Bar ────────────────────────────────────────────────

function BookingStatusBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.max((count / total) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-10 text-right text-sm font-semibold text-gray-700">{count}</div>
    </div>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const loadStats = () => {
    setLoading(true);
    setError('');
    adminApi
      .getStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadStats();
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview and analytics</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          {loading ? <span className="spinner w-4 h-4" /> : <span>&#8635;</span>} Refresh
        </button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="card border-red-200 bg-red-50 p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-800">Failed to load dashboard</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={loadStats} className="btn-primary text-sm py-2 px-4 shrink-0">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────────────────── */}
      {loading && !stats && <MetricsSkeleton />}

      {/* ── Dashboard Content (only when stats loaded) ──────────────────────── */}
      {stats && (
        <div className="space-y-8">
          {/* ── 1. Key Metrics Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatINR(stats.revenue.totalCollected)}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Platform fees:{' '}
                <span className="font-medium text-green-700">
                  {formatINR(stats.revenue.platformFees)}
                </span>
              </p>
            </div>

            {/* Active Bookings */}
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Active Bookings
              </p>
              <p className="text-2xl font-bold text-brand-700">{stats.bookings.confirmed}</p>
              <p className="text-xs text-gray-400 mt-2">
                {stats.bookings.total} total bookings
              </p>
            </div>

            {/* Listings */}
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Listings
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.listings.approved}{' '}
                <span className="text-sm font-normal text-gray-400">
                  of {stats.listings.total}
                </span>
              </p>
              {stats.listings.pending > 0 && (
                <p className="text-xs text-amber-600 font-medium mt-2">
                  {stats.listings.pending} pending review
                </p>
              )}
              {stats.listings.pending === 0 && (
                <p className="text-xs text-gray-400 mt-2">No pending reviews</p>
              )}
            </div>

            {/* Users */}
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Users
              </p>
              <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
              <p className="text-xs text-gray-400 mt-2">
                {stats.users.guests} guests &middot; {stats.users.hosts} hosts &middot;{' '}
                {stats.users.admins} admins
              </p>
            </div>
          </div>

          {/* ── 2. Quick Actions ────────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction
                href="/admin/listings"
                label="Pending Listings"
                description="Review and approve listing submissions"
                count={stats.listings.pending}
              />
              <QuickAction
                href="/admin/hosts"
                label="Pending Hosts"
                description="Verify host registrations"
                count={stats.users.pendingHosts}
              />
              <QuickAction
                href="/admin/bookings"
                label="Manage Bookings"
                description="View and manage all platform bookings"
              />
              <QuickAction
                href="/admin/payouts"
                label="Payouts"
                description="Run batches and manage host payouts"
              />
              <QuickAction
                href="/admin/users"
                label="Users"
                description="Manage platform users and roles"
              />
              <QuickAction
                href="/admin/audit"
                label="Audit Log"
                description="Review platform activity history"
              />
            </div>
          </div>

          {/* ── 3. Revenue & Payouts ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Summary */}
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Total Collected</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatINR(stats.revenue.totalCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Platform Fees Earned</span>
                  <span className="text-sm font-semibold text-green-700">
                    {formatINR(stats.revenue.platformFees)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Host Share</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatINR(stats.revenue.totalCollected - stats.revenue.platformFees)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payout Status */}
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Payout Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Eligible for Payout</span>
                  <span className="text-sm font-semibold text-amber-600">
                    {formatINR(stats.payouts.eligibleAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Already Paid Out</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatINR(stats.payouts.paidAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Bookings Breakdown ───────────────────────────────────────── */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Bookings Breakdown</h2>
            <div className="space-y-3">
              <BookingStatusBar
                label="Confirmed"
                count={stats.bookings.confirmed}
                total={stats.bookings.total}
                colorClass="bg-green-500"
              />
              <BookingStatusBar
                label="Completed"
                count={stats.bookings.completed}
                total={stats.bookings.total}
                colorClass="bg-brand-500"
              />
              <BookingStatusBar
                label="Cancelled"
                count={stats.bookings.cancelled}
                total={stats.bookings.total}
                colorClass="bg-red-400"
              />
              <BookingStatusBar
                label="Pending"
                count={stats.bookings.pendingPayment}
                total={stats.bookings.total}
                colorClass="bg-amber-400"
              />
            </div>
          </div>

          {/* ── 5. Recent Bookings Table ─────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/admin/bookings" className="text-sm text-brand-700 hover:text-brand-800 font-medium">
                View all &rarr;
              </Link>
            </div>

            {stats.recentBookings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No bookings yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">Guest</th>
                      <th className="px-6 py-3">Listing</th>
                      <th className="px-6 py-3">Dates</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentBookings.slice(0, 5).map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <Link
                            href={`/bookings/${booking.id}`}
                            className="text-brand-700 hover:text-brand-800 font-medium"
                          >
                            {booking.guest?.fullName ?? booking.guest?.email ?? 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-700 max-w-[200px] truncate">
                          {booking.listing?.title ?? `Listing ${booking.listingId.slice(0, 8)}`}
                        </td>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(booking.startsAt)} &mdash; {formatDate(booking.endsAt)}
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={booking.status} size="sm" />
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                          {formatINR(booking.priceSnapshot.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 6. Recent Activity Feed ──────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/admin/audit" className="text-sm text-brand-700 hover:text-brand-800 font-medium">
                View all &rarr;
              </Link>
            </div>

            {stats.recentAudit.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No activity recorded yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentAudit.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="px-6 py-3 flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">
                          {entry.actor?.fullName ?? entry.actor?.email ?? 'System'}
                        </span>{' '}
                        <span className="text-gray-500">{entry.action}</span>{' '}
                        <span className="text-gray-600">
                          {entry.resourceType}
                        </span>{' '}
                        <span className="text-xs font-mono text-gray-400">
                          {entry.resourceId.slice(0, 8)}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
