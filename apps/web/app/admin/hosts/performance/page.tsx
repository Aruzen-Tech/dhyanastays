'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi, formatINR } from '../../../../lib/api';
import type { HostPerformance } from '../../../../lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type SortField =
  | 'hostName'
  | 'hostEmail'
  | 'totalListings'
  | 'approvedListings'
  | 'totalBookings'
  | 'completedBookings'
  | 'occupancyRate'
  | 'totalRevenue'
  | 'avgBookingValue';

type SortDir = 'asc' | 'desc';

const STRING_FIELDS: SortField[] = ['hostName', 'hostEmail'];

// ─── Column config ──────────────────────────────────────────────────────────

interface ColumnDef {
  key: SortField;
  label: string;
  align?: 'left' | 'right' | 'center';
}

const COLUMNS: ColumnDef[] = [
  { key: 'hostName', label: 'Host Name' },
  { key: 'hostEmail', label: 'Email' },
  { key: 'approvedListings', label: 'Listings' },
  { key: 'completedBookings', label: 'Bookings' },
  { key: 'occupancyRate', label: 'Occupancy %', align: 'right' },
  { key: 'totalRevenue', label: 'Revenue', align: 'right' },
  { key: 'avgBookingValue', label: 'Avg Booking', align: 'right' },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function HostPerformancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [hosts, setHosts] = useState<HostPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast auto-dismiss ──────────────────────────────────────────────────

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const loadData = () => {
    setLoading(true);
    setError('');
    adminApi
      .getHostPerformance()
      .then(setHosts)
      .catch((e: Error) => {
        setError(e.message);
        setToast({ type: 'error', message: e.message });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadData();
  }, [user]);

  // ─── Sort logic ─────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const sortedHosts = useMemo(() => {
    return [...hosts].sort((a, b) => {
      if (STRING_FIELDS.includes(sortBy)) {
        const aVal = (a[sortBy] as string) ?? '';
        const bVal = (b[sortBy] as string) ?? '';
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const aVal = (a[sortBy] as number) ?? 0;
      const bVal = (b[sortBy] as number) ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [hosts, sortBy, sortDir]);

  // ─── Summary metrics ───────────────────────────────────────────────────

  const totalHosts = hosts.length;
  const avgOccupancy =
    totalHosts > 0
      ? hosts.reduce((sum, h) => sum + h.occupancyRate, 0) / totalHosts
      : 0;
  const totalRevenue = hosts.reduce((sum, h) => sum + h.totalRevenue, 0);

  // ─── Sort indicator ────────────────────────────────────────────────────

  const sortArrow = (field: SortField) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">&darr;</span>;
    return (
      <span className="text-brand-600 ml-1">
        {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  // ─── Render guards ────────────────────────────────────────────────────

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
          <h1 className="page-title">Host Performance</h1>
          <p className="text-gray-500 text-sm mt-1">
            Analytics and metrics across all hosts
          </p>
        </div>
        <button
          onClick={loadData}
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
              <h3 className="font-semibold text-red-800">Failed to load performance data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={loadData} className="btn-primary text-sm py-2 px-4 shrink-0">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !hosts.length && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="card p-6 animate-pulse">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Hosts
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalHosts}</p>
            </div>

            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Avg Occupancy Rate
              </p>
              <p className="text-2xl font-bold text-brand-700">
                {avgOccupancy.toFixed(1)}%
              </p>
            </div>

            <div className="card p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatINR(totalRevenue)}
              </p>
            </div>
          </div>

          {/* Empty state */}
          {hosts.length === 0 && (
            <div className="text-center py-20 card">
              <div className="text-5xl mb-4 text-gray-300">---</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No host data</h3>
              <p className="text-gray-400 text-sm">
                Host performance metrics will appear once hosts have listings and bookings.
              </p>
            </div>
          )}

          {/* Sortable Table */}
          {hosts.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`px-5 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 transition-colors select-none whitespace-nowrap ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          {sortArrow(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedHosts.map((host) => (
                      <tr key={host.hostId} className="hover:bg-gray-50 transition-colors">
                        {/* Host Name */}
                        <td className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">
                          {host.hostName}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4 text-gray-500">
                          {host.hostEmail}
                        </td>

                        {/* Listings: approved / total */}
                        <td className="px-5 py-4 text-gray-700">
                          <span className="font-semibold">{host.approvedListings}</span>
                          <span className="text-gray-400">/{host.totalListings}</span>
                        </td>

                        {/* Bookings: completed / total */}
                        <td className="px-5 py-4 text-gray-700">
                          <span className="font-semibold">{host.completedBookings}</span>
                          <span className="text-gray-400">/{host.totalBookings}</span>
                        </td>

                        {/* Occupancy % */}
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              host.occupancyRate >= 70
                                ? 'bg-green-100 text-green-700'
                                : host.occupancyRate >= 40
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {host.occupancyRate.toFixed(1)}%
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="px-5 py-4 text-right font-semibold text-green-600 whitespace-nowrap">
                          {formatINR(host.totalRevenue)}
                        </td>

                        {/* Avg Booking */}
                        <td className="px-5 py-4 text-right text-gray-700 whitespace-nowrap">
                          {formatINR(host.avgBookingValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer summary */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Showing {sortedHosts.length} host{sortedHosts.length !== 1 ? 's' : ''} &middot; Sorted by{' '}
                {COLUMNS.find((c) => c.key === sortBy)?.label ?? sortBy} ({sortDir === 'asc' ? 'ascending' : 'descending'})
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
