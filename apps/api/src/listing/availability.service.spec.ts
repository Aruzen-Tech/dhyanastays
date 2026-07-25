import { BadRequestException } from '@nestjs/common';
import { AvailabilityService, DayAvailability } from './availability.service';

/**
 * Day-folding tests. "now" is pinned to 2026-08-10T12:00:00Z so PAST and
 * active-hold logic is deterministic.
 */
const NOW = new Date('2026-08-10T12:00:00.000Z');

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const prismaMock = {
  listing: { findUnique: jest.fn() },
  booking: { findMany: jest.fn() },
  hold: { findMany: jest.fn() },
  availabilityBlock: { findMany: jest.fn() },
  seasonalRate: { findMany: jest.fn() },
};

function svc() {
  return new AvailabilityService(prismaMock as never);
}

function byDate(days: DayAvailability[]) {
  return Object.fromEntries(days.map((x) => [x.date, x]));
}

describe('AvailabilityService.getAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: 'L1',
      rateRules: [{ baseNightlyRate: 500000, minNights: 2 }],
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.hold.findMany.mockResolvedValue([]);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
    prismaMock.seasonalRate.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  it('folds bookings, seasons, blocks, holds and past days over the window', async () => {
    // booking occupies nights 12,13,14; checkout 15 == turnover.
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-15'), status: 'CONFIRMED_PAID' },
    ]);
    // seasonal covers nights 16,17 (endsAt 18 exclusive).
    prismaMock.seasonalRate.findMany.mockResolvedValue([
      { startsAt: d('2026-08-16'), endsAt: d('2026-08-18'), nightlyRate: 700000 },
    ]);
    // host block on night 18.
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { startsAt: d('2026-08-18'), endsAt: d('2026-08-19') },
    ]);
    // active hold on night 19.
    const heldUntil = new Date(NOW.getTime() + 15 * 60_000);
    prismaMock.hold.findMany.mockResolvedValue([
      { startsAt: d('2026-08-19'), endsAt: d('2026-08-20'), expiresAt: heldUntil },
    ]);

    const res = await svc().getAvailability('L1', '2026-08-08', '2026-08-20');
    expect(res.days).toHaveLength(12);
    const m = byDate(res.days);

    // Past (before today 08-10)
    expect(m['2026-08-08'].state).toBe('PAST');
    expect(m['2026-08-09'].state).toBe('PAST');

    // Today + open days at base price
    expect(m['2026-08-10'].state).toBe('AVAILABLE');
    expect(m['2026-08-10'].priceMinor).toBe(500000);
    expect(m['2026-08-10'].minNights).toBe(2);
    expect(m['2026-08-11'].state).toBe('AVAILABLE');

    // Booked nights (half-open)
    expect(m['2026-08-12'].state).toBe('BOOKED');
    expect(m['2026-08-13'].state).toBe('BOOKED');
    expect(m['2026-08-14'].state).toBe('BOOKED');

    // Checkout morning is available AND flagged as a turnover day
    expect(m['2026-08-15'].state).toBe('AVAILABLE');
    expect(m['2026-08-15'].isTurnover).toBe(true);

    // Seasonal price + flag
    expect(m['2026-08-16'].state).toBe('AVAILABLE');
    expect(m['2026-08-16'].priceMinor).toBe(700000);
    expect(m['2026-08-16'].isSeasonal).toBe(true);
    expect(m['2026-08-17'].priceMinor).toBe(700000);

    // Block wins; season no longer covers 18 so price falls back to base
    expect(m['2026-08-18'].state).toBe('BLOCKED');
    expect(m['2026-08-18'].isSeasonal).toBe(false);
    expect(m['2026-08-18'].priceMinor).toBe(500000);

    // Active hold exposes heldUntil
    expect(m['2026-08-19'].state).toBe('HELD');
    expect(m['2026-08-19'].heldUntil).toBe(heldUntil.toISOString());

    // `to` (08-20) is exclusive
    expect(m['2026-08-20']).toBeUndefined();
  });

  it('booking takes priority over an overlapping block on the same night', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-13'), status: 'CONFIRMED_PAID' },
    ]);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-13') },
    ]);
    const res = await svc().getAvailability('L1', '2026-08-12', '2026-08-13');
    expect(res.days[0].state).toBe('BOOKED');
    expect(res.days[0].isTurnover).toBe(false);
  });

  it('does not mark a turnover when another booking starts the same day', async () => {
    // back-to-back: one ends 08-15, another starts 08-15
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-15'), status: 'CONFIRMED_PAID' },
      { startsAt: d('2026-08-15'), endsAt: d('2026-08-18'), status: 'CONFIRMED_PAID' },
    ]);
    const res = await svc().getAvailability('L1', '2026-08-15', '2026-08-16');
    expect(res.days[0].state).toBe('BOOKED');
    expect(res.days[0].isTurnover).toBe(false);
  });

  it('shows a PAYMENT_PENDING booking as HELD, not BOOKED (only confirmed reads booked)', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-14'), status: 'PAYMENT_PENDING' },
    ]);
    const res = await svc().getAvailability('L1', '2026-08-12', '2026-08-14');
    expect(res.days.map((x) => x.state)).toEqual(['HELD', 'HELD']);
  });

  it('shows a confirmed-deposit booking as BOOKED', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-14'), status: 'CONFIRMED_DEPOSIT' },
    ]);
    const res = await svc().getAvailability('L1', '2026-08-12', '2026-08-14');
    expect(res.days.map((x) => x.state)).toEqual(['BOOKED', 'BOOKED']);
  });

  it('defaults minNights to 1 when the listing has no rate rule', async () => {
    prismaMock.listing.findUnique.mockResolvedValue({ id: 'L1', rateRules: [] });
    const res = await svc().getAvailability('L1', '2026-08-10', '2026-08-11');
    expect(res.days[0].minNights).toBe(1);
    expect(res.days[0].priceMinor).toBe(0);
  });

  it('rejects an out-of-range window', async () => {
    await expect(
      svc().getAvailability('L1', '2026-01-01', '2026-12-31'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects to <= from and malformed dates', async () => {
    await expect(
      svc().getAvailability('L1', '2026-08-10', '2026-08-10'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc().getAvailability('L1', 'not-a-date', '2026-08-11'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the listing does not exist', async () => {
    prismaMock.listing.findUnique.mockResolvedValue(null);
    await expect(
      svc().getAvailability('missing', '2026-08-10', '2026-08-11'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AvailabilityService.buildIcsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    prismaMock.listing.findUnique.mockResolvedValue({ id: 'L1', title: 'Forest Villa' });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it('merges adjacent booking + block spans into one all-day event and leaks no PII', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { startsAt: d('2026-08-12'), endsAt: d('2026-08-15') },
    ]);
    prismaMock.availabilityBlock.findMany.mockResolvedValue([
      { startsAt: d('2026-08-14'), endsAt: d('2026-08-18') },
    ]);
    const ics = await svc().buildIcsFeed('L1');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260812');
    expect(ics).toContain('DTEND;VALUE=DATE:20260818'); // merged, exclusive
    expect(ics).toContain('SUMMARY:Unavailable');
    // exactly one merged event
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    // no guest/booking detail
    expect(ics.toLowerCase()).not.toContain('guest');
  });

  it('emits a calendar with no events when nothing is busy', async () => {
    const ics = await svc().buildIcsFeed('L1');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
