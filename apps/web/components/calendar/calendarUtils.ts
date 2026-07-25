// Shared, framework-free helpers for the interactive availability calendars
// (guest / host / admin). Pure functions only — unit-tested in calendarUtils.test.ts.

import type { DayAvailability } from '../../lib/types';

export const DAY_MS = 86_400_000;
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** YYYY-MM-DD → integer day index (UTC midnight / DAY_MS). NaN if unparseable. */
export function dayIndex(dateStr: string): number {
  const t = Date.parse(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(t) ? NaN : Math.floor(t / DAY_MS);
}

/** integer day index → YYYY-MM-DD. */
export function indexToStr(idx: number): string {
  return new Date(idx * DAY_MS).toISOString().slice(0, 10);
}

/** A Date (local) → YYYY-MM-DD using its local Y/M/D (calendar day the user sees). */
export function localDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD in the viewer's local calendar. */
export function todayStr(): string {
  return localDayStr(new Date());
}

/** First day of the month containing `d`, at local midnight. */
export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Add `n` months to a first-of-month date. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Cells for a month grid: leading blanks (to align the 1st under its weekday)
 * then one entry per day. `null` = blank pad cell.
 */
export function monthCells(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const startDow = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/** Number of nights between two YYYY-MM-DD strings (checkout − checkin). */
export function nights(checkIn: string, checkOut: string): number {
  return dayIndex(checkOut) - dayIndex(checkIn);
}

/** Inclusive list of YYYY-MM-DD between two dates (order-independent). */
export function datesInclusive(a: string, b: string): string[] {
  const lo = Math.min(dayIndex(a), dayIndex(b));
  const hi = Math.max(dayIndex(a), dayIndex(b));
  const out: string[] = [];
  for (let i = lo; i <= hi; i++) out.push(indexToStr(i));
  return out;
}

export type DayMap = Map<string, DayAvailability>;

export function toDayMap(days: DayAvailability[]): DayMap {
  return new Map(days.map((d) => [d.date, d]));
}

/**
 * Is [checkIn, checkOut) a bookable range given the availability map?
 * Mirrors the server: every NIGHT in [checkIn, checkOut) must be AVAILABLE
 * (the checkout morning itself need not be — you leave that day), and the
 * length must satisfy the check-in day's minNights.
 */
export function isSelectableRange(
  map: DayMap,
  checkIn: string,
  checkOut: string,
): boolean {
  const start = dayIndex(checkIn);
  const end = dayIndex(checkOut);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return false;

  const anchor = map.get(checkIn);
  const minN = anchor?.minNights ?? 1;
  if (end - start < minN) return false;

  for (let i = start; i < end; i++) {
    const day = map.get(indexToStr(i));
    if (!day || day.state !== 'AVAILABLE') return false;
  }
  return true;
}

/** Sum of nightly prices for the nights in [checkIn, checkOut). */
export function sumNightly(map: DayMap, checkIn: string, checkOut: string): number {
  const start = dayIndex(checkIn);
  const end = dayIndex(checkOut);
  let total = 0;
  for (let i = start; i < end; i++) {
    total += map.get(indexToStr(i))?.priceMinor ?? 0;
  }
  return total;
}

export interface EstimateBreakdown {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  platformFee: number;
  gst: number;
  total: number;
}

/**
 * Client-side estimate that mirrors PricingService for the no-add-on,
 * no-loyalty case (the authoritative quote still comes from the server):
 *   platformFee = round((subtotal + cleaning) × feeRate)
 *   gst         = round(platformFee × gstRate)
 *   total       = subtotal + cleaning + platformFee + gst
 */
export function estimateTotal(
  map: DayMap,
  checkIn: string,
  checkOut: string,
  cleaningFee: number,
  feeRate = 0.1,
  gstRate = 0.18,
): EstimateBreakdown {
  const n = nights(checkIn, checkOut);
  const subtotal = sumNightly(map, checkIn, checkOut);
  const platformFee = Math.round((subtotal + cleaningFee) * feeRate);
  const gst = Math.round(platformFee * gstRate);
  return {
    nights: n,
    subtotal,
    cleaningFee,
    platformFee,
    gst,
    total: subtotal + cleaningFee + platformFee + gst,
  };
}

/**
 * Cheapest valid `stayNights`-night window within [windowStart, windowEnd]
 * of the map. Returns the check-in date of the lowest-subtotal selectable
 * range, or null if none exists. (P4 flexible-dates.)
 */
export function cheapestWindow(
  map: DayMap,
  stayNights: number,
  orderedDates: string[],
): { checkIn: string; checkOut: string; subtotal: number } | null {
  let best: { checkIn: string; checkOut: string; subtotal: number } | null = null;
  for (const checkIn of orderedDates) {
    const checkOut = indexToStr(dayIndex(checkIn) + stayNights);
    if (!isSelectableRange(map, checkIn, checkOut)) continue;
    const subtotal = sumNightly(map, checkIn, checkOut);
    if (!best || subtotal < best.subtotal) best = { checkIn, checkOut, subtotal };
  }
  return best;
}
