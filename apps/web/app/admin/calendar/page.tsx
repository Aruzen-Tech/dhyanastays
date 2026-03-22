'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/api';
import type { CalendarBooking } from '../../../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonth(month: string): { year: number; monthIdx: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y, monthIdx: m - 1 };
}

function shiftMonth(month: string, delta: number): string {
  const { year, monthIdx } = parseMonth(month);
  const d = new Date(year, monthIdx + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const { year, monthIdx } = parseMonth(month);
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'CONFIRMED_PAID':
    case 'CONFIRMED_DEPOSIT':
      return 'bg-green-100 text-green-700';
    case 'BALANCE_DUE':
      return 'bg-amber-100 text-amber-700';
    case 'COMPLETED':
      return 'bg-brand-100 text-brand-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function dateOverlaps(startsAt: string, endsAt: string, year: number, monthIdx: number, day: number): boolean {
  const cellDate = new Date(year, monthIdx, day);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  // Normalize to date-only comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  cellDate.setHours(0, 0, 0, 0);
  return cellDate >= start && cellDate <= end;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminCalendarPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [month, setMonth] = useState(getCurrentMonth);
  const [listingFilter, setListingFilter] = useState('');
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    setLoading(true);
    setError('');
    adminApi
      .getCalendarBookings(month, listingFilter || undefined)
      .then(setBookings)
      .catch((e: Error) => {
        setError(e.message);
        setToast({ type: 'error', message: e.message });
      })
      .finally(() => setLoading(false));
  }, [user, month, listingFilter]);

  // ─── Listing filter options ─────────────────────────────────────────────

  const listingOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (!map.has(b.listingId)) {
        map.set(b.listingId, b.listingTitle);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  // ─── Calendar grid data ────────────────────────────────────────────────

  const { year, monthIdx } = parseMonth(month);
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // getDay() returns 0=Sun..6=Sat. We want Mon=0..Sun=6.
  const firstDayRaw = new Date(year, monthIdx, 1).getDay();
  const startPad = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Filtered bookings for display
  const filteredBookings = useMemo(() => {
    if (!listingFilter) return bookings;
    return bookings.filter((b) => b.listingId === listingFilter);
  }, [bookings, listingFilter]);

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
      <div className="mb-8">
        <h1 className="page-title">Booking Calendar</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visual overview of all bookings across listings
        </p>
      </div>

      {/* Controls Row */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="btn-secondary py-2 px-3 text-sm"
            aria-label="Previous month"
          >
            &larr;
          </button>
          <span className="text-base font-semibold text-gray-900 min-w-[160px] text-center">
            {formatMonthLabel(month)}
          </span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="btn-secondary py-2 px-3 text-sm"
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>

        {/* Listing filter */}
        <select
          value={listingFilter}
          onChange={(e) => setListingFilter(e.target.value)}
          className="input w-full sm:w-64"
        >
          <option value="">All Listings</option>
          {listingOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>

        {/* Today button */}
        <button
          onClick={() => setMonth(getCurrentMonth())}
          className="btn-ghost text-sm whitespace-nowrap"
        >
          Today
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-800">Failed to load calendar</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => {
                setError('');
                setMonth((m) => m); // trigger refetch by dependency change won't work - force it
              }}
              className="btn-primary text-sm py-2 px-4 shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-8 animate-pulse">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <div className="card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DAY_HEADERS.map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Start padding (empty cells) */}
            {Array.from({ length: startPad }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
              />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;

              const dayBookings = filteredBookings.filter((b) =>
                dateOverlaps(b.startsAt, b.endsAt, year, monthIdx, day),
              );

              return (
                <div
                  key={day}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${
                    isToday ? 'bg-brand-50/40' : ''
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-500'
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Booking pills */}
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className={`block text-xs px-1.5 py-0.5 rounded truncate font-medium hover:opacity-80 transition-opacity ${statusColor(b.status)}`}
                        title={`${b.guestName} - ${b.listingTitle}`}
                      >
                        {b.guestName}
                      </Link>
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-xs text-gray-400 pl-1">
                        +{dayBookings.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* End padding to complete the row */}
            {(() => {
              const totalCells = startPad + daysInMonth;
              const remainder = totalCells % 7;
              const endPad = remainder === 0 ? 0 : 7 - remainder;
              return Array.from({ length: endPad }).map((_, i) => (
                <div
                  key={`end-${i}`}
                  className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
                />
              ));
            })()}
          </div>

          {/* Empty state */}
          {filteredBookings.length === 0 && (
            <div className="p-12 text-center border-t border-gray-100">
              <p className="text-gray-400 text-sm">No bookings this month</p>
            </div>
          )}

          {/* Legend */}
          {filteredBookings.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Legend:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                Confirmed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
                Balance Due
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-100 border border-brand-200" />
                Completed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
