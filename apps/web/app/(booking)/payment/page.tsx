"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  CreditCard,
  ShieldCheck,
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

export default function PaymentPage() {
  const router = useRouter();

  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentBookingId = params.get("bookingId") ?? "";

    setBookingId(currentBookingId);

    if (!currentBookingId) {
      setError("No booking ID was provided.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBooking() {
      setLoading(true);
      setError("");

      try {
        const result = await getBookingById(currentBookingId);

        if (!cancelled) {
          setBooking(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load this booking.",
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
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted">Loading booking payment details…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <AlertCircle className="mx-auto text-terracotta" size={34} />

          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Unable to open payment
          </h1>

          <p className="mt-2 text-sm text-muted">
            {error || "The booking could not be found."}
          </p>

          {bookingId && (
            <p className="mt-3 break-all font-mono text-xs text-subtle">
              {bookingId}
            </p>
          )}

          <button
            type="button"
            onClick={() => router.push("/traveller")}
            className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  const snapshot = booking.priceSnapshot;
  const total = minorToRupees(snapshot.total);

  return (
    <div className="min-h-screen bg-background pb-24 pt-[72px]">
      <div className="mx-auto max-w-[900px] px-6 py-12 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <h1 className="heading-display text-3xl text-foreground md:text-5xl">
              Complete your payment
            </h1>

            <p className="mt-3 text-muted">
              Your booking has been created and is waiting for payment.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 shrink-0 text-primary" size={20} />

                <div>
                  <h2 className="font-semibold text-foreground">
                    Payment integration pending
                  </h2>

                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    The booking is stored safely, but Razorpay Checkout has not
                    been connected to this frontend page yet. No payment has
                    been collected.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground opacity-50"
              >
                <CreditCard size={17} />
                Pay ₹{total.toLocaleString("en-IN")}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <ShieldCheck size={14} className="text-sage" />
                Payment action disabled until gateway integration is complete
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-[100px] lg:self-start">
            <h2 className="text-lg font-semibold text-foreground">
              Booking summary
            </h2>

            <div className="mt-5 space-y-4 border-b border-border pb-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-subtle">
                  Booking ID
                </p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">
                  {booking.id}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-subtle">
                  Status
                </p>
                <p className="mt-1 font-medium text-primary">
                  {booking.status.replaceAll("_", " ")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-subtle">
                    Check-in
                  </p>
                  <p className="mt-1 text-foreground">
                    {formatDate(booking.startsAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-subtle">
                    Check-out
                  </p>
                  <p className="mt-1 text-foreground">
                    {formatDate(booking.endsAt)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-subtle">
                  Guests
                </p>
                <p className="mt-1 text-foreground">
                  {snapshot.guests}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Accommodation</span>
                <span>
                  ₹{minorToRupees(snapshot.subtotal).toLocaleString("en-IN")}
                </span>
              </div>

              {snapshot.addOnsTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Add-ons</span>
                  <span>
                    ₹
                    {minorToRupees(
                      snapshot.addOnsTotal,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {snapshot.cleaningFee > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Cleaning fee</span>
                  <span>
                    ₹
                    {minorToRupees(
                      snapshot.cleaningFee,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted">
                <span>Platform fee</span>
                <span>
                  ₹
                  {minorToRupees(
                    snapshot.platformFee,
                  ).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between text-muted">
                <span>Taxes</span>
                <span>
                  ₹
                  {minorToRupees(
                    snapshot.gstAmount,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-semibold text-foreground">
                Total
              </span>

              <span className="text-xl font-bold text-primary">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
