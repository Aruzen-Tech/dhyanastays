'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi, formatINR } from '../../../lib/api';
import type { RevenueForecast } from '../../../lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.name}</span>
          </span>
          <span className="font-semibold text-gray-900">{formatINR(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminForecastPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [forecasts, setForecasts] = useState<RevenueForecast[]>([]);
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

  const loadForecast = () => {
    setLoading(true);
    setError('');
    adminApi
      .getForecast()
      .then(setForecasts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadForecast();
  }, [user]);

  // ─── Chart data ────────────────────────────────────────────────────────────

  const chartData = forecasts.map((f) => ({
    period: f.period,
    confirmedRevenue: f.confirmedRevenue,
    expectedDeposits: f.expectedDeposits,
    expectedBalance: f.expectedBalance,
  }));

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
          <h1 className="page-title">Revenue Forecast</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projected revenue from upcoming bookings
          </p>
        </div>
        <button
          onClick={loadForecast}
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
              <h3 className="font-semibold text-red-800">Failed to load forecast</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={loadForecast} className="btn-primary text-sm py-2 px-4 shrink-0">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && forecasts.length === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-[350px] bg-gray-100 rounded" />
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && forecasts.length > 0 && (
        <div className="space-y-8">
          {/* Period Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecasts.map((forecast) => {
              const totalProjected =
                forecast.confirmedRevenue +
                forecast.expectedDeposits +
                forecast.expectedBalance;

              return (
                <div key={forecast.period} className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    {forecast.period}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Confirmed Revenue</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatINR(forecast.confirmedRevenue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Expected Deposits</span>
                      <span className="text-sm font-semibold text-teal-600">
                        {formatINR(forecast.expectedDeposits)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Expected Balance</span>
                      <span className="text-sm font-semibold text-amber-600">
                        {formatINR(forecast.expectedBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Booking Count</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {forecast.bookingCount}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Projected</span>
                        <span className="text-base font-bold text-gray-900">
                          {formatINR(totalProjected)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar Chart */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6">
              Revenue Breakdown by Period
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tickFormatter={(value: number) => formatINR(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
                />
                <Bar
                  dataKey="confirmedRevenue"
                  name="Confirmed Revenue"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expectedDeposits"
                  name="Expected Deposits"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expectedBalance"
                  name="Expected Balance"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && forecasts.length === 0 && !error && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No forecast data available
          </h3>
          <p className="text-gray-400 text-sm">
            Revenue forecasts will appear here once there are upcoming bookings.
          </p>
        </div>
      )}
    </div>
  );
}
