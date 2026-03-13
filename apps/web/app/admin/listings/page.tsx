'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { adminHostsApi, formatDate, listingsApi } from '../../../lib/api';
import type { Host, Listing } from '../../../lib/types';

type Tab = 'listings' | 'hosts';

interface ReviewAction {
  listingId: string;
  type: 'approve' | 'reject' | 'request_changes';
}

// ─── Listing Approvals ────────────────────────────────────────────────────────

function ListingApprovals() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    listingsApi
      .getPending()
      .then(setListings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async ({ listingId, type }: ReviewAction) => {
    setProcessing(listingId);
    try {
      const note = noteMap[listingId] ?? '';
      if (type === 'approve') {
        await listingsApi.approve(listingId);
        showToast('✅ Listing approved');
      } else if (type === 'reject') {
        await listingsApi.reject(listingId, note);
        showToast('❌ Listing rejected');
      } else {
        if (!note.trim()) {
          alert('Please enter a note explaining what changes are needed.');
          setProcessing(null);
          return;
        }
        await listingsApi.requestChanges(listingId, note);
        showToast('📝 Changes requested');
      }
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
            {listings.length} pending
          </span>
          <button
            onClick={() => {
              setLoading(true);
              listingsApi.getPending().then(setListings).finally(() => setLoading(false));
            }}
            className="btn-ghost text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">All caught up!</h3>
          <p className="text-gray-400 text-sm">No listings pending review right now.</p>
        </div>
      )}

      {!loading && listings.map((listing) => {
        const isProcessing = processing === listing.id;
        return (
          <div key={listing.id} className="card mb-5 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={listing.status} />
                    {listing.needsReapproval && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        Re-approval
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{listing.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    📍 {listing.city}, {listing.state}, {listing.country}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted {formatDate(listing.createdAt)} · ID: {listing.id.slice(0, 12)}…
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                  {listing.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                {listing.rateRules?.[0]?.baseNightlyRate && (
                  <span>💰 ₹{(listing.rateRules![0].baseNightlyRate / 100).toLocaleString('en-IN')}/night</span>
                )}
                {listing.rateRules?.[0]?.maxGuests && (
                  <span>👥 {listing.rateRules[0].maxGuests} guests max</span>
                )}
                <span>🌏 {listing.timezone}</span>
              </div>
            </div>

            <div className="p-5 bg-gray-50">
              <div className="mb-3">
                <label className="label text-xs">Note (required for reject / changes)</label>
                <input
                  type="text"
                  value={noteMap[listing.id] ?? ''}
                  onChange={(e) =>
                    setNoteMap((prev) => ({ ...prev, [listing.id]: e.target.value }))
                  }
                  placeholder="Add a note for the host…"
                  className="input text-sm"
                  disabled={isProcessing}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleAction({ listingId: listing.id, type: 'approve' })}
                  disabled={isProcessing}
                  className="btn-primary text-sm py-2 px-5"
                >
                  {isProcessing ? <span className="spinner" /> : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleAction({ listingId: listing.id, type: 'request_changes' })}
                  disabled={isProcessing}
                  className="btn-secondary text-sm py-2 px-5"
                >
                  📝 Request changes
                </button>
                <button
                  onClick={() => handleAction({ listingId: listing.id, type: 'reject' })}
                  disabled={isProcessing}
                  className="btn-danger text-sm py-2 px-5"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Host Approvals ───────────────────────────────────────────────────────────

function HostApprovals() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    adminHostsApi
      .getPending()
      .then(setHosts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async (hostId: string, action: 'approve' | 'reject') => {
    setProcessing(hostId);
    try {
      if (action === 'approve') {
        await adminHostsApi.approve(hostId);
        showToast('✅ Host approved — they can now create listings');
      } else {
        await adminHostsApi.reject(hostId);
        showToast('❌ Host rejected');
      }
      setHosts((prev) => prev.filter((h) => h.id !== hostId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
          {hosts.length} pending
        </span>
        <button
          onClick={() => {
            setLoading(true);
            adminHostsApi.getPending().then(setHosts).finally(() => setLoading(false));
          }}
          className="btn-ghost text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && hosts.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending hosts</h3>
          <p className="text-gray-400 text-sm">All host applications have been reviewed.</p>
        </div>
      )}

      {!loading && hosts.map((host) => {
        const isProcessing = processing === host.id;
        return (
          <div key={host.id} className="card mb-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {host.user?.fullName ?? 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{host.user?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registered {host.user?.createdAt ? formatDate(host.user.createdAt) : '—'} · Host ID: {host.id.slice(0, 12)}…
                  </p>
                </div>
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Pending verification
                </span>
              </div>
            </div>

            <div className="p-5 bg-gray-50 flex gap-3">
              <button
                onClick={() => handleAction(host.id, 'approve')}
                disabled={isProcessing}
                className="btn-primary text-sm py-2 px-5"
              >
                {isProcessing ? <span className="spinner" /> : '✓ Approve host'}
              </button>
              <button
                onClick={() => handleAction(host.id, 'reject')}
                disabled={isProcessing}
                className="btn-danger text-sm py-2 px-5"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inner page (uses useSearchParams — must be inside Suspense) ──────────────

function AdminListingsInner() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get('tab') === 'hosts' ? 'hosts' : 'listings',
  );

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Approvals</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review host registrations and listing submissions before they go live
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-8">
        {([
          { key: 'listings', label: '📋 Listing Approvals' },
          { key: 'hosts', label: '🏡 Host Approvals' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white shadow text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && <ListingApprovals />}
      {tab === 'hosts' && <HostApprovals />}
    </div>
  );
}

// ─── Page export — wraps inner in Suspense (required for useSearchParams) ─────

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-center"><span className="spinner text-brand-700 w-8 h-8" /></div>}>
      <AdminListingsInner />
    </Suspense>
  );
}
