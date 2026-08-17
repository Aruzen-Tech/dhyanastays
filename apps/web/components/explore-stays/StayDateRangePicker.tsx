'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from './icons';

/*
 * ─── Why this is not <input type="date"> ─────────────────────────────────
 * The native date input renders the operating system's own calendar popup:
 * its size, typography, week layout and accent colour are browser-controlled
 * and unreachable from CSS. It also has no concept of a *range* — two native
 * inputs cannot highlight the nights between them, which is the whole point
 * of a stay picker. So it is drawn here.
 *
 * The value contract is unchanged from the inputs this replaced: check-in and
 * check-out are read and emitted as `yyyy-mm-dd` strings, and both remain the
 * decorative local-only state described in the ExploreHero docblock. Neither
 * is read by runSearch; no search or API behaviour is involved.
 */

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MS_PER_DAY = 86_400_000;

const pad = (value: number) => `${value}`.padStart(2, '0');

/** Local-time ISO. Deliberately not toISOString(), which converts to UTC and
 *  can shift the date by a day either side of midnight. */
function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromISO(value: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return null;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Hand-formatted rather than toLocaleDateString: the latter resolves against
 *  the runtime's locale, which differs between server and browser and would
 *  produce a hydration mismatch. */
function formatShort(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Month containing `date`, normalised to the 1st — the unit month paging
 *  works in, so comparisons never trip over differing day-of-month. */
function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

type Field = 'checkIn' | 'checkOut';

/** One month's grid. Split out so the popover can render two of them side by
 *  side on desktop and drop the second on narrow screens. */
function MonthGrid({
  month,
  minDate,
  start,
  end,
  onPick,
  onHover,
}: {
  month: Date;
  minDate: Date;
  start: Date | null;
  end: Date | null;
  onPick: (date: Date) => void;
  onHover: (date: Date | null) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = startOfToday();

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = useMemo(() => {
    const leadingBlanks = new Date(year, monthIndex, 1).getDay();
    const total = new Date(year, monthIndex + 1, 0).getDate();
    const days: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= total; day += 1) days.push(new Date(year, monthIndex, day));
    return days;
  }, [year, monthIndex]);

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-3 text-center text-[15px] font-semibold text-gray-900">
        {MONTH_LABELS[monthIndex]} {year}
      </p>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((weekday, index) => (
          <span
            key={`${weekday}-${index}`}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-gray-400"
          >
            {weekday}
          </span>
        ))}

        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} aria-hidden="true" className="h-9" />;

          const isDisabled = date < minDate;
          const isStart = !!start && sameDay(date, start);
          const isEnd = !!end && sameDay(date, end);
          const isBetween = !!start && !!end && date > start && date < end;
          const inBand = isStart || isEnd || isBetween;

          // A multi-week range renders as one band segment per row, and each
          // segment needs its own caps — otherwise it is only rounded where
          // the range begins and ends, and every row in between is cut square
          // at the Sunday and Saturday edges. That is the boxy slab: it is not
          // one shape, it is several rectangles stacked. The first and last
          // day of the month are caps too, since the band stops there.
          const weekday = date.getDay();
          const capLeft = isStart || weekday === 0 || date.getDate() === 1;
          const capRight = isEnd || weekday === 6 || date.getDate() === daysInMonth;

          return (
            // The band background lives on the wrapper, not the button, so
            // consecutive days butt together into one continuous bar; the
            // endpoints then sit on top of it as filled, rounded chips.
            <div
              key={toISO(date)}
              className={`h-9 ${inBand ? 'bg-brand-50' : ''} ${
                inBand && capLeft ? 'rounded-l-full' : ''
              } ${inBand && capRight ? 'rounded-r-full' : ''}`}
            >
              <button
                type="button"
                disabled={isDisabled}
                aria-label={`${date.getDate()} ${MONTH_LABELS[monthIndex]} ${year}`}
                aria-pressed={isStart || isEnd}
                onClick={() => onPick(date)}
                onMouseEnter={() => onHover(date)}
                onMouseLeave={() => onHover(null)}
                className={`relative flex h-9 w-full items-center justify-center rounded-full text-[13px] tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 ${
                  isStart || isEnd
                    ? 'bg-brand-700 font-semibold text-white'
                    : isDisabled
                      ? 'cursor-not-allowed text-gray-300'
                      : isBetween
                        ? 'font-medium text-brand-800'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {date.getDate()}
                {sameDay(date, today) && !isStart && !isEnd && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-700"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  /** `yyyy-mm-dd`, or '' for no selection. */
  checkIn: string;
  checkOut: string;
  onChange: (next: { checkIn: string; checkOut: string }) => void;
}

/**
 * Check-in / check-out pills sharing one two-month range calendar.
 *
 * Both triggers open the same popover — that is what lets the nights between
 * them be drawn as a continuous band, which two independent single-date
 * fields structurally cannot do. Which pill was clicked only decides which
 * end of the range the next click fills.
 */
export default function StayDateRangePicker({ checkIn, checkOut, onChange }: Props) {
  const [openField, setOpenField] = useState<Field | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const start = useMemo(() => fromISO(checkIn), [checkIn]);
  const end = useMemo(() => fromISO(checkOut), [checkOut]);
  const minDate = useMemo(startOfToday, []);

  const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(start ?? startOfToday()));

  const isOpen = openField !== null;

  const close = useCallback(() => {
    setOpenField(null);
    setHovered(null);
  }, []);

  // Opening jumps to the month the range already lives in, so reopening a
  // filled picker lands where the user left it rather than on today.
  useEffect(() => {
    if (!isOpen) return;
    setViewMonth(monthStart((openField === 'checkOut' ? end ?? start : start) ?? startOfToday()));
    // Only when the popover opens or switches field — not on every keystroke
    // of the range itself, which would yank the view mid-selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openField]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  const handlePick = (date: Date) => {
    const startingFresh = openField === 'checkIn' || !start || (!!start && !!end);

    // A click at or before the current check-in restarts the range rather
    // than producing a backwards one.
    if (startingFresh || date <= start!) {
      onChange({ checkIn: toISO(date), checkOut: '' });
      setOpenField('checkOut');
      return;
    }

    onChange({ checkIn, checkOut: toISO(date) });
    close();
  };

  const handleClear = () => {
    onChange({ checkIn: '', checkOut: '' });
    setOpenField('checkIn');
    setHovered(null);
  };

  // Preview the nights the pointer is currently offering, so the band grows
  // under the cursor before the second click commits it.
  const previewEnd = end ?? (start && hovered && hovered > start ? hovered : null);
  const nights =
    start && previewEnd ? Math.round((previewEnd.getTime() - start.getTime()) / MS_PER_DAY) : 0;

  const secondMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const canGoBack = viewMonth > monthStart(minDate);

  const status = !start ? (
    'Select your check-in date'
  ) : !end ? (
    <>
      <span className="font-semibold text-gray-900">{formatShort(start)}</span> selected — pick
      check-out
    </>
  ) : (
    <>
      <span className="font-semibold text-gray-900">
        {formatShort(start)} – {formatShort(end)}
      </span>{' '}
      · {nights} {nights === 1 ? 'night' : 'nights'}
    </>
  );

  const triggerClass = (field: Field) =>
    `flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 ${
      openField === field ? 'bg-brand-50 ring-1 ring-brand-100' : 'hover:bg-gray-50'
    }`;

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpenField((current) => (current === 'checkIn' ? null : 'checkIn'))}
          aria-haspopup="dialog"
          aria-expanded={openField === 'checkIn'}
          className={triggerClass('checkIn')}
        >
          <IconCalendar className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Check-in
            </span>
            <span
              className={`block truncate text-xs font-medium ${start ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {start ? formatShort(start) : 'Add date'}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpenField((current) => (current === 'checkOut' ? null : 'checkOut'))}
          aria-haspopup="dialog"
          aria-expanded={openField === 'checkOut'}
          className={triggerClass('checkOut')}
        >
          <IconCalendar className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Check-out
            </span>
            <span
              className={`block truncate text-xs font-medium ${end ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {end ? formatShort(end) : 'Add date'}
            </span>
          </span>
        </button>
      </div>

      {isOpen && (
        /* Positioning lives on this wrapper and the entrance animation on the
           panel inside it — never both on one element. `animate-scale-in`
           animates `transform` with fill-mode `both`, so its final frame
           (`scale(1)`) permanently overwrites any `-translate-x-1/2` utility
           sharing the element, leaving the panel pinned at `left: 50%` and
           hanging off the right edge. Same split MoreMenu.tsx uses. */
        <div className="absolute left-0 top-full z-50 mt-3 md:left-1/2 md:-translate-x-1/2">
          <div
            role="dialog"
            aria-label="Select dates"
            /* Same restrained shadow language as the stay cards — spreads set
               well below half their blur so the shadow clears the left and
               right edges and only falls beneath the panel. Two layers: a
               short contact shadow to seat it, and a longer soft one for
               depth. No tilt or lift here; a popover that moves while you are
               aiming at a date is a nuisance, not an effect. */
            className="w-[300px] max-w-[calc(100vw-2rem)] rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_4px_8px_-6px_rgba(17,24,39,0.12),0_14px_24px_-18px_rgba(17,24,39,0.30)] animate-scale-in sm:p-5 md:w-[600px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                disabled={!canGoBack}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
  
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                Select dates
              </p>
  
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
  
            <div className="flex gap-6">
              <MonthGrid
                month={viewMonth}
                minDate={minDate}
                start={start}
                end={previewEnd}
                onPick={handlePick}
                onHover={setHovered}
              />
              {/* Second month appears only once the panel widens to 600px at
                  `md` — the same breakpoint the search strip becomes a row. At
                  300px there is no room for it, and paging one month at a time
                  covers the same ground. */}
              <div className="hidden min-w-0 flex-1 md:block">
                <MonthGrid
                  month={secondMonth}
                  minDate={minDate}
                  start={start}
                  end={previewEnd}
                  onPick={handlePick}
                  onHover={setHovered}
                />
              </div>
            </div>
  
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
              <p aria-live="polite" className="min-w-0 truncate text-[13px] text-gray-500">
                {status}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
                >
                  Clear
                </button>
                <button type="button" onClick={close} className="btn-primary px-5 py-2 text-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
