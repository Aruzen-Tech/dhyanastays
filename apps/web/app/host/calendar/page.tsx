'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hostAnalyticsApi, listingsApi, formatDate } from '../../../lib/api';
import type { HostCalendarBooking } from '../../../lib/types';

interface ListingOption {
  id: string;
  title: string;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED_PAID: 'bg-green-100 text-green-800 border-green-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  CONFIRMED_DEPOSIT: 'bg-blue-100 text-blue-800 border-blue-300',
  BALANCE_DUE: 'bg-amber-100 text-amber-800 border-amber-300',
  PAYMENT_PENDING: 'bg-gray-100 text-gray-600 border-gray-300',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function bookingOverlapsDay(booking: HostCalendarBooking, day: Date): boolean {
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  // Normalize to date-only comparisons
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const bStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const bEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dayStart >= bStart && dayStart <= bEnd;
}

export default function HostCalendarPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [bookings, setBookings] = useState<HostCalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<HostCalendarBooking | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'HOST') router.push('/dashboard');
  }, [user, isLoading, router]);

  // Load host listings once
  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    listingsApi
      .getHostListings()
      .then((data) => {
        setListings(data.map((l) => ({ id: l.id, title: l.title })));
      })
      .catch(() => {});
  }, [user]);

  // Load calendar bookings when month or filter changes
  useEffect(() => {
    if (!user || user.role !== 'HOST') return;
    setLoading(true);
    setError('');
    const month = getMonthString(currentMonth);
    hostAnalyticsApi
      .getCalendarBookings(month, selectedListingId || undefined)
      .then(setBookings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, currentMonth, selectedListingId]);

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (isLoading || !user) return null;

  // Calendar grid calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = lastDayOfMonth.getDate();
  const today = new Date();

  const monthLabel = currentMonth.toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Build array of day cells (including leading blanks)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const getBookingsForDay = (dayNum: number): HostCalendarBooking[] => {
    const day = new Date(year, month, dayNum);
    return bookings.filter((b) => bookingOverlapsDay(b, day));
  };

  const statusColor = (status: string): string => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-300';
  };

  return (
    <div className="container-page py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()} className="btn-ghost text-sm mb-4">
          &larr; Back
        </button>
        <h1 className="page-title">Booking Calendar</h1>
        <p className="text-gray-500 text-sm mt-1">
          View your bookings across listings in a monthly calendar view.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <button onClick={goToPrevMonth} className="btn-secondary px-3 py-1.5 text-sm">
            &larr; Prev
          </button>
          <span className="font-semibold text-lg min-w-[180px] text-center">{monthLabel}</span>
          <button onClick={goToNextMonth} className="btn-secondary px-3 py-1.5 text-sm">
            Next &rarr;
          </button>
        </div>

        {/* Listing filter */}
        <select
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Listings</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {loading && (
        <div className="text-center py-16">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      )}

      {!loading && (
        <div className="card p-4 overflow-x-auto">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-semibold text-gray-500 uppercase py-2"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {cells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`blank-${idx}`} className="bg-gray-50 min-h-[100px]" />;
              }

              const dayDate = new Date(year, month, dayNum);
              const isToday = isSameDay(dayDate, today);
              const dayBookings = getBookingsForDay(dayNum);

              return (
                <div
                  key={dayNum}
                  className={`bg-white min-h-[100px] p-1.5 flex flex-col ${
                    isToday ? 'ring-2 ring-inset ring-brand-500 bg-brand-50' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-medium mb-1 ${
                      isToday
                        ? 'bg-brand-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : 'text-gray-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[60px]">
                    {dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() =>
                          setSelectedBooking(selectedBooking?.id === b.id ? null : b)
                        }
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate text-left cursor-pointer hover:opacity-80 transition-opacity ${statusColor(b.status)}`}
                        title={`${b.guest.fullName} - ${b.listing.title}`}
                      >
                        {b.guest.fullName.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-200 border border-green-400" />
              Confirmed / Completed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" />
              Deposit Paid
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
              Balance Due
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-200 border border-gray-400" />
              Payment Pending
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && bookings.length === 0 && !error && (
        <div className="text-center py-12 card mt-4">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="font-semibold text-gray-700 mb-2">No bookings this month</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            There are no bookings for {monthLabel}. Try navigating to a different month or changing
            the listing filter.
          </p>
        </div>
      )}

      {/* Selected booking detail popover */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedBooking(null)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Guest:</span>{' '}
                <span className="font-medium">{selectedBooking.guest.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="font-medium">{selectedBooking.guest.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Listing:</span>{' '}
                <span className="font-medium">{selectedBooking.listing.title}</span>
              </div>
              <div>
                <span className="text-gray-500">City:</span>{' '}
                <span className="font-medium">{selectedBooking.listing.city}</span>
              </div>
              <div>
                <span className="text-gray-500">Check-in:</span>{' '}
                <span className="font-medium">{formatDate(selectedBooking.startsAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Check-out:</span>{' '}
                <span className="font-medium">{formatDate(selectedBooking.endsAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${statusColor(selectedBooking.status)}`}
                >
                  {selectedBooking.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBooking(null)}
              className="btn-primary w-full mt-5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
