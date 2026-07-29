"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  getBookingById,
  getPaymentGatewayConfig,
  initBookingPayment,
  minorToRupees,
  type BookingDetails,
  type BookingPaymentType,
} from "@/lib/booking-api";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: {
    bookingId: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayCheckout {
  open(): void;
  on(
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void,
  ): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const CONFIRMED_STATUSES = new Set([
  "CONFIRMED_PAID",
  "CONFIRMED_DEPOSIT",
]);

function isConfirmed(status: string): boolean {
  return CONFIRMED_STATUSES.has(status);
}

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

function formatStatus(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPaymentType(
  plan: BookingDetails["plan"],
): BookingPaymentType | null {
  if (plan === "FULL") {
    return "FULL";
  }

  if (plan === "DEPOSIT_50") {
    return "DEPOSIT";
  }

  if (plan === "PAY_LATER") {
    return "FULL";
  }

  return null;
}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener(
        "load",
        () => resolve(),
        { once: true },
      );

      existing.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay Checkout.")),
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      reject(new Error("Unable to load Razorpay Checkout."));
    };

    document.body.appendChild(script);
  });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export default function PaymentPage() {
  const router = useRouter();
  const paymentSubmittedRef = useRef(false);

  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [bookingResult, gatewayResult] = await Promise.all([
          getBookingById(currentBookingId),
          getPaymentGatewayConfig(),
        ]);

        if (cancelled) {
          return;
        }

        setBooking(bookingResult);
        setGatewayConfigured(gatewayResult.configured);

        if (isConfirmed(bookingResult.status)) {
          router.replace(
            `/confirmation?bookingId=${encodeURIComponent(
              bookingResult.id,
            )}`,
          );
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

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function pollForConfirmation(): Promise<boolean> {
    if (!booking) {
      return false;
    }

    setVerifying(true);
    setError("");
    setNotice(
      "Payment submitted. Waiting for secure server confirmation…",
    );

    try {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const refreshedBooking = await getBookingById(booking.id);
        setBooking(refreshedBooking);

        if (isConfirmed(refreshedBooking.status)) {
          const storageKey =
            `dhyana-payment-idempotency:${booking.id}`;

          window.sessionStorage.removeItem(storageKey);

          router.replace(
            `/confirmation?bookingId=${encodeURIComponent(
              booking.id,
            )}`,
          );

          return true;
        }

        await wait(2000);
      }

      setNotice(
        "Payment was submitted, but server confirmation is taking longer than expected. Do not make another payment. Check the status again shortly.",
      );

      return false;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify the payment status.",
      );

      return false;
    } finally {
      setVerifying(false);
    }
  }

  async function handlePayment() {
    if (!booking || paying || verifying) {
      return;
    }

    const paymentType = getPaymentType(booking.plan);

    if (!paymentType) {
      router.push(
        `/confirmation?bookingId=${encodeURIComponent(
          booking.id,
        )}`,
      );
      return;
    }

    if (!gatewayConfigured) {
      setError(
        "Razorpay is not configured for this environment.",
      );
      return;
    }

    setPaying(true);
    setError("");
    setNotice("Creating a secure payment order…");
    paymentSubmittedRef.current = false;

    try {
      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable.");
      }

      const storageKey =
        `dhyana-payment-idempotency:${booking.id}`;

      let idempotencyKey =
        window.sessionStorage.getItem(storageKey);

      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        window.sessionStorage.setItem(
          storageKey,
          idempotencyKey,
        );
      }

      const payment = await initBookingPayment({
        bookingId: booking.id,
        type: paymentType,
        idempotencyKey,
      });

      if (
        !payment.keyId ||
        !payment.razorpayOrderId
      ) {
        throw new Error(
          "The payment gateway returned an invalid order.",
        );
      }

      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: "Dhyana Stays",
        description: `Booking ${booking.id}`,
        order_id: payment.razorpayOrderId,
        prefill: {
          name: booking.guestDetails.fullName,
          email: booking.guestDetails.email,
          contact: booking.guestDetails.phone,
        },
        notes: {
          bookingId: booking.id,
        },
        handler: () => {
          paymentSubmittedRef.current = true;
          setPaying(false);
          setPaymentSubmitted(true);
          void pollForConfirmation();
        },
        modal: {
          ondismiss: () => {
            if (!paymentSubmittedRef.current) {
              setPaying(false);
              setNotice(
                "Payment window closed. No payment confirmation was received.",
              );
            }
          },
        },
      });

      checkout.on(
        "payment.failed",
        (response: RazorpayFailureResponse) => {
          paymentSubmittedRef.current = false;
          setPaying(false);
          setVerifying(false);
          setPaymentSubmitted(false);
          setNotice("");

          window.sessionStorage.removeItem(storageKey);

          setError(
            response.error?.description ||
              "The payment failed. No booking confirmation was recorded.",
          );
        },
      );

      setNotice("");
      checkout.open();
    } catch (requestError) {
      setPaying(false);
      setNotice("");

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the payment.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted">
          Loading booking payment details…
        </p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <AlertCircle
            className="mx-auto text-terracotta"
            size={34}
          />

          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Unable to open payment
          </h1>

          <p className="mt-2 text-sm text-muted">
            {error}
          </p>

          {bookingId && (
            <p className="mt-3 break-all font-mono text-xs text-subtle">
              {bookingId}
            </p>
          )}

          <button
            type="button"
            onClick={() => router.push("/traveller/bookings")}
            className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View my bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const snapshot = booking.priceSnapshot;
  const onlinePaymentRequired =
    getPaymentType(booking.plan) !== null;

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
              Your booking has been created and is waiting
              for secure payment confirmation.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start gap-3">
                {gatewayConfigured ? (
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-sage"
                    size={20}
                  />
                ) : (
                  <Clock
                    className="mt-0.5 shrink-0 text-primary"
                    size={20}
                  />
                )}

                <div>
                  <h2 className="font-semibold text-foreground">
                    {gatewayConfigured
                      ? "Secure Razorpay Checkout"
                      : "Payment gateway unavailable"}
                  </h2>

                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {gatewayConfigured
                      ? "Payment is processed through Razorpay. Your booking is confirmed only after the backend verifies the captured payment."
                      : "Razorpay credentials are not configured in this environment. No payment can be collected yet."}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-terracotta/20 bg-terracotta/10 p-4 text-sm text-terracotta">
                  <AlertCircle
                    className="mt-0.5 shrink-0"
                    size={16}
                  />
                  <span>{error}</span>
                </div>
              )}

              {notice && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
                  {verifying ? (
                    <RefreshCw
                      className="mt-0.5 shrink-0 animate-spin text-primary"
                      size={16}
                    />
                  ) : (
                    <Clock
                      className="mt-0.5 shrink-0 text-primary"
                      size={16}
                    />
                  )}

                  <span>{notice}</span>
                </div>
              )}

              {paymentSubmitted ? (
                <button
                  type="button"
                  onClick={() => void pollForConfirmation()}
                  disabled={verifying}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={verifying ? "animate-spin" : ""}
                  />
                  {verifying
                    ? "Checking payment status…"
                    : "Check payment status"}
                </button>
              ) : onlinePaymentRequired ? (
                <button
                  type="button"
                  onClick={() => void handlePayment()}
                  disabled={
                    !gatewayConfigured ||
                    paying ||
                    verifying
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paying ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <CreditCard size={17} />
                  )}

                  {paying
                    ? "Preparing payment…"
                    : "Proceed to secure payment"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/confirmation?bookingId=${encodeURIComponent(
                        booking.id,
                      )}`,
                    )
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground"
                >
                  <CheckCircle2 size={17} />
                  View booking confirmation
                </button>
              )}

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <ShieldCheck size={14} className="text-sage" />
                No success message is shown until the server confirms the booking
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
                  {formatStatus(booking.status)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-subtle">
                  Payment plan
                </p>

                <p className="mt-1 text-foreground">
                  {formatStatus(booking.plan)}
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
                <span>₹{formatMoney(snapshot.subtotal)}</span>
              </div>

              {snapshot.addOnsTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Add-ons</span>
                  <span>₹{formatMoney(snapshot.addOnsTotal)}</span>
                </div>
              )}

              {snapshot.cleaningFee > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Cleaning fee</span>
                  <span>₹{formatMoney(snapshot.cleaningFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted">
                <span>Platform fee</span>
                <span>₹{formatMoney(snapshot.platformFee)}</span>
              </div>

              <div className="flex justify-between text-muted">
                <span>Taxes</span>
                <span>₹{formatMoney(snapshot.gstAmount)}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-semibold text-foreground">
                Booking total
              </span>

              <span className="text-xl font-bold text-primary">
                ₹{formatMoney(snapshot.total)}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
