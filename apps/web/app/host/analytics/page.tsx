'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatINR, hostAnalyticsApi } from '../../../lib/api';
import type { HostRevenueDataPoint, HostStats } from '../../../lib/types';

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function StatSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-gray-50 flex justify-between">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function HostAnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<HostStats | null>(null);
  const [revenueData, setRevenueData] = useState<HostRevenueDataPoint[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [from, setFrom] = useState(toLocalISO(thirtyDaysAgo));
  const [to, setTo] = useState(toLocalISO(today));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Redirect non-HOST users
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  // Fetch stats
  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    setStatsLoading(true);
    hostAnalyticsApi
      .getStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setStatsLoading(false));
  }, [user]);

  // Fetch revenue data
  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    setRevenueLoading(true);
    setError('');
    hostAnalyticsApi
      .getRevenue(from, to, groupBy)
      .then(setRevenueData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setRevenueLoading(false));
  }, [user, from, to, groupBy]);

  if (isLoading || !user) return null;

  const chartData = revenueData.map((dp) => ({
    period: dp.period.slice(0, 10),
    revenue: dp.revenue / 100,
    bookings: dp.bookings,
  }));

  const totalChartRevenue = revenueData.reduce((sum, dp) => sum + dp.revenue, 0);
  const totalChartBookings = revenueData.reduce((sum, dp) => sum + dp.bookings, 0);

  return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          &larr; Back
        </button>
        <h1 className="page-title">Revenue Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your property revenue, occupancy, and booking trends.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : stats ? (
          <>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Revenue</p>
              <p className="text-2xl font-bold text-brand-700">{formatINR(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.totalBookings} booking{stats.totalBookings !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Earned</p>
              <p className="text-2xl font-bold text-emerald-600">{formatINR(stats.totalEarned)}</p>
              <p className="text-xs text-gray-400 mt-1">Paid out to you</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Occupancy Rate</p>
              <p className="text-2xl font-bold text-amber-600">{stats.occupancyRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.activeListings} active listing{stats.activeListings !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Upcoming Check-ins
              </p>
              <p className="text-2xl font-bold text-brand-700">{stats.upcomingCheckins}</p>
              <p className="text-xs text-gray-400 mt-1">Next 30 days</p>
            </div>
          </>
        ) : (
          <div className="col-span-full card p-8 text-center text-gray-400 text-sm">
            Unable to load stats.
          </div>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Group by</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none bg-white"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenueLoading ? (
        <ChartSkeleton />
      ) : revenueData.length === 0 ? (
        <div className="card p-12 text-center mb-6">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-semibold text-gray-700 mb-2">No revenue data</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            No bookings found for the selected date range. Try widening the range or check back
            after you receive bookings.
          </p>
        </div>
      ) : (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Revenue Over Time</h2>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>
                Total: <strong className="text-brand-700">{formatINR(totalChartRevenue)}</strong>
              </span>
              <span>
                Bookings: <strong className="text-brand-700">{totalChartBookings}</strong>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(v: unknown) => `₹${Number(v).toLocaleString('en-IN')}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                }}
                formatter={(value: unknown, name: unknown) => {
                  const v = Number(value);
                  if (name === 'revenue') return [`₹${v.toLocaleString('en-IN')}`, 'Revenue'];
                  return [v, 'Bookings'];
                }}
                labelFormatter={(label: unknown) => `Period: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ fill: '#4f46e5', r: 3 }}
                activeDot={{ r: 5, fill: '#4f46e5' }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#d97706', r: 3 }}
                activeDot={{ r: 5, fill: '#d97706' }}
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-indigo-600 rounded" /> Revenue (₹)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-amber-600 rounded border-dashed" />{' '}
              Bookings
            </span>
          </div>
        </div>
      )}

      {/* Revenue Table */}
      {revenueLoading ? (
        <TableSkeleton />
      ) : revenueData.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Revenue Breakdown</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {revenueData.length} period{revenueData.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium text-right">Revenue</th>
                  <th className="px-5 py-3 font-medium text-right">Bookings</th>
                  <th className="px-5 py-3 font-medium text-right">Avg / Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenueData.map((dp) => (
                  <tr key={dp.period} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatDate(dp.period)}
                    </td>
                    <td className="px-5 py-3 text-right text-brand-700 font-semibold">
                      {formatINR(dp.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{dp.bookings}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {dp.bookings > 0 ? formatINR(Math.round(dp.revenue / dp.bookings)) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-5 py-3 text-gray-900">Total</td>
                  <td className="px-5 py-3 text-right text-brand-700">
                    {formatINR(totalChartRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{totalChartBookings}</td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {totalChartBookings > 0
                      ? formatINR(Math.round(totalChartRevenue / totalChartBookings))
                      : '--'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
