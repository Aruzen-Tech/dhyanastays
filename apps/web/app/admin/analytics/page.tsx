'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatINR } from '../../../lib/api';
import type { RevenueDataPoint } from '../../../lib/types';

// ─── Date helpers ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Preset = '7d' | '30d' | '90d' | 'custom';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [preset, setPreset] = useState<Preset>('30d');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Preset handler ──────────────────────────────────────────────────────

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === '7d') {
      setFrom(daysAgo(7));
      setTo(today());
    } else if (p === '30d') {
      setFrom(daysAgo(30));
      setTo(today());
    } else if (p === '90d') {
      setFrom(daysAgo(90));
      setTo(today());
    }
  };

  // ─── Data fetching ───────────────────────────────────────────────────────

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getRevenue(from, to, groupBy)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to, groupBy]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadData();
  }, [user, loadData]);

  // ─── Summary totals ─────────────────────────────────────────────────────

  const totals = data.reduce(
    (acc, d) => ({
      totalCollected: acc.totalCollected + d.totalCollected,
      platformFees: acc.platformFees + d.platformFees,
      hostShare: acc.hostShare + d.hostShare,
      bookingCount: acc.bookingCount + d.bookingCount,
    }),
    { totalCollected: 0, platformFees: 0, hostShare: 0, bookingCount: 0 },
  );

  // ─── Chart data formatting ──────────────────────────────────────────────

  const chartData = data.map((d) => ({
    ...d,
    totalCollectedINR: d.totalCollected / 100,
    platformFeesINR: d.platformFees / 100,
    hostShareINR: d.hostShare / 100,
  }));

  // ─── Render guard ────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Revenue Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track platform revenue, fees, and host payouts over time
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-8">
        {/* Presets */}
        <div className="flex gap-1">
          {(['7d', '30d', '90d', 'custom'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                preset === p
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'custom' ? 'Custom' : `Last ${p}`}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <div>
            <label className="label text-xs">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('custom');
              }}
              className="input text-sm py-1.5"
            />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('custom');
              }}
              className="input text-sm py-1.5"
            />
          </div>
        </div>

        {/* Group by */}
        <div>
          <label className="label text-xs">Group by</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
            className="input text-sm py-1.5"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="card p-6 animate-pulse">
          <div className="h-[300px] bg-gray-200 rounded" />
        </div>
      )}

      {/* Chart */}
      {!loading && data.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                formatter={(value: any) => formatINR(Number(value) * 100)}
                labelFormatter={(label: any) => `Period: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalCollectedINR"
                name="Total Collected"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="platformFeesINR"
                name="Platform Fees"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="hostShareINR"
                name="Host Share"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && !error && (
        <div className="text-center py-20 card mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No revenue data</h3>
          <p className="text-gray-400 text-sm">
            Try adjusting the date range to see revenue analytics.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total Collected
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatINR(totals.totalCollected)}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Platform Fees
            </p>
            <p className="text-2xl font-bold text-purple-600">
              {formatINR(totals.platformFees)}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Host Share
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {formatINR(totals.hostShare)}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Bookings
            </p>
            <p className="text-2xl font-bold text-gray-900">{totals.bookingCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
