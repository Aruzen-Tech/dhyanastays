"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Users,
  CreditCard,
  ChevronRight,
  Info,
  Star,
  MapPin,
  Wifi,
  Coffee,
  ShieldCheck,
  Minus,
  Plus,
  Clock,
  Check,
} from "lucide-react";
import { getPublicListingById } from "@/lib/api";
import type { Property } from "@/lib/types";
import {
  createBooking,
  createBookingHold,
  createPricingQuote,
  getActiveBookingHold,
  getListingAddOns,
  getListingAvailability,
  minorToRupees,
  type BookingHold,
  type BookingPaymentPlan,
  type PriceSnapshot,
  type PublicListingAddOn,
} from "@/lib/booking-api";

const DAY_MS = 86_400_000;

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

function formatBookingDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function getPayLaterEligibility(
  checkIn: string,
  months: 3 | 6 | 12,
  startFrom: Date = new Date(),
): {
  eligible: boolean;
  finalDueAt: Date;
  cutoffAt: Date;
} {
  const finalDueAt = new Date(startFrom);

  // Instalment 1 is due now. The final instalment is therefore
  // due after months - 1 monthly intervals.
  finalDueAt.setUTCMonth(
    finalDueAt.getUTCMonth() + months - 1,
  );

  const cutoffAt = new Date(
    finalDueAt.getTime() + DAY_MS,
  );

  const checkInAt = new Date(
    `${checkIn}T00:00:00.000Z`,
  );

  return {
    eligible:
      !Number.isNaN(checkInAt.getTime()) &&
      checkInAt.getTime() >= cutoffAt.getTime(),
    finalDueAt,
    cutoffAt,
  };
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [listingLoading, setListingLoading] = useState(true);
  const [listingError, setListingError] = useState("");

  const [step, setStep] = useState(1);
  const [paymentPlan, setPaymentPlan] =
    useState<BookingPaymentPlan>("FULL");
  const [payLaterMonths, setPayLaterMonths] =
    useState<3 | 6 | 12>(3);

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [availableAddOns, setAvailableAddOns] =
    useState<PublicListingAddOn[]>([]);
  const [addOnsLoading, setAddOnsLoading] = useState(false);
  const [addOnsError, setAddOnsError] = useState("");

  const [checkIn, setCheckIn] = useState(() =>
    toDateInput(addDays(new Date(), 1)),
  );
  const [checkOut, setCheckOut] = useState(() =>
    toDateInput(addDays(new Date(), 4)),
  );

  const [quote, setQuote] = useState<PriceSnapshot | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const [hold, setHold] = useState<BookingHold | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  const [holdError, setHoldError] = useState("");
  const [holdSeconds, setHoldSeconds] = useState(0);
  const holdKeyRef = useRef<string | null>(null);

  const [guestFullName, setGuestFullName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const bookingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!listingId) return;

    let cancelled = false;

    async function loadListing() {
      setListingLoading(true);
      setListingError("");

      try {
        const result = await getPublicListingById(listingId);

        if (!cancelled) {
          setProperty(result);
        }
      } catch (error) {
        if (!cancelled) {
          setListingError(
            error instanceof Error
              ? error.message
              : "Unable to load this stay.",
          );
        }
      } finally {
        if (!cancelled) {
          setListingLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const totalGuests = adults + children;

  useEffect(() => {
    if (!property) return;

    const propertyId = property.id;
    let cancelled = false;

    async function loadAddOns() {
      setAddOnsLoading(true);
      setAddOnsError("");

      try {
        const result = await getListingAddOns(propertyId);

        if (!cancelled) {
          setAvailableAddOns(result);
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableAddOns([]);
          setAddOnsError(
            error instanceof Error
              ? error.message
              : "Unable to load available add-ons.",
          );
        }
      } finally {
        if (!cancelled) {
          setAddOnsLoading(false);
        }
      }
    }

    void loadAddOns();

    return () => {
      cancelled = true;
    };
  }, [property]);

  useEffect(() => {
    if (!property) return;

    const propertyId = property.id;
    let cancelled = false;

    async function resumeExistingHold() {
      try {
        const activeHold = await getActiveBookingHold(propertyId);

        if (!activeHold || cancelled) {
          return;
        }

        const snapshot = activeHold.priceSnapshot;

        setHold(activeHold);
        setQuote(snapshot);
        setCheckIn(activeHold.startsAt.slice(0, 10));
        setCheckOut(activeHold.endsAt.slice(0, 10));
        setAdults(Math.max(1, snapshot.guests || 1));
        setChildren(0);
        setSelectedExperiences(
          (snapshot.addOns ?? []).map((addOn) => addOn.addOnId),
        );
        setStep(3);
      } catch {
        // No active authenticated hold is not a blocking page-load error.
      }
    }

    void resumeExistingHold();

    return () => {
      cancelled = true;
    };
  }, [property]);

  useEffect(() => {
    if (!hold) {
      setHoldSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(hold.expiresAt).getTime() - Date.now()) / 1000,
        ),
      );

      setHoldSeconds(remaining);

      if (remaining === 0) {
        setHold(null);
        setQuote(null);
        setStep(1);
        setQuoteError(
          "Your booking hold expired. Please check availability again.",
        );
        holdKeyRef.current = null;
        bookingKeyRef.current = null;
        setAcceptedTerms(false);
      }
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hold]);

  useEffect(() => {
    holdKeyRef.current = null;
    setHoldError("");
  }, [checkIn, checkOut, totalGuests, selectedExperiences]);

  useEffect(() => {
    if (!property) return;

    const heldCheckIn = hold?.startsAt.slice(0, 10);
    const heldCheckOut = hold?.endsAt.slice(0, 10);
    const heldGuests = hold?.priceSnapshot.guests;

    const selectedAddOnKey = [...selectedExperiences]
      .sort()
      .join(",");

    const heldAddOnKey = [...(hold?.priceSnapshot.addOns ?? [])]
      .map((addOn) => addOn.addOnId)
      .sort()
      .join(",");

    if (
      hold &&
      heldCheckIn === checkIn &&
      heldCheckOut === checkOut &&
      heldGuests === totalGuests &&
      selectedAddOnKey === heldAddOnKey
    ) {
      setQuote(hold.priceSnapshot);
      setQuoteError("");
      return;
    }

    setQuote(null);
    setQuoteError("");

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuoteError("Check-out must be after check-in.");
      return;
    }

    if (totalGuests > property.maxGuests) {
      setQuoteError(
        `This stay supports a maximum of ${property.maxGuests} guests.`,
      );
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setQuoteLoading(true);

      try {
        const availability = await getListingAvailability(
          property.id,
          checkIn,
          checkOut,
        );

        const unavailableDay = availability.days.find(
          (day) => day.state !== "AVAILABLE",
        );

        if (unavailableDay) {
          throw new Error(
            `${formatBookingDate(unavailableDay.date)} is currently ${unavailableDay.state.toLowerCase()}.`,
          );
        }

        const minimumNights = availability.days.reduce(
          (maximum, day) => Math.max(maximum, day.minNights),
          1,
        );

        if (availability.days.length < minimumNights) {
          throw new Error(
            `This stay requires a minimum booking of ${minimumNights} nights.`,
          );
        }

        const result = await createPricingQuote({
          listingId: property.id,
          checkIn,
          checkOut,
          guests: totalGuests,
          addOns: selectedExperiences.map((addOnId) => ({
            addOnId,
            quantity: 1,
          })),
        });

        if (!cancelled) {
          setQuote(result);
          setQuoteError("");
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(
            error instanceof Error
              ? error.message
              : "Unable to check availability and pricing.",
          );
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    property,
    checkIn,
    checkOut,
    totalGuests,
    selectedExperiences,
    hold,
  ]);

  const toggleExperience = (id: string) =>
    setSelectedExperiences((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );

  const nights = quote?.nights ?? calculateNights(checkIn, checkOut);

  const basePrice = quote
    ? minorToRupees(quote.subtotal)
    : (property?.price ?? 0) * nights;

  const pricePerNight =
    nights > 0 ? Math.round(basePrice / nights) : property?.price ?? 0;

  const platformFee = quote
    ? minorToRupees(quote.platformFee)
    : 0;

  const taxes = quote
    ? minorToRupees(quote.gstAmount)
    : 0;

  const cleaningFee = quote
    ? minorToRupees(quote.cleaningFee)
    : 0;

  const experiencesTotal = quote
    ? minorToRupees(quote.addOnsTotal)
    : 0;

  const totalPrice = quote
    ? minorToRupees(quote.total)
    : basePrice;

  const totalSteps = 4;
  const nextStep = async () => {
    if (step === 1) {
      if (!quote || quoteLoading || quoteError) {
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (
        !property ||
        !quote ||
        quoteLoading ||
        quoteError ||
        holdLoading ||
        addOnsLoading
      ) {
        return;
      }

      const propertyId = property.id;

      setHoldLoading(true);
      setHoldError("");

      try {
        const idempotencyKey =
          holdKeyRef.current ?? crypto.randomUUID();

        holdKeyRef.current = idempotencyKey;

        const createdHold = await createBookingHold({
          listingId: propertyId,
          checkIn,
          checkOut,
          guests: totalGuests,
          idempotencyKey,
          addOns: selectedExperiences.map((addOnId) => ({
            addOnId,
            quantity: 1,
          })),
        });

        setHold(createdHold);
        setQuote(createdHold.priceSnapshot);
        setStep(3);
      } catch (error) {
        holdKeyRef.current = null;

        setHoldError(
          error instanceof Error
            ? error.message
            : "Unable to reserve these dates.",
        );
      } finally {
        setHoldLoading(false);
      }

      return;
    }

    if (step === 3) {
      setBookingError("");

      if (!guestFullName.trim()) {
        setBookingError("Enter the primary guest's full name.");
        return;
      }

      if (!guestPhone.trim()) {
        setBookingError("Enter a valid contact phone number.");
        return;
      }

      setStep(4);
      return;
    }

    if (step === 4) {
      if (
        paymentPlan === "PAY_ON_ARRIVAL" &&
        !property?.payOnArrivalEnabled
      ) {
        setPaymentPlan("FULL");
        setBookingError(
          "Pay on arrival is not available for this listing.",
        );
        return;
      }

      if (
        paymentPlan === "PAY_LATER" &&
        !getPayLaterEligibility(
          checkIn,
          payLaterMonths,
        ).eligible
      ) {
        setBookingError(
          "The selected Pay Later schedule cannot finish before check-in. Choose another payment plan or later check-in dates.",
        );
        return;
      }

      if (
        !hold ||
        !quote ||
        !acceptedTerms ||
        bookingLoading
      ) {
        return;
      }

      setBookingLoading(true);
      setBookingError("");

      try {
        const idempotencyKey =
          bookingKeyRef.current ?? crypto.randomUUID();

        bookingKeyRef.current = idempotencyKey;

        const booking = await createBooking({
          holdId: hold.id,
          plan: paymentPlan,
          ...(paymentPlan === "PAY_LATER"
            ? { payLaterMonths }
            : {}),
          idempotencyKey,
          guestDetails: {
            fullName: guestFullName.trim(),
            phone: guestPhone.trim(),
            ...(guestEmail.trim()
              ? { email: guestEmail.trim() }
              : {}),
            ...(estimatedArrival.trim()
              ? { estimatedArrival: estimatedArrival.trim() }
              : {}),
            ...(specialRequests.trim()
              ? { specialRequests: specialRequests.trim() }
              : {}),
          },
          acceptedTermsAt: new Date().toISOString(),
        });

        router.push(
          `/payment?bookingId=${encodeURIComponent(booking.id)}`,
        );
      } catch (error) {
        bookingKeyRef.current = null;

        setBookingError(
          error instanceof Error
            ? error.message
            : "Unable to create your booking.",
        );
      } finally {
        setBookingLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push(`/stays/${property?.slug ?? listingId}`);
    }
  };

  if (listingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-sm text-muted">Loading booking details…</p>
      </div>
    );
  }

  if (listingError || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Unable to open this booking
          </h1>
          <p className="mt-2 text-sm text-muted">
            {listingError || "This stay could not be found."}
          </p>
          <Link
            href="/stays"
            className="inline-flex mt-5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Browse stays
          </Link>
        </div>
      </div>
    );
  }

  const payLaterOptions = (
    quote?.payLaterFirstInstalment ?? []
  ).flatMap((option) => {
    if (
      option.months !== 3 &&
      option.months !== 6 &&
      option.months !== 12
    ) {
      return [];
    }

    return [
      {
        ...option,
        ...getPayLaterEligibility(
          checkIn,
          option.months,
        ),
      },
    ];
  });

  const selectedPayLaterInstalment =
    payLaterOptions.find(
      (option) => option.months === payLaterMonths,
    );

  const hasEligiblePayLaterOption =
    payLaterOptions.some((option) => option.eligible);

  const amountDueNow = quote
    ? paymentPlan === "FULL"
      ? quote.total
      : paymentPlan === "DEPOSIT_50"
        ? quote.depositAmount
        : paymentPlan === "PAY_LATER"
          ? selectedPayLaterInstalment?.eligible
            ? selectedPayLaterInstalment.amountMinor
            : 0
          : 0
    : 0;

  const paymentPlanOptions: Array<{
    value: BookingPaymentPlan;
    title: string;
    description: string;
    amount: number;
    disabled?: boolean;
  }> = quote
    ? [
        {
          value: "FULL",
          title: "Pay in full",
          description: "Pay the complete booking amount securely now.",
          amount: quote.total,
        },
        {
          value: "DEPOSIT_50",
          title: "Pay 50% deposit",
          description: "Pay half now and the remaining balance later.",
          amount: quote.depositAmount,
        },
        {
          value: "PAY_LATER",
          title: "Pay Later",
          description: hasEligiblePayLaterOption
            ? "Split the total into scheduled monthly instalments."
            : "The instalment schedule cannot finish before this check-in date.",
          amount:
            selectedPayLaterInstalment?.eligible
              ? selectedPayLaterInstalment.amountMinor
              : 0,
          disabled: !hasEligiblePayLaterOption,
        },
        {
          value: "PAY_ON_ARRIVAL",
          title: "Pay on arrival",
          description: property.payOnArrivalEnabled
            ? "Reserve the stay now and pay at the property."
            : "This option is not available for this property.",
          amount: 0,
          disabled: !property.payOnArrivalEnabled,
        },
      ]
    : [];

  return (
    <div className="bg-background min-h-screen pb-24 pt-[72px]">
      {/* Progress Bar Header */}
      <div className="sticky top-[72px] z-40 bg-background/95 backdrop-blur-xl border-b border-surface-hover py-4">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={prevStep}
              className="p-2 -ml-2 rounded-full text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex-1 max-w-xl mx-auto flex items-center justify-between relative">
              <div className="absolute top-3 left-0 right-0 h-[3px] rounded-full bg-surface-hover -z-10" />
              <div
                className="absolute top-3 left-0 h-[3px] rounded-full bg-gradient-to-r from-primary to-primary-hover -z-10 transition-all duration-500 ease-out"
                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              />

              {[
                { num: 1, label: "Dates & Guests" },
                { num: 2, label: "Add-ons" },
                { num: 3, label: "Details" },
                { num: 4, label: "Review" },
              ].map((s) => {
                const isCompleted = step > s.num;
                const isActive = step === s.num;
                return (
                  <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-2">
                    <div className="relative flex items-center justify-center w-7 h-7">
                      {isActive && (
                        <span className="absolute w-7 h-7 rounded-full bg-primary/25 animate-pulse" />
                      )}
                      <div
                        className={`relative flex items-center justify-center rounded-full font-bold transition-all duration-300 ease-out ${
                          isActive
                            ? "w-7 h-7 bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(228,138,74,0.18)] scale-100"
                            : isCompleted
                            ? "w-6 h-6 bg-primary text-primary-foreground scale-100"
                            : "w-6 h-6 bg-surface-hover border border-border text-subtle scale-90"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={13} className="animate-fade-in" />
                        ) : (
                          <span className="text-[10px]">{s.num}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider hidden sm:block transition-colors duration-300 ${
                        isActive
                          ? "text-foreground font-semibold"
                          : isCompleted
                          ? "text-foreground font-medium"
                          : "text-subtle font-medium"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Step 1: Dates & Guests */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h1 className="heading-display text-3xl text-foreground mb-6">
                  Review dates and guests
                </h1>

                <div className="space-y-4">
                  <div className="bg-surface border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar size={18} className="text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">
                        Dates
                      </h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          Check-in
                        </label>
                        <input
                          type="date"
                          min={toDateInput(new Date())}
                          value={checkIn}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCheckIn(value);

                            if (checkOut <= value) {
                              setCheckOut(
                                toDateInput(
                                  addDays(
                                    new Date(`${value}T00:00:00.000Z`),
                                    1,
                                  ),
                                ),
                              );
                            }
                          }}
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                          Check-out
                        </label>
                        <input
                          type="date"
                          min={
                            checkIn
                              ? toDateInput(
                                  addDays(
                                    new Date(`${checkIn}T00:00:00.000Z`),
                                    1,
                                  ),
                                )
                              : toDateInput(addDays(new Date(), 1))
                          }
                          value={checkOut}
                          onChange={(event) =>
                            setCheckOut(event.target.value)
                          }
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-surface-hover p-4">
                      {quoteLoading ? (
                        <p className="text-xs text-muted">
                          Checking availability and calculating the latest price…
                        </p>
                      ) : quoteError ? (
                        <p className="text-xs text-terracotta">
                          {quoteError}
                        </p>
                      ) : quote ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {formatBookingDate(checkIn)} –{" "}
                              {formatBookingDate(checkOut)}
                            </p>
                            <p className="text-xs text-muted mt-1">
                              {quote.nights} night
                              {quote.nights === 1 ? "" : "s"} · available
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-sage">
                            Price confirmed
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">
                          Select valid dates to check availability.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Guests</h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Adults</div>
                          <div className="text-xs text-subtle mt-0.5">Age 13+</div>
                        </div>
                        <div className="flex items-center rounded-full border border-border hover:border-primary/40 transition-colors overflow-hidden">
                          <button
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            aria-label="Decrease adults"
                            className={`w-9 h-9 flex items-center justify-center transition-all duration-150 active:scale-90 ${
                              adults <= 1
                                ? "text-subtle/40 cursor-not-allowed"
                                : "text-foreground hover:bg-surface-hover hover:text-primary"
                            }`}
                          >
                            <Minus size={15} />
                          </button>
                          <span className="w-9 text-center text-foreground font-semibold tabular-nums select-none border-x border-border py-2">
                            {adults}
                          </span>
                          <button
                            onClick={() => setAdults(Math.min(property.maxGuests, adults + 1))}
                            aria-label="Increase adults"
                            className={`w-9 h-9 flex items-center justify-center transition-all duration-150 active:scale-90 ${
                              adults >= property.maxGuests
                                ? "text-subtle/40 cursor-not-allowed"
                                : "text-foreground hover:bg-surface-hover hover:text-primary"
                            }`}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-surface-hover">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Children</div>
                          <div className="text-xs text-subtle mt-0.5">Ages 2-12</div>
                        </div>
                        <div className="flex items-center rounded-full border border-border hover:border-primary/40 transition-colors overflow-hidden">
                          <button
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            aria-label="Decrease children"
                            className={`w-9 h-9 flex items-center justify-center transition-all duration-150 active:scale-90 ${
                              children <= 0
                                ? "text-subtle/40 cursor-not-allowed"
                                : "text-foreground hover:bg-surface-hover hover:text-primary"
                            }`}
                          >
                            <Minus size={15} />
                          </button>
                          <span className="w-9 text-center text-foreground font-semibold tabular-nums select-none border-x border-border py-2">
                            {children}
                          </span>
                          <button
                            onClick={() => setChildren(Math.min(property.maxGuests - adults, children + 1))}
                            aria-label="Increase children"
                            className={`w-9 h-9 flex items-center justify-center transition-all duration-150 active:scale-90 ${
                              children >= property.maxGuests - adults
                                ? "text-subtle/40 cursor-not-allowed"
                                : "text-foreground hover:bg-surface-hover hover:text-primary"
                            }`}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Add-ons */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h1 className="heading-display text-3xl text-foreground mb-2">
                  Enhance your stay
                </h1>

                <p className="text-muted mb-6">
                  Select optional services available for {property.name}.
                </p>

                {addOnsLoading ? (
                  <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
                    Loading available add-ons…
                  </div>
                ) : addOnsError ? (
                  <div className="rounded-2xl border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-terracotta">
                    {addOnsError}
                  </div>
                ) : availableAddOns.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No add-ons are currently available
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Continue with accommodation only.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableAddOns.map((addOn) => {
                      const isSelected =
                        selectedExperiences.includes(addOn.id);

                      return (
                        <div
                          key={addOn.id}
                          className={`rounded-2xl border bg-surface p-5 ${
                            isSelected
                              ? "border-sage/50"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-5">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-primary">
                                {addOn.provider?.name ||
                                  "Dhyana Stays Partner"}
                              </p>

                              <h3 className="mt-1 font-semibold text-foreground">
                                {addOn.title}
                              </h3>

                              <p className="mt-1 text-xs text-muted">
                                {addOn.description}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="font-semibold text-foreground">
                                ₹
                                {minorToRupees(
                                  addOn.priceMinor,
                                ).toLocaleString("en-IN")}
                              </p>

                              <button
                                type="button"
                                disabled={Boolean(hold)}
                                onClick={() =>
                                  toggleExperience(addOn.id)
                                }
                                className={`mt-3 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
                                  isSelected
                                    ? "border border-sage/40 bg-sage/10 text-sage"
                                    : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {isSelected ? "Added" : "Add"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-border bg-surface p-4">
                  {quoteLoading ? (
                    <p className="text-xs text-muted">
                      Recalculating total…
                    </p>
                  ) : quoteError ? (
                    <p className="text-xs text-terracotta">
                      {quoteError}
                    </p>
                  ) : quote ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">
                        {selectedExperiences.length} add-on
                        {selectedExperiences.length === 1 ? "" : "s"}
                      </span>

                      <span className="text-lg font-bold text-primary">
                        ₹
                        {minorToRupees(
                          quote.total,
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Step 3: Guest Details */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h1 className="heading-display text-3xl text-foreground mb-2">
                  Guest details
                </h1>

                <p className="text-muted mb-6">
                  Enter the contact details for the primary guest.
                </p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                          Full name
                        </label>

                        <input
                          type="text"
                          required
                          value={guestFullName}
                          onChange={(event) =>
                            setGuestFullName(event.target.value)
                          }
                          placeholder="Primary guest's full name"
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                            Phone number
                          </label>

                          <input
                            type="tel"
                            required
                            value={guestPhone}
                            onChange={(event) =>
                              setGuestPhone(event.target.value)
                            }
                            placeholder="+91 98765 43210"
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                            Email
                          </label>

                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(event) =>
                              setGuestEmail(event.target.value)
                            }
                            placeholder="guest@example.com"
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                          Estimated arrival
                        </label>

                        <input
                          type="text"
                          value={estimatedArrival}
                          onChange={(event) =>
                            setEstimatedArrival(event.target.value)
                          }
                          placeholder="For example: Around 3:00 PM"
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="text-lg font-semibold text-foreground">
                      Message the host
                    </h2>

                    <p className="mb-4 mt-1 text-sm text-muted">
                      Share any arrival notes or special requests with{" "}
                      {property.host.name}.
                    </p>

                    <textarea
                      rows={4}
                      value={specialRequests}
                      onChange={(event) =>
                        setSpecialRequests(event.target.value)
                      }
                      placeholder="Hello! We are excited to stay..."
                      className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="animate-fade-in">
                <h1 className="heading-display text-3xl text-foreground mb-2">
                  Review your booking
                </h1>

                <p className="text-muted mb-6">
                  Confirm the frozen details before booking creation.
                </p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="font-semibold text-foreground">
                      {property.name}
                    </h2>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted">Check-in</p>
                        <p className="text-sm text-foreground">
                          {formatBookingDate(checkIn)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted">Check-out</p>
                        <p className="text-sm text-foreground">
                          {formatBookingDate(checkOut)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted">Guests</p>
                        <p className="text-sm text-foreground">
                          {totalGuests}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="font-semibold text-foreground">
                      Add-ons
                    </h2>

                    {quote?.addOns.length ? (
                      <div className="mt-3 space-y-3">
                        {quote.addOns.map((addOn) => (
                          <div
                            key={addOn.addOnId}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-muted">
                              {addOn.title} × {addOn.quantity}
                            </span>

                            <span className="text-foreground">
                              ₹
                              {minorToRupees(
                                addOn.totalPrice,
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">
                        No add-ons selected.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="font-semibold text-foreground">
                      Primary guest
                    </h2>

                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-foreground">
                        {guestFullName}
                      </p>
                      <p className="text-muted">{guestPhone}</p>
                      {guestEmail && (
                        <p className="text-muted">{guestEmail}</p>
                      )}
                      {estimatedArrival && (
                        <p className="pt-2 text-muted">
                          Arrival: {estimatedArrival}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="font-semibold text-foreground">
                      Choose payment plan
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      Select how you would like to pay for this booking.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {paymentPlanOptions.map((option) => {
                        const selected =
                          paymentPlan === option.value;
                        const disabled = Boolean(
                          option.disabled,
                        );

                        return (
                          <label
                            key={option.value}
                            className={`rounded-xl border p-4 transition-colors ${
                              disabled
                                ? "cursor-not-allowed border-border bg-surface-hover opacity-60"
                                : selected
                                  ? "cursor-pointer border-primary bg-primary/5"
                                  : "cursor-pointer border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="paymentPlan"
                                value={option.value}
                                checked={selected}
                                disabled={disabled}
                                onChange={() => {
                                  if (!disabled) {
                                    setPaymentPlan(option.value);
                                  }
                                }}
                                className="mt-1 h-4 w-4 accent-primary disabled:cursor-not-allowed"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-medium text-foreground">
                                    {option.title}
                                  </span>

                                  <span className="shrink-0 text-sm font-semibold text-primary">
                                    {disabled
                                      ? "Unavailable"
                                      : option.value === "PAY_ON_ARRIVAL"
                                        ? "₹0 now"
                                        : `₹${minorToRupees(
                                            option.amount,
                                          ).toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}`}
                                  </span>
                                </div>

                                <p className="mt-1 text-xs leading-relaxed text-muted">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {paymentPlan === "PAY_LATER" && (
                      <div className="mt-5 rounded-xl border border-border bg-background p-4">
                        <label
                          htmlFor="pay-later-months"
                          className="text-sm font-medium text-foreground"
                        >
                          Instalment duration
                        </label>

                        <select
                          id="pay-later-months"
                          value={payLaterMonths}
                          onChange={(event) =>
                            setPayLaterMonths(
                              Number(event.target.value) as
                                | 3
                                | 6
                                | 12,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          {payLaterOptions.map(
                            (option) => (
                              <option
                                key={option.months}
                                value={option.months}
                                disabled={!option.eligible}
                              >
                                {option.eligible
                                  ? `${option.months} months — first payment ₹${minorToRupees(
                                      option.amountMinor,
                                    ).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : `${option.months} months — unavailable for selected check-in`}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="text-sm text-muted">
                        Amount due now
                      </span>

                      <span className="text-xl font-bold text-primary">
                        ₹
                        {minorToRupees(amountDueNow).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>

                    {paymentPlan === "DEPOSIT_50" && quote && (
                      <p className="mt-2 text-right text-xs text-muted">
                        Remaining balance: ₹
                        {minorToRupees(
                          quote.balanceAmount,
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(event) =>
                          setAcceptedTerms(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 accent-primary"
                      />

                      <span className="text-sm leading-relaxed text-muted">
                        I accept the cancellation policy, booking terms,
                        and Dhyana Stays terms of service.
                      </span>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        Frozen total
                      </span>

                      <span className="text-2xl font-bold text-primary">
                        ₹
                        {quote
                          ? minorToRupees(
                              quote.total,
                            ).toLocaleString("en-IN")
                          : "0"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hold && step > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-sage/30 bg-sage/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock size={15} className="text-sage" />
                  <span>Your dates are temporarily reserved</span>
                </div>

                <span className="font-semibold text-sage tabular-nums">
                  {String(Math.floor(holdSeconds / 60)).padStart(2, "0")}:
                  {String(holdSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            )}

            {holdError && (
              <div className="mt-6 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
                {holdError}
              </div>
            )}

            {bookingError && (
              <div className="mt-6 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
                {bookingError}
              </div>
            )}

            {/* Navigation Button */}
            <div className="mt-6 pt-6 border-t border-surface-hover">
              <button
                onClick={nextStep}
                disabled={
                  (step === 1 && (!quote || quoteLoading)) ||
                  (step === 2 &&
                    (!quote ||
                      quoteLoading ||
                      holdLoading ||
                      addOnsLoading)) ||
                  (step === 3 &&
                    (!guestFullName.trim() ||
                      !guestPhone.trim())) ||
                  (step === 4 &&
                    (!hold ||
                      !acceptedTerms ||
                      bookingLoading))
                }
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {holdLoading
                  ? "Securing dates…"
                  : bookingLoading
                    ? "Creating booking…"
                    : step === totalSteps
                      ? "Create booking"
                      : "Continue"}
                {!holdLoading && !bookingLoading && (
                  <ChevronRight size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:w-[400px]">
            <div className="sticky top-[160px] bg-surface border border-border rounded-2xl overflow-hidden shadow-organic">
              {/* Property image */}
              <div className="relative h-40 w-full bg-surface-hover">
                <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {property.category}
                </span>
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-foreground text-base leading-snug mb-4">
                  {property.name}
                </h3>

                {/* Highlights */}
                <div className="space-y-2.5 pb-5 mb-5 border-b border-border">
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <Star size={15} className="text-primary fill-primary shrink-0" />
                    <span>
                      <span className="text-foreground font-medium">{property.rating}</span> · {property.reviewCount} reviews
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <MapPin size={15} className="text-sage shrink-0" />
                    <span>{property.location.city}, {property.location.state}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <Wifi size={15} className="text-sage shrink-0" />
                    <span>Free Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <Coffee size={15} className="text-sage shrink-0" />
                    <span>Breakfast included</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <ShieldCheck size={15} className="text-sage shrink-0" />
                    <span>Free cancellation</span>
                  </div>
                </div>

                {/* Price details */}
                <div className="pb-5 mb-5 border-b border-border">
                  <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Price details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted">
                      <span>Accommodation · {nights} nights</span>
                      <span>₹{basePrice.toLocaleString()}</span>
                    </div>
                    {selectedExperiences.length > 0 && (
                      <div className="flex justify-between text-muted animate-fade-in">
                        <span>Curated experiences ({selectedExperiences.length})</span>
                        <span>₹{experiencesTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>Cleaning fee</span>
                        <span>₹{cleaningFee.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted">
                      <span className="flex items-center gap-1">
                        Platform fee
                        <Info size={12} className="text-subtle" />
                      </span>
                      <span>₹{platformFee.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span className="flex items-center gap-1">Taxes <Info size={12} className="text-subtle" /></span>
                      <span>₹{taxes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Total — prominent */}
                <div className="rounded-xl bg-primary/5 border border-primary/25 p-4">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Total (INR)</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted mt-1.5">
                    Includes all taxes and fees
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
