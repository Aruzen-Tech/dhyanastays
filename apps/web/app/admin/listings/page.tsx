'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import ListingReviewCard from '../../../components/admin/ListingReviewCard';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, adminHostsApi, formatDate, listingsApi } from '../../../lib/api';
import type { PendingHost, PendingListing } from '../../../lib/types';

type Tab = 'listings' | 'hosts';

interface ReviewAction {
  listingId: string;
  type: 'approve' | 'reject' | 'request_changes';
}

// ─── Listing Approvals ────────────────────────────────────────────────────────

function ListingApprovals() {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === listings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(listings.map((l) => l.id)));
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Approve ${ids.length} listing(s)?`)) return;
    setProcessing('bulk');
    try {
      const result = await adminApi.bulkApproveListings(ids);
      showToast(`${result.count} listing(s) approved`);
      setSelected(new Set());
      setListings((prev) => prev.filter((l) => !ids.includes(l.id)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Bulk action failed');
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
          {listings.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === listings.length && listings.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-500">Select all</span>
            </label>
          )}
          <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
            {listings.length} pending
          </span>
          <button
            onClick={() => {
              setLoading(true);
              setSelected(new Set());
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

      {!loading && listings.map((listing) => (
        <ListingReviewCard
          key={listing.id}
          listing={listing}
          selected={selected.has(listing.id)}
          onToggleSelect={() => toggleSelect(listing.id)}
          note={noteMap[listing.id] ?? ''}
          onNoteChange={(v) => setNoteMap((prev) => ({ ...prev, [listing.id]: v }))}
          processing={processing === listing.id || processing === 'bulk'}
          onAction={(type) => handleAction({ listingId: listing.id, type })}
        />
      ))}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={handleBulkApprove}
            disabled={processing === 'bulk'}
            className="text-sm font-medium bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {processing === 'bulk' ? 'Processing...' : 'Bulk Approve'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Host Approvals ───────────────────────────────────────────────────────────

function HostApprovals() {
  const [hosts, setHosts] = useState<PendingHost[]>([]);
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

  const handleAction = async (hostId: string, action: 'approve' | 'reject', note?: string) => {
    setProcessing(hostId);
    try {
      if (action === 'approve') {
        await adminHostsApi.approve(hostId);
        showToast('✅ Host approved — they can now create listings');
      } else {
        await adminHostsApi.reject(hostId, note);
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
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">
                    {host.profile?.legalName ?? host.user?.fullName ?? 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {host.user?.email}
                    {host.user?.phone ? ` · ${host.user.phone}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registered {host.user?.createdAt ? formatDate(host.user.createdAt) : '—'} ·{' '}
                    {host.listingCount} listing{host.listingCount === 1 ? '' : 's'} · Host ID:{' '}
                    {host.id.slice(0, 12)}…
                  </p>
                </div>
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
                  Pending verification
                </span>
              </div>

              {/* The application itself — without this there is nothing to review. */}
              {host.profile ? (
                <div className="mt-4 rounded-xl border border-gray-100 p-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {host.profile.businessName && (
                      <div>
                        <dt className="text-xs text-gray-400">Business name</dt>
                        <dd className="text-gray-900">{host.profile.businessName}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-gray-400">Address</dt>
                      <dd className="text-gray-900">
                        {host.profile.addressLine1}
                        {host.profile.addressLine2 ? `, ${host.profile.addressLine2}` : ''},{' '}
                        {host.profile.city}, {host.profile.state} {host.profile.postalCode},{' '}
                        {host.profile.country}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">PAN</dt>
                      <dd className="text-gray-900">••••{host.profile.panLast4}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">GSTIN</dt>
                      <dd className="text-gray-900">{host.profile.gstin ?? 'Not registered'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">Photo ID</dt>
                      <dd className="text-gray-900">
                        {host.profile.idType?.replace('_', ' ').toLowerCase() ?? '—'} ••••
                        {host.profile.idLast4}
                        {host.profile.idDocumentUrl && (
                          <>
                            {' · '}
                            <a
                              href={host.profile.idDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-700 hover:underline"
                            >
                              view document
                            </a>
                          </>
                        )}
                      </dd>
                    </div>
                    {host.profile.website && (
                      <div>
                        <dt className="text-xs text-gray-400">Website</dt>
                        <dd>
                          <a
                            href={host.profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-700 hover:underline break-all"
                          >
                            {host.profile.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {host.profile.about && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-400">About</dt>
                        <dd className="text-gray-600 whitespace-pre-wrap">{host.profile.about}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-gray-400">Applied</dt>
                      <dd className="text-gray-500">
                        {host.profile.submittedAt ? formatDate(host.profile.submittedAt) : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This host hasn’t submitted an application yet — there’s nothing to verify.
                  They can’t submit a listing until they do.
                </div>
              )}
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
                onClick={() => {
                  const reason = window.prompt('Why is this application rejected? (shown to the host)');
                  if (!reason?.trim()) return;
                  handleAction(host.id, 'reject', reason.trim());
                }}
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
