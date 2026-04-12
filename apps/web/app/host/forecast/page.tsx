'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { hostAnalyticsApi, formatINR } from '../../../lib/api';
import type { HostForecastBucket } from '../../../lib/types';

const BUCKET_COLORS: Record<number, { bg: string; border: string; bar: string; text: string }> = {
  30: { bg: 'from-green-50 to-green-100', border: 'border-green-200', bar: '#22c55e', text: 'text-green-700' },
  60: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', bar: '#3b82f6', text: 'text-blue-700' },
  90: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', bar: '#a855f7', text: 'text-purple-700' },
};

export default function HostForecastPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [buckets, setBuckets] = useState<HostForecastBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    hostAnalyticsApi
      .getForecast()
      .then(setBuckets)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || !user) return null;

  const totalRevenue = buckets.reduce((sum, b) => sum + b.revenue, 0);

  const chartData = buckets.map((b) => ({
    label: b.label,
    revenue: b.revenue / 100,
    days: b.days,
  }));

  return (
    <div className="container-page py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          &larr; Back
        </button>
        <h1 className="page-title">Revenue Forecast</h1>
        <p className="text-gray-500 text-sm mt-1">
          Projected earnings from your confirmed future bookings.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="card animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-5 bg-gray-100 rounded w-32" />
          </div>
          <div className="card animate-pulse h-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-7 bg-gray-100 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && buckets.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-semibold text-gray-700 mb-2">No forecast data yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Revenue forecasts appear here once you have confirmed future bookings.
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && buckets.length > 0 && (
        <div className="space-y-6">
          {/* Total revenue header */}
          <div className="card text-center">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">
              Total Forecasted Revenue
            </p>
            <p className="text-4xl font-bold text-gray-900">{formatINR(totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">Next 90 days</p>
          </div>

          {/* Bar chart */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">Revenue by Period</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v: unknown) => `₹${Number(v).toLocaleString('en-IN')}`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={60}>
                    {buckets.map((_, index) => (
                      <Cell key={index} fill={['#22c55e', '#3b82f6', '#a855f7'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {buckets.map((bucket) => {
              const style = BUCKET_COLORS[bucket.days] ?? BUCKET_COLORS[90];
              return (
                <div
                  key={bucket.days}
                  className={`card bg-gradient-to-br ${style.bg} border ${style.border}`}
                >
                  <p className={`text-sm font-medium ${style.text} mb-3`}>{bucket.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatINR(bucket.revenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {bucket.bookings} {bucket.bookings === 1 ? 'booking' : 'bookings'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 mt-0.5 text-lg">ℹ</span>
              <p className="text-sm text-blue-700 leading-relaxed">
                Revenue forecast shows your expected earnings (after 10% platform fee) from
                confirmed future bookings. Actual payouts may vary if cancellations occur.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
