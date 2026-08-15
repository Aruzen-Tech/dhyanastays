'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatINR, hostAnalyticsApi, listingsApi } from '../../lib/api';
import type {
  AvailabilityBlock,
  HostCalendarBooking,
  SeasonalRate,
} from '../../lib/types';
import MonthGrid from './MonthGrid';
import {
  DayMap,
  addMonths,
  datesInclusive,
  dayIndex,
  firstOfMonth,
  indexToStr,
  localDayStr,
  monthLabel,
} from './calendarUtils';

type Mode = 'view' | 'block' | 'price';
type Overlay = 'none' | 'occupancy' | 'revenue';

interface HostAvailabilityCalendarProps {
  listingId: string;
  className?: string;
}

const HATCH = (rgba: string) =>
  `repeating-linear-gradient(45deg, ${rgba} 0, ${rgba} 2px, transparent 2px, transparent 6px)`;

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  CONFIRMED_PAID: { bg: 'bg-success/10', text: 'text-success' },
  CHECKED_IN: { bg: 'bg-success/10', text: 'text-success' },
  COMPLETED: { bg: 'bg-success/10', text: 'text-success' },
  CONFIRMED_DEPOSIT: { bg: 'bg-info/10', text: 'text-info' },
  BALANCE_DUE: { bg: 'bg-warning/10', text: 'text-warning' },
  PAYMENT_PENDING: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

/** Host payout per night for a booking = 90% of (subtotal + cleaning) / nights. */
function perNightPayout(b: HostCalendarBooking): number {
  const s = b.priceSnapshot;
  const gross = (s?.subtotal ?? 0) + (s?.cleaningFee ?? 0);
  const n = s?.nights || 1;
  return Math.round((gross * 0.9) / n);
}

export default function HostAvailabilityCalendar({
  listingId,
  className = '',
}: HostAvailabilityCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => firstOfMonth(new Date()));
  const [dayMap, setDayMap] = useState<DayMap>(new Map());
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalRate[]>([]);
  const [bookings, setBookings] = useState<HostCalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<Mode>('view');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [detail, setDetail] = useState<HostCalendarBooking | null>(null);

  const refresh = useCallback(() => {
    const from = localDayStr(viewMonth);
    const to = localDayStr(addMonths(viewMonth, 1));
    const month = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
    setLoading(true);
    setError('');
    Promise.all([
      listingsApi.getAvailability(listingId, from, to),
      listingsApi.getAvailabilityBlocks(listingId),
      listingsApi.getSeasonalRates(listingId),
      hostAnalyticsApi.getCalendarBookings(month, listingId),
    ])
      .then(([avail, blk, seas, bk]) => {
        setDayMap(new Map(avail.days.map((d) => [d.date, d])));
        setBlocks(blk);
        setSeasonal(seas);
        setBookings(bk);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [listingId, viewMonth]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Commit a drag selection on pointer release anywhere.
  useEffect(() => {
    if (mode === 'view') return;
    const onUp = () => {
      if (dragStart && dragEnd) void commitSelection(dragStart, dragEnd);
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dragStart, dragEnd, dayMap]);

  const bookingByDay = useMemo(() => {
    const m = new Map<string, HostCalendarBooking>();
    bookings.forEach((b) => {
      const start = dayIndex(b.startsAt.slice(0, 10));
      const end = dayIndex(b.endsAt.slice(0, 10));
      for (let i = start; i < end; i++) {
        const k = indexToStr(i);
        if (!m.has(k)) m.set(k, b);
      }
    });
    return m;
  }, [bookings]);

  const blockByDay = useMemo(() => {
    const m = new Map<string, AvailabilityBlock>();
    blocks.forEach((b) => {
      const start = dayIndex(b.startsAt.slice(0, 10));
      const end = dayIndex(b.endsAt.slice(0, 10));
      for (let i = start; i < end; i++) m.set(indexToStr(i), b);
    });
    return m;
  }, [blocks]);

  // Month KPIs from the visible month's nights.
  const kpis = useMemo(() => {
    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0,
    ).getDate();
    let bookedNights = 0;
    let revenue = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = localDayStr(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
      const bk = bookingByDay.get(ds);
      if (bk) {
        bookedNights += 1;
        revenue += perNightPayout(bk);
      }
    }
    return {
      occupancy: Math.round((bookedNights / daysInMonth) * 100),
      bookedNights,
      revenue,
      adr: bookedNights ? Math.round(revenue / bookedNights) : 0,
    };
  }, [viewMonth, bookingByDay]);

  async function commitSelection(a: string, b: string) {
    const dates = datesInclusive(a, b);
    const lo = dates[0];
    const hiPlus = indexToStr(dayIndex(dates[dates.length - 1]) + 1);
    // Only AVAILABLE days may be edited (never over a booking/hold).
    const bad = dates.find((ds) => {
      const st = dayMap.get(ds)?.state;
      return st === 'BOOKED' || st === 'HELD' || st === 'PAST';
    });
    if (bad) {
      setError('Selection includes booked, held or past days — pick open days only.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'block') {
        const reason =
          (typeof window !== 'undefined' &&
            window.prompt('Reason for blocking these dates?', 'Blocked by host')) ||
          'Blocked by host';
        await listingsApi.addAvailabilityBlock(listingId, {
          startsAt: `${lo}T00:00:00.000Z`,
          endsAt: `${hiPlus}T00:00:00.000Z`,
          reason,
        });
      } else if (mode === 'price') {
        const raw =
          typeof window !== 'undefined'
            ? window.prompt('Nightly rate for these dates (₹)?', '')
            : null;
        if (!raw) return;
        const rupees = Number(raw);
        if (!Number.isFinite(rupees) || rupees <= 0) {
          setError('Enter a valid nightly rate in rupees.');
          return;
        }
        await listingsApi.addSeasonalRate(listingId, {
          startsAt: `${lo}T00:00:00.000Z`,
          endsAt: `${hiPlus}T00:00:00.000Z`,
          nightlyRate: Math.round(rupees * 100),
        });
      }
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(block: AvailabilityBlock) {
    if (typeof window !== 'undefined' && !window.confirm('Remove this block?')) return;
    setBusy(true);
    try {
      await listingsApi.deleteAvailabilityBlock(listingId, block.id);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const renderDay = (date: Date) => {
    const ds = localDayStr(date);
    const day = dayMap.get(ds);
    if (!day) return <div className="h-16 rounded-lg bg-gray-50" aria-hidden />;

    const bk = bookingByDay.get(ds);
    const block = blockByDay.get(ds);
    const inDrag =
      dragStart &&
      dragEnd &&
      datesInclusive(dragStart, dragEnd).includes(ds) &&
      mode !== 'view';

    let bg = 'bg-white';
    let text = 'text-gray-800';
    let border = 'border border-gray-200';
    const style: React.CSSProperties = {};

    if (day.state === 'PAST') {
      bg = 'bg-gray-50';
      text = 'text-gray-300';
      border = 'border border-transparent';
    } else if (bk) {
      const st = STATUS_STYLE[bk.status] ?? STATUS_STYLE.PAYMENT_PENDING;
      bg = st.bg;
      text = st.text;
      border = 'border border-transparent';
    } else if (block) {
      bg = 'bg-gray-100';
      text = 'text-gray-500';
      style.backgroundImage = HATCH('rgba(120,120,120,0.3)');
    } else if (day.state === 'HELD') {
      bg = 'bg-warning/10';
      text = 'text-warning';
      style.backgroundImage = HATCH('rgba(var(--warning),0.2)');
    }

    // Occupancy overlay: solid brand fill on booked days.
    if (overlay === 'occupancy' && bk) {
      bg = 'bg-brand-600';
      text = 'text-white';
      style.backgroundImage = undefined;
    }

    if (inDrag) {
      bg = mode === 'price' ? 'bg-gold/20' : 'bg-brand-100';
      text = 'text-brand-800';
      border = 'border border-brand-400';
      style.backgroundImage = undefined;
    }

    const clickHandler = () => {
      if (mode !== 'view') return;
      if (bk) setDetail(bk);
      else if (block) void removeBlock(block);
    };

    return (
      <button
        type="button"
        onPointerDown={() => {
          if (mode !== 'view' && day.state !== 'PAST') {
            setDragStart(ds);
            setDragEnd(ds);
          }
        }}
        onPointerEnter={() => {
          if (mode !== 'view' && dragStart) setDragEnd(ds);
        }}
        onClick={clickHandler}
        aria-label={`${date.toDateString()} — ${bk ? bk.status : block ? 'blocked' : day.state.toLowerCase()}`}
        className={`relative h-16 w-full flex flex-col items-center justify-start pt-1 rounded-lg select-none transition-colors ${bg} ${text} ${border} ${
          mode !== 'view' ? 'cursor-crosshair' : bk || block ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={style}
      >
        <span className="text-xs font-semibold leading-none">{date.getDate()}</span>
        {bk ? (
          <span className="mt-0.5 text-[9px] leading-tight truncate max-w-full px-0.5">
            {overlay === 'revenue'
              ? formatINR(perNightPayout(bk)).replace('.00', '')
              : bk.guest.fullName.split(' ')[0]}
          </span>
        ) : block ? (
          <span className="mt-0.5 text-[8px] leading-tight text-gray-400">blocked</span>
        ) : day.state === 'AVAILABLE' ? (
          <span
            className={`mt-0.5 text-[9px] leading-none ${
              day.isSeasonal ? 'text-gold font-semibold' : 'text-gray-400'
            }`}
          >
            {formatINR(day.priceMinor).replace('.00', '')}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="btn-secondary px-2.5 py-1 text-xs"
            aria-label="Previous month"
          >
            &larr;
          </button>
          <span className="font-semibold text-sm min-w-[140px] text-center">
            {monthLabel(viewMonth)}
          </span>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="btn-secondary px-2.5 py-1 text-xs"
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>

        <div className="flex items-center gap-1 ml-auto text-xs">
          {(['view', 'block', 'price'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-full border capitalize ${
                mode === m
                  ? 'bg-brand-700 border-brand-700 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-brand-400'
              }`}
            >
              {m === 'view' ? 'View' : m === 'block' ? 'Paint block' : 'Set price'}
            </button>
          ))}
          <a
            href={`/api/listings/${listingId}/calendar.ics`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-brand-400"
            title="Export busy dates as an iCal feed for Airbnb / Google Calendar"
          >
            Export .ics
          </a>
        </div>
      </div>

      {/* KPI + overlay row */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">
          Occupancy <strong className="text-brand-700">{kpis.occupancy}%</strong>
        </span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">
          Booked <strong className="text-brand-700">{kpis.bookedNights}</strong> nights
        </span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">
          Payout <strong className="text-brand-700">{formatINR(kpis.revenue).replace('.00', '')}</strong>
        </span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5">
          ADR <strong className="text-brand-700">{formatINR(kpis.adr).replace('.00', '')}</strong>
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {(['none', 'occupancy', 'revenue'] as Overlay[]).map((o) => (
            <button
              key={o}
              onClick={() => setOverlay(o)}
              className={`px-2 py-0.5 rounded-full border capitalize ${
                overlay === o
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'border-gray-300 text-gray-500'
              }`}
            >
              {o === 'none' ? 'No overlay' : o}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'view' && (
        <p className="text-xs text-gray-500 mb-2">
          {mode === 'block'
            ? 'Drag across open days to block them. Click a blocked day to unblock.'
            : 'Drag across open days to set a seasonal nightly rate.'}
        </p>
      )}
      {error && <div className="alert-error text-xs mb-2">{error}</div>}

      <div className="card p-3 relative">
        {(loading || busy) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <span className="spinner text-brand-700 w-6 h-6" />
          </div>
        )}
        <MonthGrid monthStart={viewMonth} renderDay={renderDay} heading="" />
      </div>

      {/* Seasonal-rate chips (removable) */}
      {seasonal.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Seasonal rates</p>
          <div className="flex flex-wrap gap-2">
            {seasonal.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 text-[11px] bg-gold/10 text-gold border border-gold/40 rounded-full px-2 py-0.5"
              >
                {s.startsAt.slice(0, 10)}→{s.endsAt.slice(0, 10)}:{' '}
                {formatINR(s.nightlyRate).replace('.00', '')}
                <button
                  onClick={() =>
                    listingsApi.deleteSeasonalRate(listingId, s.id).then(refresh)
                  }
                  className="text-gold/70 hover:text-gold font-bold"
                  aria-label="Remove seasonal rate"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Booking detail popover */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">Booking</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 text-xl leading-none">
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Guest:</span>{' '}
                <span className="font-medium">{detail.guest.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500">Dates:</span>{' '}
                <span className="font-medium">
                  {detail.startsAt.slice(0, 10)} → {detail.endsAt.slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className="font-medium">{detail.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-gray-500">Payout / night:</span>{' '}
                <span className="font-medium">
                  {formatINR(perNightPayout(detail)).replace('.00', '')}
                </span>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="btn-primary w-full mt-4 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
