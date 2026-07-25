'use client';

import { ReactNode } from 'react';
import { WEEKDAY_LABELS, monthCells, monthLabel } from './calendarUtils';

interface MonthGridProps {
  /** First-of-month date for the month to render. */
  monthStart: Date;
  /** Renders the inner content of a single day cell. */
  renderDay: (date: Date) => ReactNode;
  /** Optional heading override; defaults to "August 2026". */
  heading?: string;
  className?: string;
}

/**
 * Presentational month grid: weekday header + 7-column day matrix with
 * leading blank pads. All colour/interaction lives in `renderDay`, so guest,
 * host and admin calendars share this exact geometry. (Extracted from the
 * host calendar's hand-rolled grid.)
 */
export default function MonthGrid({
  monthStart,
  renderDay,
  heading,
  className = '',
}: MonthGridProps) {
  const cells = monthCells(monthStart);
  return (
    <div className={className}>
      <div className="text-center font-semibold text-gray-800 mb-2">
        {heading ?? monthLabel(monthStart)}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) =>
          date === null ? (
            <div key={`blank-${idx}`} aria-hidden />
          ) : (
            <div key={date.toISOString()}>{renderDay(date)}</div>
          ),
        )}
      </div>
    </div>
  );
}
