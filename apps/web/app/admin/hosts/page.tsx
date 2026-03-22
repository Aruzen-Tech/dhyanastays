'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminHostsApi, formatDate } from '../../../lib/api';
import type { Host } from '../../../lib/types';

export default function AdminHostsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const loadHosts = () => {
    setLoading(true);
    setError('');
    adminHostsApi
      .getPending()
      .then(setHosts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadHosts();
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = async (hostId: string) => {
    if (!confirm('Approve this host? They will be able to create listings.')) return;
    setActionLoading(hostId);
    try {
      await adminHostsApi.approve(hostId);
      setHosts((prev) => prev.filter((h) => h.id !== hostId));
      showToast('✅ Host approved');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (hostId: string) => {
    if (!confirm('Reject this host application?')) return;
    setActionLoading(hostId);
    try {
      await adminHostsApi.reject(hostId);
      setHosts((prev) => prev.filter((h) => h.id !== hostId));
      showToast('Host rejected');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Host Applications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Loading…' : `${hosts.length} pending application${hosts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={loadHosts} className="btn-ghost text-sm">
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && hosts.length === 0 && (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending applications</h3>
          <p className="text-gray-400 text-sm">All host applications have been reviewed.</p>
        </div>
      )}

      {/* Host list */}
      {!loading && hosts.length > 0 && (
        <div className="space-y-4">
          {hosts.map((host) => {
            const isProcessing = actionLoading === host.id;
            return (
              <div key={host.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        ⏳ Pending
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{host.id.slice(0, 12)}…</span>
                    </div>

                    {host.user ? (
                      <>
                        <p className="font-semibold text-gray-900">{host.user.fullName}</p>
                        <p className="text-sm text-gray-500">{host.user.email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 font-mono">{host.userId}</p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      Applied {formatDate(host.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(host.id)}
                      disabled={isProcessing}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {isProcessing ? <span className="spinner" /> : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(host.id)}
                      disabled={isProcessing}
                      className="btn-danger text-sm py-2 px-4"
                    >
                      {isProcessing ? <span className="spinner" /> : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
