'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { hostAnalyticsApi, formatINR } from '../../../lib/api';
import type { HostListingPerformance } from '../../../lib/types';

type SortKey = keyof Pick<
  HostListingPerformance,
  'title' | 'city' | 'status' | 'baseRate' | 'totalBookings' | 'totalRevenue' | 'occupancyRate' | 'bookedDays30'
>;

export default function HostPerformancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<HostListingPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    hostAnalyticsApi
      .getListingPerformance()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || !user) return null;

  // Sorting
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'title' || key === 'city' || key === 'status');
    }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    let cmp: number;
    if (typeof av === 'string' && typeof bv === 'string') {
      cmp = av.localeCompare(bv);
    } else {
      cmp = (av as number) - (bv as number);
    }
    return sortAsc ? cmp : -cmp;
  });

  // Summary helpers
  const totalListings = data.length;
  const activeListings = data.filter((d) => d.status === 'APPROVED').length;
  const bestPerformer = data.length
    ? data.reduce((best, cur) => (cur.totalRevenue > best.totalRevenue ? cur : best))
    : null;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-gray-300 ml-1">&#8597;</span>;
    return <span className="ml-1">{sortAsc ? '\u25B2' : '\u25BC'}</span>;
  };

  const occupancyColor = (rate: number) => {
    if (rate >= 60) return 'bg-green-500';
    if (rate >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const occupancyText = (rate: number) => {
    if (rate >= 60) return 'text-green-700';
    if (rate >= 30) return 'text-amber-700';
    return 'text-red-700';
  };

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          ← Back
        </button>
        <h1 className="page-title">Listing Performance</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track how each of your listings is performing over the last 30 days.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
          <div className="card overflow-hidden animate-pulse">
            <div className="h-12 bg-gray-100" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 border-t border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && !error && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-semibold text-gray-700 mb-2">No listings yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Create your first listing to start tracking performance metrics.
          </p>
          <Link href="/host/listings/new" className="btn-primary">
            Create Listing
          </Link>
        </div>
      )}

      {/* Data loaded */}
      {!loading && data.length > 0 && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Total Listings</p>
              <p className="text-3xl font-bold text-gray-900">{totalListings}</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Active Listings</p>
              <p className="text-3xl font-bold text-green-600">{activeListings}</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">Best Performer</p>
              {bestPerformer ? (
                <>
                  <p className="text-lg font-bold text-brand-700 truncate" title={bestPerformer.title}>
                    {bestPerformer.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatINR(bestPerformer.totalRevenue)} revenue</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Sortable table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('title')}
                    >
                      Listing{sortIndicator('title')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('city')}
                    >
                      Location{sortIndicator('city')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('status')}
                    >
                      Status{sortIndicator('status')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900 text-right"
                      onClick={() => handleSort('baseRate')}
                    >
                      Base Rate{sortIndicator('baseRate')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900 text-right"
                      onClick={() => handleSort('totalBookings')}
                    >
                      Bookings{sortIndicator('totalBookings')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900 text-right"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      Revenue{sortIndicator('totalRevenue')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('occupancyRate')}
                    >
                      Occupancy (30d){sortIndicator('occupancyRate')}
                    </th>
                    <th
                      className="px-5 py-3 cursor-pointer select-none hover:text-gray-900 text-right"
                      onClick={() => handleSort('bookedDays30')}
                    >
                      Booked Days{sortIndicator('bookedDays30')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((item) => (
                    <tr key={item.listingId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/host/listings/${item.listingId}/edit`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {item.city}, {item.state}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right font-medium">{formatINR(item.baseRate)}</td>
                      <td className="px-5 py-4 text-right">{item.totalBookings}</td>
                      <td className="px-5 py-4 text-right font-medium">{formatINR(item.totalRevenue)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${occupancyColor(item.occupancyRate)}`}
                              style={{ width: `${Math.min(item.occupancyRate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${occupancyText(item.occupancyRate)} w-10 text-right`}>
                            {item.occupancyRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">{item.bookedDays30}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
