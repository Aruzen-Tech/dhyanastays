'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/api';
import type { RateLimitStats } from '../../../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminRateLimitsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast auto-dismiss ────────────────────────────────────────────────────

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const loadStats = () => {
    setLoading(true);
    setError('');
    adminApi
      .getRateLimitStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadStats();
  }, [user]);

  // ─── Render guard ──────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Rate Limiter Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor blocked requests and rate-limited IPs
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          {loading ? <span className="spinner w-4 h-4" /> : <span>&#8635;</span>} Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50 p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-800">Failed to load stats</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={loadStats} className="btn-primary text-sm py-2 px-4 shrink-0">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {stats && (
        <div className="space-y-8">
          {/* Info alert when no blocked requests */}
          {stats.totalBlocked === 0 && (
            <div className="card border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-lg shrink-0">&#9432;</span>
                <p className="text-sm text-blue-700">
                  No blocked requests recorded. This resets when the server restarts.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Blocked Requests
              </p>
              <p className="text-2xl font-bold text-red-600">
                {stats.totalBlocked.toLocaleString()}
              </p>
            </div>

            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Unique IPs
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.topBlockedIPs.length}
              </p>
            </div>
          </div>

          {/* Top Blocked IPs */}
          {stats.topBlockedIPs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Top Blocked IPs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">IP Address</th>
                      <th className="px-6 py-3 text-right">Block Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.topBlockedIPs.map((entry) => (
                      <tr key={entry.ip} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-gray-700">{entry.ip}</td>
                        <td className="px-6 py-3 text-right font-semibold text-red-600">
                          {entry.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Blocked Requests */}
          {stats.recentBlocked.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Recent Blocked Requests</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-6 py-3">IP Address</th>
                      <th className="px-6 py-3">Request Path</th>
                      <th className="px-6 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentBlocked.map((entry, idx) => (
                      <tr key={`${entry.ip}-${entry.blockedAt}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-gray-700">{entry.ip}</td>
                        <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                          {entry.path}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-400 whitespace-nowrap">
                          {timeAgo(entry.blockedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
