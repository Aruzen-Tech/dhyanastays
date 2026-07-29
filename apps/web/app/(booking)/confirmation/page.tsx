"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import {
  getBookingById,
  minorToRupees,
  type BookingDetails,
} from "@/lib/booking-api";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMoney(valueMinor: number): string {
  return minorToRupees(valueMinor).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const CONFIRMED_STATUSES = new Set([
  "CONFIRMED_PAID",
  "CONFIRMED_DEPOSIT",
]);

function isConfirmedStatus(status: string): boolean {
  return CONFIRMED_STATUSES.has(status);
}

function ConfirmationLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted">
        Loading booking details…
      </p>
    </div>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    let cancelled = false;

    async function loadBooking() {
      setLoading(true);
      setError("");

      try {
        const result = await getBookingById(bookingId);

        if (!cancelled) {
          setBooking(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the booking.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <AlertCircle
            className="mx-auto text-terracotta"
            size={36}
          />

          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Unable to load booking
          </h1>

          <p className="mt-2 text-sm text-muted">
            No booking ID was provided.
          </p>

          <Link
            href="/traveller/bookings"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View my bookings
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ConfirmationLoadingState />;
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <AlertCircle
            className="mx-auto text-terracotta"
            size={36}
          />

          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Unable to load booking
          </h1>

          <p className="mt-2 text-sm text-muted">
            {error || "The booking could not be found."}
          </p>

          {bookingId && (
            <p className="mt-3 break-all font-mono text-xs text-subtle">
              {bookingId}
            </p>
          )}

          <Link
            href="/traveller/bookings"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View my bookings
          </Link>
        </div>
      </div>
    );
  }

  const location = [
    booking.listing?.city,
    booking.listing?.state,
    booking.listing?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const capturedAmount = (booking.payments ?? [])
    .filter((payment) => payment.status === "CAPTURED")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const snapshot = booking.priceSnapshot;
  const totalAmount = snapshot.total;
  const remainingAmount = Math.max(totalAmount - capturedAmount, 0);
  const confirmed = isConfirmedStatus(booking.status);
  const isPayOnArrivalReservation =
    booking.plan === "PAY_ON_ARRIVAL" &&
    confirmed &&
    capturedAmount === 0;
  const isFullyPaid =
    confirmed &&
    booking.status === "CONFIRMED_PAID" &&
    capturedAmount >= totalAmount;
  const isDepositPaid =
    booking.plan === "DEPOSIT_50" &&
    confirmed &&
    capturedAmount > 0 &&
    capturedAmount < totalAmount;
  const isPayLaterCaptured =
    booking.plan === "PAY_LATER" &&
    confirmed &&
    capturedAmount > 0 &&
    capturedAmount < totalAmount;

  let headline = "Booking awaiting payment";
  let description =
    "Your booking has been created, but payment confirmation is still pending.";
  let statusLabel = formatStatus(booking.status);
  let ctaLabel = "";

  if (isPayOnArrivalReservation) {
    headline = "Reservation confirmed";
    description = "Payment is due at the property.";
    statusLabel = "Pay on arrival";
    ctaLabel = "Payment due at the property";
  } else if (isFullyPaid && booking.plan === "FULL") {
    headline = "Booking confirmed";
    description = "Payment verified";
    statusLabel = "Fully paid";
    ctaLabel = "Payment verified";
  } else if (isDepositPaid) {
    headline = "Booking confirmed";
    description = "Deposit payment verified";
    statusLabel = "Deposit paid";
    ctaLabel = "Deposit payment verified";
  } else if (isPayLaterCaptured) {
    headline = "Booking confirmed";
    description = "First instalment verified";
    statusLabel = "Pay Later";
    ctaLabel = "First instalment verified";
  } else if (confirmed) {
    headline = "Booking confirmed";
    description = "Your booking has been confirmed.";
    statusLabel =
      booking.plan === "PAY_ON_ARRIVAL"
        ? "Pay on arrival"
        : formatStatus(booking.status);
    ctaLabel =
      booking.plan === "PAY_ON_ARRIVAL"
        ? "Payment due at the property"
        : "Booking confirmed";
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[72px]">
      <div className="mx-auto max-w-[800px] px-6 py-16 lg:px-8">
        <div className="mb-12 text-center">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border ${
              confirmed
                ? "border-sage/20 bg-sage/10"
                : "border-primary/20 bg-primary/10"
            }`}
          >
            {confirmed ? (
              <CheckCircle2 size={40} className="text-sage" />
            ) : (
              <Clock size={40} className="text-primary" />
            )}
          </div>

          <h1 className="heading-display mb-4 text-3xl text-foreground md:text-5xl">
            {headline}
          </h1>

          <p className="text-lg text-muted">
            {description}
          </p>

          <div className="mt-4 inline-block rounded-full border border-border bg-surface-hover px-4 py-2 text-sm text-foreground">
            Booking ID:{" "}
            <span className="font-mono text-primary">
              {booking.id}
            </span>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="p-6 md:p-8">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-primary">
              {formatStatus(booking.status)}
            </span>

            <h2 className="text-2xl font-semibold text-foreground">
              {booking.listing?.title || "Dhyana Stays booking"}
            </h2>

            {location && (
              <p className="mt-2 flex items-center gap-1 text-sm text-muted">
                <MapPin size={14} />
                {location}
              </p>
            )}

            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              <div>
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-subtle">
                  <Calendar size={12} />
                  Check-in
                </div>

                <div className="text-sm font-medium text-foreground">
                  {formatDate(booking.startsAt)}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-subtle">
                  <Calendar size={12} />
                  Check-out
                </div>

                <div className="text-sm font-medium text-foreground">
                  {formatDate(booking.endsAt)}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-subtle">
                  <Users size={12} />
                  Guests
                </div>

                <div className="text-sm font-medium text-foreground">
                  {snapshot.guests}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-background p-6 md:p-8">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Payment summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>Booking total</span>
                <span>₹{formatMoney(totalAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-muted">
                <span>Payment plan</span>
                <span>
                  {booking.plan === "PAY_ON_ARRIVAL"
                    ? "Pay on arrival"
                    : formatStatus(booking.plan)}
                </span>
              </div>

              {!isPayOnArrivalReservation && (
                <div className="flex items-center justify-between text-muted">
                  <span>Amount captured</span>
                  <span>
                    ₹{formatMoney(capturedAmount)}
                  </span>
                </div>
              )}

              {(isDepositPaid || isPayLaterCaptured || isPayOnArrivalReservation) &&
                remainingAmount > 0 && (
                  <div className="flex items-center justify-between text-muted">
                    <span>
                      {isPayOnArrivalReservation
                        ? "Amount due at property"
                        : "Remaining amount"}
                    </span>
                    <span>₹{formatMoney(remainingAmount)}</span>
                  </div>
                )}

              {(isDepositPaid || isPayOnArrivalReservation) &&
                booking.balanceDueAt && (
                  <div className="flex items-center justify-between text-muted">
                    <span>
                      {isPayOnArrivalReservation
                        ? "Due at property"
                        : "Balance due"}
                    </span>
                    <span>{formatDate(booking.balanceDueAt)}</span>
                  </div>
                )}

              <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
                <span className="text-foreground">Current status</span>
                <span className={confirmed ? "text-sage" : "text-primary"}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!confirmed ? (
            <Link
              href={`/payment?bookingId=${encodeURIComponent(booking.id)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Continue to payment
            </Link>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-sage/20 bg-sage/10 py-4 text-sm font-medium text-sage">
              {ctaLabel}
            </div>
          )}

          <Link
            href="/traveller/bookings"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground"
          >
            View my bookings
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoadingState />}>
      <ConfirmationContent />
    </Suspense>
  );
}
