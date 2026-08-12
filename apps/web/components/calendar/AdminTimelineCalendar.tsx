'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, formatINR } from '../../lib/api';
import type { AdminCalendarTimeline, AdminTimelineBooking } from '../../lib/types';
import { dayIndex, todayStr } from './calendarUtils';

const DAY_W = 30; // px per day column
const ROW_H = 34; // px per listing row

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const STATUS_BAR: Record<string, string> = {
  CONFIRMED_PAID: 'bg-success/80',
  CHECKED_IN: 'bg-success',
  COMPLETED: 'bg-brand-600',
  CONFIRMED_DEPOSIT: 'bg-info',
  BALANCE_DUE: 'bg-warning',
  PAYMENT_PENDING: 'bg-gray-400',
};

const HOUR = 3_600_000;

export default function AdminTimelineCalendar({ className = '' }: { className?: string }) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<AdminCalendarTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getCalendarTimeline(month)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStartIdx = dayIndex(`${month}-01`);
  const today = todayStr();
  const todayIdx = dayIndex(today);
  const todayCol = todayIdx - monthStartIdx; // -1 if not this month

  const cities = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.listings.map((l) => l.city))).sort();
  }, [data]);

  const listings = useMemo(() => {
    if (!data) return [];
    return city ? data.listings.filter((l) => l.city === city) : data.listings;
  }, [data, city]);

  const bookingsByListing = useMemo(() => {
    const m = new Map<string, AdminTimelineBooking[]>();
    data?.bookings.forEach((b) => {
      if (!m.has(b.listingId)) m.set(b.listingId, []);
      m.get(b.listingId)!.push(b);
    });
    return m;
  }, [data]);

  // KPIs over the visible month.
  const kpis = useMemo(() => {
    if (!data) return { occupancy: 0, adr: 0, bookings: 0 };
    let occupiedNights = 0;
    let subtotal = 0;
    let nights = 0;
    for (const b of data.bookings) {
      const s = dayIndex(b.startsAt.slice(0, 10));
      const e = dayIndex(b.endsAt.slice(0, 10));
      const from = Math.max(s, monthStartIdx);
      const to = Math.min(e, monthStartIdx + daysInMonth);
      if (to > from) occupiedNights += to - from;
      subtotal += b.subtotalMinor;
      nights += b.nights;
    }
    const capacity = (listings.length || data.listings.length) * daysInMonth;
    return {
      occupancy: capacity ? Math.round((occupiedNights / capacity) * 100) : 0,
      adr: nights ? Math.round(subtotal / nights) : 0,
      bookings: data.bookings.length,
    };
  }, [data, daysInMonth, monthStartIdx, listings.length]);

  // Today rail.
  const rail = useMemo(() => {
    const arrivals: AdminTimelineBooking[] = [];
    const departures: AdminTimelineBooking[] = [];
    if (todayCol >= 0 && data) {
      for (const b of data.bookings) {
        if (dayIndex(b.startsAt.slice(0, 10)) === todayIdx) arrivals.push(b);
        if (dayIndex(b.endsAt.slice(0, 10)) === todayIdx) departures.push(b);
      }
    }
    const departingListings = new Set(departures.map((b) => b.listingId));
    const turnovers = arrivals.filter((b) => departingListings.has(b.listingId));
    return { arrivals, departures, turnovers };
  }, [data, todayIdx, todayCol]);

  function anomaly(b: AdminTimelineBooking): { color: string; label: string } | null {
    const nowMs = Date.now();
    const startMs = new Date(b.startsAt).getTime();
    if (b.status === 'BALANCE_DUE' && startMs > nowMs && startMs - nowMs < 48 * HOUR) {
      return { color: 'bg-error', label: 'Balance due, check-in < 48h' };
    }
    if (b.status === 'CHECKED_IN' && nowMs - startMs < 24 * HOUR) {
      return { color: 'bg-warning', label: 'Checked in, payout not yet eligible' };
    }
    return null;
  }

  const trackWidth = daysInMonth * DAY_W;

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((mm) => shiftMonth(mm, -1))} className="btn-secondary px-2.5 py-1 text-xs" aria-label="Previous month">&larr;</button>
          <span className="font-semibold text-sm min-w-[140px] text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth((mm) => shiftMonth(mm, 1))} className="btn-secondary px-2.5 py-1 text-xs" aria-label="Next month">&rarr;</button>
        </div>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white ml-auto"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">Occupancy <strong className="text-brand-700">{kpis.occupancy}%</strong></span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">ADR <strong className="text-brand-700">{formatINR(kpis.adr).replace('.00', '')}</strong></span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">Bookings <strong className="text-brand-700">{kpis.bookings}</strong></span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">Listings <strong className="text-brand-700">{listings.length}</strong></span>
      </div>

      {/* Today ops rail */}
      {todayCol >= 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { title: 'Arrivals today', items: rail.arrivals, tone: 'text-success' },
            { title: 'Departures today', items: rail.departures, tone: 'text-info' },
            { title: 'Turnovers today', items: rail.turnovers, tone: 'text-warning' },
          ].map((col) => (
            <div key={col.title} className="card p-3">
              <p className={`text-xs font-semibold mb-1.5 ${col.tone}`}>
                {col.title} ({col.items.length})
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {col.items.length === 0 && <p className="text-[11px] text-gray-400">None</p>}
                {col.items.map((b) => (
                  <p key={b.id} className="text-[11px] text-gray-600 truncate">
                    {b.guestName} · <span className="text-gray-400">{b.listingTitle}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="alert-error text-xs mb-2">{error}</div>}

      {/* Gantt */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 180 + trackWidth }}>
            {/* Day header */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0">
              <div className="w-[180px] shrink-0 px-3 py-2 text-[11px] font-semibold text-gray-500">
                Listing
              </div>
              <div className="relative" style={{ width: trackWidth, height: 28 }}>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <div
                    key={i}
                    className={`absolute top-0 text-center text-[9px] pt-1.5 ${
                      i === todayCol ? 'text-brand-700 font-bold' : 'text-gray-400'
                    }`}
                    style={{ left: i * DAY_W, width: DAY_W }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {loading && !data ? (
              <div className="py-12 text-center">
                <span className="spinner text-brand-700 w-6 h-6" />
              </div>
            ) : listings.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No listings.</div>
            ) : (
              listings.map((l) => {
                const bs = bookingsByListing.get(l.id) ?? [];
                return (
                  <div key={l.id} className="flex border-b border-gray-100 last:border-0">
                    <div className="w-[180px] shrink-0 px-3 py-2 border-r border-gray-100">
                      <p className="text-[11px] font-medium text-gray-700 truncate">{l.title}</p>
                      <p className="text-[9px] text-gray-400 truncate">{l.city}</p>
                    </div>
                    <div className="relative" style={{ width: trackWidth, height: ROW_H }}>
                      {/* today marker line */}
                      {todayCol >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-brand-400/50"
                          style={{ left: todayCol * DAY_W + DAY_W / 2 }}
                        />
                      )}
                      {bs.map((b) => {
                        const s = dayIndex(b.startsAt.slice(0, 10));
                        const e = dayIndex(b.endsAt.slice(0, 10));
                        const from = Math.max(s, monthStartIdx) - monthStartIdx;
                        const toExcl = Math.min(e, monthStartIdx + daysInMonth) - monthStartIdx;
                        const cols = toExcl - from;
                        if (cols <= 0) return null;
                        const an = anomaly(b);
                        return (
                          <div
                            key={b.id}
                            title={`${b.guestName} · ${b.status.replace(/_/g, ' ')} · ${b.startsAt.slice(0, 10)}→${b.endsAt.slice(0, 10)}`}
                            className={`absolute top-1.5 h-[22px] rounded ${STATUS_BAR[b.status] ?? 'bg-gray-400'} text-white text-[9px] leading-[22px] px-1.5 truncate flex items-center`}
                            style={{ left: from * DAY_W + 1, width: cols * DAY_W - 2 }}
                          >
                            {an && (
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${an.color} ring-1 ring-white`}
                                title={an.label}
                              />
                            )}
                            <span className="truncate">{b.guestName.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success" /> Paid / checked-in</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-info" /> Deposit</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning" /> Balance due</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-error ring-1 ring-white" /> Anomaly</span>
      </div>
    </div>
  );
}
