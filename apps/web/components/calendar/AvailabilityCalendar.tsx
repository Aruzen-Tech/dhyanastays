'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatINR, listingsApi } from '../../lib/api';
import MonthGrid from './MonthGrid';
import {
  DayMap,
  addMonths,
  cheapestWindow,
  dayIndex,
  estimateTotal,
  firstOfMonth,
  isSelectableRange,
  localDayStr,
  monthLabel,
} from './calendarUtils';

interface AvailabilityCalendarProps {
  listingId: string;
  value: { checkIn: string; checkOut: string };
  onChange: (checkIn: string, checkOut: string) => void;
  /** Cleaning fee in paise, for the running-total estimate. */
  cleaningFee: number;
  /** Optional Stay-theme accent (hex) — tints the selected range (P4). */
  accentColor?: string;
  /** Show two months side-by-side (desktop). Off for narrow sidebars. */
  dualMonth?: boolean;
  className?: string;
}

const HATCH = (rgba: string) =>
  `repeating-linear-gradient(45deg, ${rgba} 0, ${rgba} 2px, transparent 2px, transparent 6px)`;

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function AvailabilityCalendar({
  listingId,
  value,
  onChange,
  cleaningFee,
  accentColor,
  dualMonth = true,
  className = '',
}: AvailabilityCalendarProps) {
  const [viewMonth, setViewMonth] = useState<Date>(() => firstOfMonth(new Date()));
  const [dayMap, setDayMap] = useState<DayMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverEnd, setHoverEnd] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(false);
  const [flexNights, setFlexNights] = useState(0); // 0 = off (P4 flexible dates)
  const [nowMs, setNowMs] = useState(() => Date.now());

  const minMonth = firstOfMonth(new Date());
  const atFloor = viewMonth <= minMonth;

  // Fetch the visible 2-month window and merge into the map.
  useEffect(() => {
    let cancelled = false;
    const from = localDayStr(viewMonth);
    const to = localDayStr(addMonths(viewMonth, 2));
    setLoading(true);
    setError('');
    listingsApi
      .getAvailability(listingId, from, to)
      .then((res) => {
        if (cancelled) return;
        setDayMap((prev) => {
          const next = new Map(prev);
          res.days.forEach((d) => next.set(d.date, d));
          return next;
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [listingId, viewMonth]);

  // Tick once a second only while a held day is in view (for the MM:SS badge).
  const hasHeld = useMemo(
    () => [...dayMap.values()].some((d) => d.state === 'HELD' && d.heldUntil),
    [dayMap],
  );
  useEffect(() => {
    if (!hasHeld) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasHeld]);

  // Price range across available days in view — for the heatmap intensity.
  const priceRange = useMemo(() => {
    const prices = [...dayMap.values()]
      .filter((d) => d.state === 'AVAILABLE')
      .map((d) => d.priceMinor);
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [dayMap]);

  // In-progress vs committed selection.
  const selStart = anchor ?? (value.checkIn || null);
  const inProgress = anchor !== null;
  const selEnd = inProgress ? hoverEnd : value.checkOut || null;

  const rangeValid =
    selStart && selEnd && dayIndex(selEnd) > dayIndex(selStart)
      ? isSelectableRange(dayMap, selStart, selEnd)
      : true;

  const estimate = useMemo(() => {
    const ci = value.checkIn || (inProgress ? selStart : null);
    const co = value.checkOut || (inProgress && rangeValid ? selEnd : null);
    if (!ci || !co || dayIndex(co) <= dayIndex(ci)) return null;
    if (!isSelectableRange(dayMap, ci, co)) return null;
    return { ...estimateTotal(dayMap, ci, co, cleaningFee), checkIn: ci, checkOut: co };
  }, [value.checkIn, value.checkOut, inProgress, selStart, selEnd, rangeValid, dayMap, cleaningFee]);

  const minNightsHint = selStart ? dayMap.get(selStart)?.minNights ?? 1 : 1;

  const pickDay = useCallback(
    (dateStr: string) => {
      const day = dayMap.get(dateStr);
      const startable = !!day && day.state === 'AVAILABLE';
      if (anchor) {
        if (isSelectableRange(dayMap, anchor, dateStr)) {
          onChange(anchor, dateStr);
          setAnchor(null);
          setHoverEnd(null);
          return;
        }
        if (startable) {
          setAnchor(dateStr);
          setHoverEnd(null);
          onChange('', '');
        }
        return;
      }
      if (startable) {
        setAnchor(dateStr);
        setHoverEnd(null);
        onChange('', '');
      }
    },
    [anchor, dayMap, onChange],
  );

  const applyFlexible = useCallback(
    (n: number) => {
      setFlexNights(n);
      if (n <= 0) return;
      const ordered = [...dayMap.keys()].sort();
      const best = cheapestWindow(dayMap, n, ordered);
      if (best) {
        setAnchor(null);
        setHoverEnd(null);
        onChange(best.checkIn, best.checkOut);
      }
    },
    [dayMap, onChange],
  );

  const renderDay = (date: Date) => {
    const ds = localDayStr(date);
    const day = dayMap.get(ds);
    const di = dayIndex(ds);
    const s = selStart ? dayIndex(selStart) : null;
    const e = selEnd ? dayIndex(selEnd) : null;
    const lo = s !== null && e !== null ? Math.min(s, e) : s;
    const hi = s !== null && e !== null ? Math.max(s, e) : s;
    const isStart = s !== null && di === s;
    const isEnd = e !== null && di === e && e !== s;
    const inRange = lo !== null && hi !== null && di >= lo && di <= hi;
    const previewInvalid = inProgress && inRange && !rangeValid;

    if (!day) {
      return (
        <div className="h-14 rounded-lg bg-gray-50" aria-hidden />
      );
    }

    const isPast = day.state === 'PAST';
    const isAvail = day.state === 'AVAILABLE';
    const clickable = isAvail || (!!anchor && isSelectableRange(dayMap, anchor, ds));

    // Base visual per state.
    let bg = 'bg-white';
    let text = 'text-gray-800';
    let border = 'border border-gray-200';
    let style: React.CSSProperties = {};
    let badge: string | null = null;

    if (isPast) {
      bg = 'bg-gray-50';
      text = 'text-gray-300';
      border = 'border border-transparent';
    } else if (day.state === 'BOOKED') {
      bg = 'bg-gray-100';
      text = 'text-gray-400';
      border = 'border border-gray-200';
    } else if (day.state === 'BLOCKED') {
      bg = 'bg-gray-100';
      text = 'text-gray-400';
      border = 'border border-gray-200';
      style.backgroundImage = HATCH('rgba(120,120,120,0.28)');
    } else if (day.state === 'HELD') {
      bg = 'bg-warning/10';
      text = 'text-warning';
      border = 'border border-warning/20';
      style.backgroundImage = HATCH('rgba(var(--warning),0.20)');
      if (day.heldUntil) badge = mmss(new Date(day.heldUntil).getTime() - nowMs);
    } else if (isAvail && heatmap && priceRange && priceRange.max > priceRange.min) {
      const t =
        (day.priceMinor - priceRange.min) / (priceRange.max - priceRange.min);
      // cooler (cheaper) → warmer (pricier)
      style.backgroundColor = `rgba(217,119,6,${(0.06 + t * 0.32).toFixed(3)})`;
    }

    // Selection overlay wins visually.
    if (!isPast && (isStart || isEnd)) {
      text = 'text-white';
      border = 'border border-transparent';
      if (accentColor) {
        style.backgroundColor = accentColor;
        bg = '';
      } else {
        bg = 'bg-brand-700';
      }
    } else if (!isPast && inRange) {
      if (previewInvalid) {
        bg = 'bg-error/10';
        text = 'text-error';
        border = 'border border-error/20';
        style = {};
      } else {
        bg = 'bg-brand-100';
        text = 'text-brand-800';
        border = 'border border-brand-200';
        if (accentColor) {
          style.backgroundColor = `${accentColor}22`;
          bg = '';
        }
      }
    }

    const roundedL = isStart || (inRange && (lo !== null && di === lo));
    const roundedR = isEnd || (inRange && (hi !== null && di === hi));

    const priceStr = formatINR(day.priceMinor).replace('.00', '');
    const label = `${date.toDateString()} — ${
      isAvail ? `available, ${priceStr} per night` : day.state.toLowerCase()
    }${day.isTurnover ? ', turnover day' : ''}`;

    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => pickDay(ds)}
        onMouseEnter={() => anchor && setHoverEnd(ds)}
        onFocus={() => anchor && setHoverEnd(ds)}
        aria-label={label}
        aria-pressed={isStart || isEnd}
        className={`relative h-14 w-full flex flex-col items-center justify-center text-center transition-colors ${bg} ${text} ${border} ${
          roundedL ? 'rounded-l-lg' : ''
        } ${roundedR ? 'rounded-r-lg' : ''} ${!roundedL && !roundedR ? 'rounded-lg' : ''} ${
          clickable ? 'cursor-pointer hover:border-brand-400' : 'cursor-default'
        }`}
        style={style}
      >
        {/* turnover split corner */}
        {day.isTurnover && !isStart && !isEnd && (
          <span
            aria-hidden
            className="absolute top-0 left-0 border-t-[10px] border-l-[10px] border-t-gray-300 border-l-transparent rounded-tl-lg"
          />
        )}
        <span className="text-xs font-semibold leading-none">{date.getDate()}</span>
        {isAvail && (
          <span
            className={`mt-0.5 text-[9px] leading-none tabular-nums ${
              isStart || isEnd
                ? 'text-white/90'
                : day.isSeasonal
                  ? 'text-gold font-semibold'
                  : 'text-gray-400'
            }`}
          >
            {formatINR(day.priceMinor).replace('₹', '₹').replace('.00', '')}
          </span>
        )}
        {badge && (
          <span className="mt-0.5 text-[8px] leading-none font-bold text-warning tabular-nums">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={atFloor}
          className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {monthLabel(viewMonth)}
          {dualMonth && (
            <span className="hidden lg:inline"> – {monthLabel(addMonths(viewMonth, 1))}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="btn-secondary px-2.5 py-1 text-xs"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      {error && <div className="alert-error text-xs mb-2">{error}</div>}

      <div
        onMouseLeave={() => setHoverEnd(null)}
        className={`grid grid-cols-1 gap-5 ${dualMonth ? 'lg:grid-cols-2' : ''}`}
      >
        <MonthGrid monthStart={viewMonth} renderDay={renderDay} />
        {dualMonth && (
          <MonthGrid
            monthStart={addMonths(viewMonth, 1)}
            renderDay={renderDay}
            className="hidden lg:block"
          />
        )}
      </div>

      {loading && dayMap.size === 0 && (
        <div className="text-center py-6">
          <span className="spinner text-brand-700 w-6 h-6" />
        </div>
      )}

      {/* Legend + toggles */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-300" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: HATCH('rgba(217,119,6,0.35)'), backgroundColor: 'rgb(254 243 199)' }} /> On hold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: HATCH('rgba(120,120,120,0.4)'), backgroundColor: 'rgb(243 244 246)' }} /> Blocked
        </span>
        <span className="flex items-center gap-1.5 text-gold">
          <span className="w-3 h-3 rounded border border-gold" /> Seasonal price
        </span>
        <button
          type="button"
          onClick={() => setHeatmap((h) => !h)}
          className={`ml-auto px-2 py-0.5 rounded-full border text-[11px] ${
            heatmap ? 'bg-gold/10 border-gold text-gold' : 'border-gray-300 text-gray-500'
          }`}
        >
          Price heatmap
        </button>
      </div>

      {/* Flexible dates (P4) */}
      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
        <span className="text-gray-500">Flexible? Cheapest</span>
        {[2, 3, 5, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => applyFlexible(flexNights === n ? 0 : n)}
            className={`px-2 py-0.5 rounded-full border ${
              flexNights === n
                ? 'bg-brand-700 border-brand-700 text-white'
                : 'border-gray-300 text-gray-600 hover:border-brand-400'
            }`}
          >
            {n} nights
          </button>
        ))}
      </div>

      {/* Selection status + running total */}
      <div className="mt-4">
        {anchor && !value.checkOut && (
          <p className="text-xs text-gray-500">
            Check-in <strong className="text-gray-800">{anchor}</strong> selected —
            pick a check-out ({minNightsHint}-night minimum).
          </p>
        )}
        {inProgress && hoverEnd && !rangeValid && (
          <p className="text-xs text-error">
            That range crosses an unavailable night or is under the {minNightsHint}-night
            minimum.
          </p>
        )}
        {estimate && (
          <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {estimate.checkIn} → {estimate.checkOut} · {estimate.nights} night
                {estimate.nights !== 1 ? 's' : ''}
              </span>
              <span className="font-medium">{formatINR(estimate.subtotal)}</span>
            </div>
            {estimate.cleaningFee > 0 && (
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Cleaning fee</span>
                <span>{formatINR(estimate.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Platform fee + GST</span>
              <span>{formatINR(estimate.platformFee + estimate.gst)}</span>
            </div>
            <div className="border-t border-brand-200 pt-1.5 flex justify-between font-bold">
              <span>Estimated total</span>
              <span>{formatINR(estimate.total)}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Final price confirmed at quote. Taxes shown are platform GST only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
