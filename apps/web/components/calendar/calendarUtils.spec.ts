import { describe, expect, it } from 'vitest';
import {
  cheapestWindow,
  estimateTotal,
  isSelectableRange,
  monthCells,
  nights,
  sumNightly,
  toDayMap,
} from './calendarUtils';
import type { DayAvailability } from '../../lib/types';

function day(
  date: string,
  state: DayAvailability['state'],
  priceMinor = 500000,
  extra: Partial<DayAvailability> = {},
): DayAvailability {
  return {
    date,
    state,
    priceMinor,
    isSeasonal: false,
    isTurnover: false,
    minNights: 2,
    ...extra,
  };
}

// A small window: 10 available, 11 available, 12 booked, 13 available(turnover), 14 available(seasonal 700k)
const sample = toDayMap([
  day('2026-08-10', 'AVAILABLE'),
  day('2026-08-11', 'AVAILABLE'),
  day('2026-08-12', 'BOOKED'),
  day('2026-08-13', 'AVAILABLE', 500000, { isTurnover: true }),
  day('2026-08-14', 'AVAILABLE', 700000, { isSeasonal: true }),
  day('2026-08-15', 'AVAILABLE'),
]);

describe('nights', () => {
  it('counts half-open nights', () => {
    expect(nights('2026-08-10', '2026-08-12')).toBe(2);
    expect(nights('2026-08-10', '2026-08-10')).toBe(0);
  });
});

describe('isSelectableRange', () => {
  it('accepts a fully-available range that meets minNights', () => {
    expect(isSelectableRange(sample, '2026-08-10', '2026-08-12')).toBe(true);
  });
  it('rejects a range that crosses a booked night', () => {
    expect(isSelectableRange(sample, '2026-08-11', '2026-08-14')).toBe(false);
  });
  it('rejects a range shorter than minNights', () => {
    expect(isSelectableRange(sample, '2026-08-10', '2026-08-11')).toBe(false);
  });
  it('allows checking out on a booked day (leave in the morning)', () => {
    // nights 10,11 available; checkout 12 is BOOKED but not a night we occupy
    expect(isSelectableRange(sample, '2026-08-10', '2026-08-12')).toBe(true);
  });
  it('allows a range starting on a turnover day', () => {
    expect(isSelectableRange(sample, '2026-08-13', '2026-08-15')).toBe(true);
  });
});

describe('sumNightly', () => {
  it('sums per-night prices including seasonal', () => {
    expect(sumNightly(sample, '2026-08-13', '2026-08-15')).toBe(500000 + 700000);
  });
});

describe('estimateTotal', () => {
  it('mirrors the server formula (fee on subtotal+cleaning, gst on fee)', () => {
    const e = estimateTotal(sample, '2026-08-10', '2026-08-12', 100000);
    // subtotal 1,000,000 + cleaning 100,000 → fee 10% = 110,000; gst 18% of fee = 19,800
    expect(e.subtotal).toBe(1000000);
    expect(e.platformFee).toBe(110000);
    expect(e.gst).toBe(19800);
    expect(e.total).toBe(1000000 + 100000 + 110000 + 19800);
    expect(e.nights).toBe(2);
  });
});

describe('cheapestWindow', () => {
  it('finds the lowest-subtotal valid 2-night window', () => {
    const ordered = [
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
    ];
    const best = cheapestWindow(sample, 2, ordered);
    // 10→12 (1,000,000) is valid and cheaper than 13→15 (1,200,000).
    expect(best?.checkIn).toBe('2026-08-10');
    expect(best?.subtotal).toBe(1000000);
  });
  it('returns null when no window fits', () => {
    const tiny = toDayMap([day('2026-08-10', 'AVAILABLE')]);
    expect(cheapestWindow(tiny, 3, ['2026-08-10'])).toBeNull();
  });
});

describe('monthCells', () => {
  it('pads leading blanks so the 1st lands on its weekday', () => {
    // August 2026: 1st is a Saturday (dow 6) → 6 blanks then 31 days.
    const cells = monthCells(new Date(2026, 7, 1));
    const blanks = cells.filter((c) => c === null).length;
    const days = cells.filter((c) => c !== null).length;
    expect(blanks).toBe(6);
    expect(days).toBe(31);
  });
});
