import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Per-day availability aggregation for a listing's calendar (guest, host, admin).
 *
 * "Occupied" uses the EXACT same status set + half-open range rule the booking
 * engine enforces on confirm (booking.service.ts overlap backstop), so the
 * calendar never disagrees with what a booking will actually accept:
 *   a booking [checkIn, checkOut) occupies nights checkIn … checkOut−1;
 *   the checkout day itself is a TURNOVER day — bookable as a new arrival.
 *
 * The public payload is PII-free (states + prices only). Host/admin can layer
 * booking detail on top from their own endpoints.
 */

// A booking only reads as BOOKED once it is CONFIRMED (a deposit or the full
// amount has been paid) — or the guest has checked in / a balance is due on a
// confirmed stay. Until then it is not "booked".
const CONFIRMED_STATUSES = [
  'CONFIRMED_DEPOSIT',
  'CONFIRMED_PAID',
  'BALANCE_DUE',
  'CHECKED_IN',
] as const;

// PAYMENT_PENDING is a soft, unconfirmed reservation (payment not completed).
// It occupies the dates for overlap purposes (so nobody can double-book) but is
// shown as a transient HOLD, never as BOOKED — the same way a raw Hold is.
const PENDING_STATUSES = ['PAYMENT_PENDING'] as const;

// Everything that occupies a date for overlap/turnover. Matches the engine's
// confirm-time overlap set, so the calendar never offers a date a booking would
// reject; the STATE it renders (BOOKED vs HELD) is decided per-status below.
const OCCUPIED_STATUSES = [...CONFIRMED_STATUSES, ...PENDING_STATUSES] as const;

export type DayState = 'PAST' | 'AVAILABLE' | 'BOOKED' | 'HELD' | 'BLOCKED';

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  state: DayState;
  priceMinor: number; // nightly rate for this day (seasonal override or base), paise
  isSeasonal: boolean;
  isTurnover: boolean; // a checkout-morning day: occupied booking ends here, open as an arrival
  minNights: number;
  heldUntil?: string; // ISO, only when state === HELD
}

const DAY_MS = 86_400_000;
const MAX_WINDOW_DAYS = 120;

/** Calendar day key in UTC (bookings are stored as UTC instants). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Floor a Date to its UTC midnight. */
function floorDay(d: Date): number {
  return Math.floor(d.getTime() / DAY_MS);
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build the per-day availability for [from, to] (inclusive of `from`,
   * exclusive of `to` — `to` is the last checkout day shown). Window capped.
   */
  async getAvailability(
    listingId: string,
    fromStr: string,
    toStr: string,
  ): Promise<{ listingId: string; from: string; to: string; days: DayAvailability[] }> {
    const from = new Date(`${fromStr}T00:00:00.000Z`);
    const to = new Date(`${toStr}T00:00:00.000Z`);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('from/to must be YYYY-MM-DD dates');
    }
    if (to <= from) throw new BadRequestException('to must be after from');
    const span = Math.round((to.getTime() - from.getTime()) / DAY_MS);
    if (span > MAX_WINDOW_DAYS) {
      throw new BadRequestException(`window too large (max ${MAX_WINDOW_DAYS} days)`);
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, rateRules: { take: 1 } },
    });
    if (!listing) throw new BadRequestException('Listing not found');
    const rule = listing.rateRules[0];
    const baseRate = rule?.baseNightlyRate ?? 0;
    const minNights = rule?.minNights ?? 1;

    const now = new Date();
    const [bookings, holds, blocks, seasonal] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { in: [...OCCUPIED_STATUSES] },
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { startsAt: true, endsAt: true, status: true },
      }),
      this.prisma.hold.findMany({
        where: { listingId, expiresAt: { gt: now }, startsAt: { lt: to }, endsAt: { gt: from } },
        select: { startsAt: true, endsAt: true, expiresAt: true },
      }),
      this.prisma.availabilityBlock.findMany({
        where: { listingId, startsAt: { lt: to }, endsAt: { gt: from } },
        select: { startsAt: true, endsAt: true },
      }),
      this.prisma.seasonalRate.findMany({
        where: { listingId, startsAt: { lt: to }, endsAt: { gt: from } },
        select: { startsAt: true, endsAt: true, nightlyRate: true },
      }),
    ]);

    // Confirmed bookings are the only ones that read as BOOKED; pending ones are
    // treated as transient holds.
    const confirmedBookings = bookings.filter((b) =>
      (CONFIRMED_STATUSES as readonly string[]).includes(b.status),
    );
    const pendingBookings = bookings.filter((b) =>
      (PENDING_STATUSES as readonly string[]).includes(b.status),
    );

    // Pre-compute checkout (turnover) day-keys from ALL occupying bookings.
    const checkoutDays = new Set(bookings.map((b) => floorDay(b.endsAt)));

    const todayKey = floorDay(now);
    const days: DayAvailability[] = [];

    for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) {
      const day = new Date(t);
      const dnum = floorDay(day);
      const covers = (s: Date, e: Date) => floorDay(s) <= dnum && dnum < floorDay(e);

      // Price: latest seasonal range covering this day wins, else base.
      const season = seasonal.find((s) => covers(s.startsAt, s.endsAt));
      const priceMinor = season?.nightlyRate ?? baseRate;

      const booked = confirmedBookings.some((b) => covers(b.startsAt, b.endsAt));
      const blocked = blocks.some((b) => covers(b.startsAt, b.endsAt));
      const activeHold = holds.find((h) => covers(h.startsAt, h.endsAt));
      // A pending-payment booking soft-holds the date until it confirms.
      const pending = pendingBookings.some((b) => covers(b.startsAt, b.endsAt));

      let state: DayState;
      if (dnum < todayKey) state = 'PAST';
      else if (booked) state = 'BOOKED'; // confirmed only
      else if (blocked) state = 'BLOCKED';
      else if (pending || activeHold) state = 'HELD'; // transient — not yet booked
      else state = 'AVAILABLE';

      // Turnover: a stay checks out this morning and the day is otherwise open.
      const isTurnover = checkoutDays.has(dnum) && state === 'AVAILABLE';

      days.push({
        date: dayKey(day),
        state,
        priceMinor,
        isSeasonal: !!season,
        isTurnover,
        minNights,
        ...(state === 'HELD' && activeHold
          ? { heldUntil: activeHold.expiresAt.toISOString() }
          : {}),
      });
    }

    return { listingId, from: fromStr, to: toStr, days };
  }

  /**
   * Outbound iCal (.ics) busy feed for a listing — bookings + host blocks as
   * opaque all-day "Unavailable" events over the next year. PII-free (no guest
   * or booking detail), consistent with the public availability payload. Import
   * this URL into Airbnb/Booking.com/Google Calendar to mirror our bookings.
   */
  async buildIcsFeed(listingId: string): Promise<string> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true },
    });
    if (!listing) throw new BadRequestException('Listing not found');

    const now = new Date();
    const horizon = new Date(now.getTime() + 366 * DAY_MS);
    const [bookings, blocks] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { in: [...OCCUPIED_STATUSES] },
          endsAt: { gt: now },
          startsAt: { lt: horizon },
        },
        select: { startsAt: true, endsAt: true },
      }),
      this.prisma.availabilityBlock.findMany({
        where: { listingId, endsAt: { gt: now }, startsAt: { lt: horizon } },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    // Merge all busy spans (as [startDay, endDayExclusive)) into disjoint ranges.
    const spans = [...bookings, ...blocks]
      .map((r) => [floorDay(r.startsAt), floorDay(r.endsAt)] as [number, number])
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of spans) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    }

    const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const icsDate = (dayNum: number) =>
      new Date(dayNum * DAY_MS).toISOString().slice(0, 10).replace(/-/g, '');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dhyana Stays//Availability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${listing.title} — Unavailable`,
    ];
    for (const [s, e] of merged) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${listingId}-${s}@dhyanastays`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(s)}`,
        `DTEND;VALUE=DATE:${icsDate(e)}`, // exclusive — matches our half-open range
        'SUMMARY:Unavailable',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
}
