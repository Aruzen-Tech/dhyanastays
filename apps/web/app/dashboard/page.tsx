'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  bookingsApi,
  formatDate,
  formatINR,
  guestApi,
  hostApi,
  hostAnalyticsApi,
  listingsApi,
  payoutsApi,
} from '../../lib/api';
import type { Booking, GuestDashboardStats, Host, HostStatement, HostStats, Listing, LoyaltyInfo } from '../../lib/types';

// ─── Guest Dashboard ──────────────────────────────────────────────────────────

function GuestDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<GuestDashboardStats | null>(null);
  const [hasPreferences, setHasPreferences] = useState(true);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      bookingsApi.getMyBookings(),
      guestApi.getStats().catch(() => null),
      guestApi.getPreferences().catch(() => null),
      guestApi.getLoyalty().catch(() => null),
    ])
      .then(([bk, st, pref, loy]) => {
        setBookings(bk);
        setStats(st);
        setHasPreferences(!!pref);
        setLoyalty(loy);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const updated = await bookingsApi.cancel(id, 'Guest requested cancellation');
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Bookings</p>
            <p className="text-xl font-bold text-brand-700">{stats.totalBookings}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Upcoming Stays</p>
            <p className="text-xl font-bold text-blue-600">{stats.upcomingStays}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Completed</p>
            <p className="text-xl font-bold text-green-600">{stats.completedStays}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Spent</p>
            <p className="text-xl font-bold text-amber-600">{formatINR(stats.totalSpent)}</p>
          </div>
        </div>
      )}

      {/* Loyalty tier badge */}
      {loyalty && (
        <Link href="/guest/loyalty" className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow"
          style={{ borderLeft: `4px solid ${loyalty.color}` }}>
          <span className="text-3xl">{loyalty.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{loyalty.label} Member</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loyalty.nextTier
                ? `${loyalty.staysToNext} more ${loyalty.staysToNext === 1 ? 'stay' : 'stays'} to ${loyalty.nextTier.charAt(0) + loyalty.nextTier.slice(1).toLowerCase()}`
                : 'Highest tier — Sage'}
            </p>
          </div>
          {loyalty.platformFeeDiscount > 0 && (
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
              {Math.round(loyalty.platformFeeDiscount * 100)}% off fee
            </span>
          )}
          <span className="text-gray-400 text-sm">→</span>
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
          <div className="text-2xl mb-1">&#127758;</div>
          <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Explore</p>
        </Link>
        <Link href="/guest/wishlist" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
          <div className="text-2xl mb-1">&#10084;&#65039;</div>
          <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Wishlist</p>
        </Link>
        <Link href="/guest/reviews" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
          <div className="text-2xl mb-1">&#11088;</div>
          <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">My Reviews</p>
        </Link>
        <Link href="/guest/profile" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
          <div className="text-2xl mb-1">&#128100;</div>
          <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Profile</p>
        </Link>
      </div>

      {/* Referral banner */}
      <Link href="/guest/referrals" className="card p-4 flex items-center gap-4 bg-amber-50 border border-amber-200 hover:shadow-card-hover transition-shadow">
        <span className="text-2xl">🎁</span>
        <div className="flex-1">
          <p className="font-semibold text-amber-800 text-sm">Earn ₹500 per referral</p>
          <p className="text-xs text-amber-700/70">Invite friends — they get ₹250 off their first stay too</p>
        </div>
        <span className="text-amber-400">→</span>
      </Link>

      {/* Preferences prompt */}
      {!hasPreferences && (
        <Link
          href="/guest/preferences"
          className="card p-4 flex items-center gap-4 bg-brand-50 border-brand-200 hover:shadow-card-hover transition-shadow"
        >
          <span className="text-2xl">🧘</span>
          <div className="flex-1">
            <p className="font-semibold text-brand-700 text-sm">Set Your Wellness Preferences</p>
            <p className="text-xs text-brand-600/70">Help hosts personalise your retreat experience</p>
          </div>
          <span className="text-brand-400">→</span>
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
        <Link href="/" className="btn-primary text-sm">
          + Book a stay
        </Link>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">🧘</div>
          <h3 className="font-semibold text-gray-700 mb-2">No bookings yet</h3>
          <p className="text-gray-400 text-sm mb-6">Discover curated stays and book your retreat.</p>
          <Link href="/" className="btn-primary">Explore stays</Link>
        </div>
      )}

      {!loading && bookings.map((b) => (
        <div key={b.id} className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={b.status} />
                <span className="text-xs text-gray-400 font-mono">{b.id.slice(0, 10)}…</span>
              </div>
              <p className="font-semibold text-gray-900 truncate">
                {b.listing?.title ?? `Listing ${b.listingId.slice(0, 8)}`}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(b.startsAt)} → {formatDate(b.endsAt)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-600">
                  Plan: <strong>{b.plan}</strong>
                </span>
                <span className="text-brand-700 font-semibold">
                  {formatINR(b.priceSnapshot.total)}
                </span>
              </div>
              {b.status === 'BALANCE_DUE' && b.balanceDueAt && (
                <div className="alert-error mt-3 text-xs">
                  ⚠️ Balance of {formatINR(b.priceSnapshot.balanceAmount)} due by {formatDate(b.balanceDueAt)}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'].includes(b.status) && (
                <button
                  onClick={() => handleCancel(b.id)}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Host Dashboard ───────────────────────────────────────────────────────────

function HostDashboard() {
  const [hostProfile, setHostProfile] = useState<Host | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [statement, setStatement] = useState<HostStatement | null>(null);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<HostStats | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'listings' | 'bookings' | 'payouts'>('listings');

  useEffect(() => {
    Promise.all([
      hostApi.getProfile(),
      listingsApi.getHostListings(),
      payoutsApi.getHostStatements().catch(() => null),
      hostAnalyticsApi.getStats().catch(() => null),
    ])
      .then(([profile, ls, st, hostStats]) => {
        setHostProfile(profile);
        setListings(ls);
        setStatement(st);
        setStats(hostStats);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'bookings' || hostBookings.length > 0) return;
    setBookingsLoading(true);
    bookingsApi
      .getHostBookings()
      .then(setHostBookings)
      .catch(() => setHostBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [tab]);

  const verificationStatus = hostProfile?.verificationStatus ?? 'PENDING';

  return (
    <div className="space-y-6">
      {/* Host verification status banner */}
      {!loading && verificationStatus === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-amber-800">Host profile under review</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your host account is pending verification by the Dhyana Stays team.
              Once approved, you can create and publish listings. This typically takes 24–48 hours.
            </p>
          </div>
        </div>
      )}

      {!loading && verificationStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <p className="font-semibold text-red-800">Host profile not approved</p>
            <p className="text-sm text-red-700 mt-0.5">
              Your host application was not approved. Please contact{' '}
              <a href="mailto:support@dhyanastays.com" className="underline">support@dhyanastays.com</a>{' '}
              for more information.
            </p>
          </div>
        </div>
      )}

      {!loading && verificationStatus === 'APPROVED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <p className="text-sm text-green-700 font-medium">Host profile verified</p>
        </div>
      )}

      {/* Quick Stats */}
      {!loading && stats && verificationStatus === 'APPROVED' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-brand-700">{formatINR(stats.totalRevenue)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Earned (Paid Out)</p>
              <p className="text-xl font-bold text-green-600">{formatINR(stats.totalEarned)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Occupancy (30d)</p>
              <p className="text-xl font-bold text-amber-600">{stats.occupancyRate}%</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Upcoming Check-ins</p>
              <p className="text-xl font-bold text-blue-600">{stats.upcomingCheckins}</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/host/analytics" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
              <div className="text-2xl mb-1">📊</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Analytics</p>
            </Link>
            <Link href="/host/calendar" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
              <div className="text-2xl mb-1">📅</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Calendar</p>
            </Link>
            <Link href="/host/performance" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
              <div className="text-2xl mb-1">📈</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Performance</p>
            </Link>
            <Link href="/host/forecast" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
              <div className="text-2xl mb-1">🔮</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Forecast</p>
            </Link>
            <Link href="/host/messages" className="card p-4 hover:shadow-card-hover transition-shadow group text-center">
              <div className="text-2xl mb-1">💬</div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Messages</p>
            </Link>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          { key: 'listings', label: '🏡 My Listings' },
          { key: 'bookings', label: '📋 Bookings' },
          { key: 'payouts', label: '💰 Payouts' },
        ] as { key: typeof tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Listings</h2>
            {verificationStatus === 'APPROVED' && (
              <Link href="/host/listings/new" className="btn-primary text-sm">
                + New listing
              </Link>
            )}
          </div>

          {loading && <div className="spinner text-brand-700" />}

          {!loading && verificationStatus !== 'APPROVED' && listings.length === 0 && (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-gray-500 text-sm">
                You can create listings once your host profile is approved.
              </p>
            </div>
          )}

          {!loading && verificationStatus === 'APPROVED' && listings.length === 0 && (
            <div className="text-center py-16 card">
              <div className="text-5xl mb-4">🏡</div>
              <h3 className="font-semibold text-gray-700 mb-2">No listings yet</h3>
              <Link href="/host/listings/new" className="btn-primary mt-4">Create your first listing</Link>
            </div>
          )}

          {listings.map((l) => (
            <div key={l.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={l.status} size="sm" />
                  {l.needsReapproval && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Re-approval needed
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                <p className="text-sm text-gray-500">
                  {l.city}, {l.state} · {l.rateRules?.[0]?.baseNightlyRate ? formatINR(l.rateRules[0].baseNightlyRate) + '/night' : 'No rate set'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/host/listings/${l.id}/edit`} className="btn-ghost text-xs py-1.5 px-3">
                  Edit
                </Link>
                <Link href={`/listings/${l.id}`} className="btn-secondary text-xs py-1.5 px-3">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Booking History</h2>
            <span className="text-sm text-gray-500">
              {bookingsLoading ? 'Loading…' : `${hostBookings.length} booking${hostBookings.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {bookingsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!bookingsLoading && hostBookings.length === 0 && (
            <div className="text-center py-16 card">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="font-semibold text-gray-700 mb-2">No bookings yet</h3>
              <p className="text-gray-400 text-sm">Bookings for your listings will appear here.</p>
            </div>
          )}

          {!bookingsLoading && hostBookings.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={b.status} size="sm" />
                    <span className="text-xs text-gray-400 font-mono">{b.id.slice(0, 10)}…</span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">
                    {b.listing?.title ?? `Listing ${b.listingId.slice(0, 8)}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {b.listing && `📍 ${b.listing.city}, ${b.listing.state} · `}
                    {formatDate(b.startsAt)} → {formatDate(b.endsAt)}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      Plan: <strong>{b.plan === 'FULL' ? 'Full payment' : '50% deposit'}</strong>
                    </span>
                    <span className="text-brand-700 font-semibold">
                      {formatINR(b.priceSnapshot.total)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {b.priceSnapshot.nights} night{b.priceSnapshot.nights !== 1 ? 's' : ''} · {b.priceSnapshot.guests} guest{b.priceSnapshot.guests !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {b.status === 'BALANCE_DUE' && b.balanceDueAt && (
                    <div className="alert-error mt-3 text-xs">
                      ⚠️ Balance of {formatINR(b.priceSnapshot.balanceAmount)} due by {formatDate(b.balanceDueAt)}
                    </div>
                  )}
                </div>
                <Link
                  href={`/bookings/${b.id}`}
                  className="btn-ghost text-xs py-1.5 px-3 shrink-0"
                >
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Payout Statements</h2>

          {loading && <div className="spinner text-brand-700" />}

          {!loading && statement && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-5 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-brand-700">{formatINR(statement.totalEarned)}</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-xs text-gray-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{formatINR(statement.totalPending)}</p>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">Payout Lines</p>
                </div>
                {statement.lines.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No payout lines yet</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {statement.lines.map((line) => (
                      <div key={line.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Booking {line.bookingId.slice(0, 8)}…
                          </p>
                          <p className="text-xs text-gray-400">
                            Eligible: {formatDate(line.eligibleAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={line.status} size="sm" />
                          <span className="font-semibold text-brand-700">{formatINR(line.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !statement && (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-gray-500 text-sm">No payout data available yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Admin Overview</h2>
        <Link href="/admin" className="btn-primary text-sm py-2 px-4">
          Full Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/listings" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            Listing Approvals
          </h3>
          <p className="text-sm text-gray-500 mt-1">Review and approve pending host listings</p>
        </Link>
        <Link href="/admin/listings?tab=hosts" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">🏡</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            Host Approvals
          </h3>
          <p className="text-sm text-gray-500 mt-1">Verify and approve host registrations</p>
        </Link>
        <Link href="/admin/payouts" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">💸</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            Payout Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">Run weekly batches and manage host payouts</p>
        </Link>
        <Link href="/admin/users" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            User Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">View and manage all platform users</p>
        </Link>
        <Link href="/admin/bookings" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">📅</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            All Bookings
          </h3>
          <p className="text-sm text-gray-500 mt-1">View and manage all platform bookings</p>
        </Link>
        <Link href="/admin/audit" className="card p-6 hover:shadow-card-hover transition-shadow group">
          <div className="text-3xl mb-3">📜</div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            Audit Log
          </h3>
          <p className="text-sm text-gray-500 mt-1">Track all admin actions and system events</p>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  const roleLabel = { GUEST: '🧘 Guest', HOST: '🏡 Host', ADMIN: '⚙️ Admin' }[user.role];

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{roleLabel.split(' ')[0]}</span>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Signed in as <strong>{user.email}</strong> · {roleLabel}
        </p>
      </div>

      {user.role === 'GUEST' && <GuestDashboard />}
      {user.role === 'HOST' && <HostDashboard />}
      {user.role === 'ADMIN' && <AdminDashboard />}
    </div>
  );
}
