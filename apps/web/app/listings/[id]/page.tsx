'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../context/AuthContext';
import { useFeature } from '../../../context/FeatureContext';
import AvailabilityCalendar from '../../../components/calendar/AvailabilityCalendar';
import StayGallery from '../../../components/listing-detail/StayGallery';
import StayHeader from '../../../components/listing-detail/StayHeader';
import StayDetailsGrid from '../../../components/listing-detail/StayDetailsGrid';
import StayAmenities from '../../../components/listing-detail/StayAmenities';
import StayReviews from '../../../components/listing-detail/StayReviews';
import StayVideoSection from '../../../components/listing-detail/StayVideoSection';
import MobileStickyBar from '../../../components/listing-detail/MobileStickyBar';

const ListingMap = dynamic(() => import('../../../components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading map...</span>
    </div>
  ),
});
import {
  bookingsApi,
  formatDate,
  formatINR,
  generateUUID,
  guestMessagingApi,
  holdsApi,
  listingsApi,
  paymentsApi,
  pricingApi,
  reviewsApi,
  type HoldStatus,
} from '../../../lib/api';
import type { AddOnSelection, Booking, GuestDetails, Hold, Listing, ListingReviews, PriceQuote } from '../../../lib/types';
// AddOnPicker disabled in Phase 1 — see add-on JSX block below.
// import AddOnPicker from '../../../components/AddOnPicker';

// ─── Hold countdown ───────────────────────────────────────────────────────────
// Live MM:SS countdown to hold.expiresAt. Calls onExpire() exactly once when
// the timer hits zero. Switches to red urgency styling under 60s.

function HoldCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}) {
  const [msRemaining, setMsRemaining] = useState(
    () => new Date(expiresAt).getTime() - Date.now(),
  );

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    setMsRemaining(target - Date.now());
    const id = setInterval(() => {
      const remaining = target - Date.now();
      setMsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  if (msRemaining <= 0) {
    return (
      <div className="alert-error text-xs">
        ⏱ Hold expired — please re-quote and try again.
      </div>
    );
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const urgent = totalSeconds < 60;

  return (
    <div className={urgent ? 'alert-error text-xs' : 'alert-info text-xs'}>
      ⏱ Dates held — <span className="font-mono font-semibold">{mmss}</span>{' '}
      remaining. Complete booking before the timer runs out.
    </div>
  );
}

// ─── "Held by another guest" banner ────────────────────────────────────────────
// Shown to a DIFFERENT guest who selects dates already on hold. Counts down the
// remaining time; calls onFree() once when it hits zero so the parent can
// re-check availability and re-enable the Hold button.

function HeldByOthersBanner({
  remainingSeconds,
  onFree,
}: {
  remainingSeconds: number;
  onFree: () => void;
}) {
  const [sec, setSec] = useState(remainingSeconds);

  useEffect(() => {
    setSec(remainingSeconds);
    const id = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          clearInterval(id);
          onFree();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remainingSeconds, onFree]);

  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  const mmss = `${mm}:${ss.toString().padStart(2, '0')}`;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <div className="font-semibold flex items-center gap-1">
        🔒 These dates are on hold
      </div>
      <p className="mt-1">
        Another guest is currently booking these dates. They&apos;ll free up in{' '}
        <span className="font-mono font-semibold">{mmss}</span> if the hold isn&apos;t
        completed. You can try again then, or pick different dates.
      </p>
    </div>
  );
}

// ─── Razorpay type declaration ────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load payment gateway. Check your connection and try again.'));
    document.head.appendChild(script);
  });
}

type Step = 'details' | 'quote' | 'guestdetails' | 'booking' | 'payment' | 'confirmed';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const interactiveCalendar = useFeature('interactive_calendar');

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState<Step>('details');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<'FULL' | 'DEPOSIT_50' | 'PAY_ON_ARRIVAL'>('FULL');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [addOnSelections, setAddOnSelections] = useState<AddOnSelection[]>([]);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    estimatedArrival: '',
    specialRequests: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [listingReviews, setListingReviews] = useState<ListingReviews | null>(null);
  // Hold status for the selected dates when held by ANOTHER guest.
  const [othersHold, setOthersHold] = useState<HoldStatus | null>(null);
  // True when we restored a still-live hold on return (resume banner).
  const [resumed, setResumed] = useState(false);
  const resumeAttemptedRef = useRef(false);
  // Confirm-before-leave while a hold is active. `pendingAbandonRef` holds the
  // navigation to run once the guest confirms the hold cancellation.
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const pendingAbandonRef = useRef<null | (() => void)>(null);

  // Kept in refs so the unmount/pagehide cleanup reads the latest values
  // without re-subscribing the listener on every hold change.
  const holdRef = useRef<Hold | null>(null);
  const holdConsumedRef = useRef(false);
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  useEffect(() => {
    listingsApi
      .getById(id)
      .then(setListing)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    reviewsApi.getListingReviews(id)
      .then(setListingReviews)
      .catch(() => {});
  }, [id]);

  // Resume-on-return: if this account still has a live (un-booked, non-expired)
  // hold on this listing, restore it — dates, frozen price and all — and drop
  // the guest straight back into the booking flow. Combined with the 15-min TTL
  // and release-on-abandon, a hold either survives to be resumed or is cleared.
  useEffect(() => {
    if (!user) return;
    if (resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    let cancelled = false;
    holdsApi
      .getActive(id)
      .then((h) => {
        if (cancelled || !h || holdConsumedRef.current) return;
        setHold(h);
        setQuote(h.priceSnapshot);
        setCheckIn(h.startsAt.slice(0, 10));
        setCheckOut(h.endsAt.slice(0, 10));
        if (h.priceSnapshot?.guests) setGuests(h.priceSnapshot.guests);
        setResumed(true);
        setStep('guestdetails');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  // Release-on-abandon: if the guest leaves with an active (un-booked) hold,
  // free the dates immediately for others instead of blocking for the full
  // 15 minutes. Covers tab close / reload (pagehide) and SPA navigation
  // (component unmount). keepalive fetch survives the unload.
  useEffect(() => {
    const releaseIfAbandoned = () => {
      const h = holdRef.current;
      if (h && !holdConsumedRef.current) {
        holdsApi.releaseBeacon(h.id);
        holdRef.current = null;
      }
    };
    window.addEventListener('pagehide', releaseIfAbandoned);
    return () => {
      window.removeEventListener('pagehide', releaseIfAbandoned);
      releaseIfAbandoned();
    };
  }, []);

  // Refresh whether these dates are held by someone else.
  const refreshOthersHold = useCallback(async () => {
    if (!checkIn || !checkOut) return;
    try {
      const s = await holdsApi.status(id, checkIn, checkOut);
      setOthersHold(s.held && !s.mine ? s : null);
    } catch {
      setOthersHold(null);
    }
  }, [id, checkIn, checkOut]);

  const today = new Date().toISOString().split('T')[0];

  const handleGetQuote = async () => {
    if (!checkIn || !checkOut) return;
    setActionError('');
    setActionLoading(true);
    try {
      const q = await pricingApi.quote({
        listingId: id,
        checkIn,
        checkOut,
        guests,
        addOns: addOnSelections.length > 0 ? addOnSelections : undefined,
      });
      setQuote(q);
      setStep('quote');
      // Surface whether another guest already holds these dates.
      void refreshOthersHold();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to get quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHold = async () => {
    if (!user) { router.push('/auth/login'); return; }
    setActionError('');
    setActionLoading(true);
    try {
      const h = await holdsApi.create({
        listingId: id,
        checkIn,
        checkOut,
        guests,
        idempotencyKey: generateUUID(),
        addOns: addOnSelections.length > 0 ? addOnSelections : undefined,
      });
      setHold(h);
      setOthersHold(null);
      setStep('guestdetails');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to hold dates');
      // Lost a race — someone else grabbed these dates. Show the countdown.
      void refreshOthersHold();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!hold) return;
    setActionError('');
    setActionLoading(true);
    try {
      const b = await bookingsApi.create({
        holdId: hold.id,
        plan: paymentPlan,
        idempotencyKey: generateUUID(),
        guestDetails: {
          fullName: guestDetails.fullName,
          phone: guestDetails.phone,
          ...(guestDetails.email && { email: guestDetails.email }),
          ...(guestDetails.address && { address: guestDetails.address }),
          ...(guestDetails.estimatedArrival && { estimatedArrival: guestDetails.estimatedArrival }),
          ...(guestDetails.specialRequests && { specialRequests: guestDetails.specialRequests }),
        },
        acceptedTermsAt: new Date().toISOString(),
      });
      setBooking(b);
      // Hold is now a booking — never release it on unmount.
      holdConsumedRef.current = true;
      // Pay-on-arrival is confirmed server-side at creation — no online payment,
      // so skip the Razorpay step and go straight to the confirmation.
      setStep(paymentPlan === 'PAY_ON_ARRIVAL' ? 'confirmed' : 'payment');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to create booking');
    } finally {
      setActionLoading(false);
    }
  };

  /** Delete the active hold now, freeing the dates for other guests. */
  const releaseCurrentHold = useCallback(async () => {
    const h = holdRef.current ?? hold;
    setHold(null);
    setResumed(false);
    if (h) {
      try {
        await holdsApi.release(h.id);
      } catch {
        // best-effort — reaper will clean it up
      }
      void refreshOthersHold();
    }
  }, [hold, refreshOthersHold]);

  /** Explicit abandon: release the hold and return to the quote step. */
  const handleReleaseAndBack = async () => {
    setStep('quote');
    await releaseCurrentHold();
  };

  /** Is there a live hold that hasn't yet become a booking? */
  const holdActive = !!hold && !holdConsumedRef.current;

  /**
   * Ask the guest to confirm cancelling their hold before a "back"/leave action.
   * `proceed` runs only if they accept (releasing the hold happens inside it).
   */
  const requestAbandon = useCallback((proceed: () => void) => {
    pendingAbandonRef.current = proceed;
    setShowAbandonConfirm(true);
  }, []);

  const confirmAbandon = () => {
    const proceed = pendingAbandonRef.current;
    pendingAbandonRef.current = null;
    setShowAbandonConfirm(false);
    proceed?.();
  };

  const dismissAbandon = () => {
    pendingAbandonRef.current = null;
    setShowAbandonConfirm(false);
  };

  // Guard "leaving with a live hold" only while the guest is still in the
  // pre-booking steps (a hold that's become a booking is committed).
  const holdGuardActive =
    holdActive && (step === 'guestdetails' || step === 'booking');

  // Tab close / reload / URL change → native "Leave site?" prompt. The pagehide
  // handler above frees the dates if they do leave.
  useEffect(() => {
    if (!holdGuardActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [holdGuardActive]);

  // Browser Back button → keep the guest on the page and ask them to confirm
  // cancelling the hold first; only on accept is the hold released.
  useEffect(() => {
    if (!holdGuardActive) return;
    window.history.pushState(null, '');
    const onPop = () => {
      // Re-arm so the guest stays put until they answer the prompt.
      window.history.pushState(null, '');
      requestAbandon(() => {
        void handleReleaseAndBack();
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // requestAbandon + handleReleaseAndBack are stable enough; re-run only on guard change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdGuardActive]);

  const handleInitPayment = async () => {
    if (!booking) return;
    // Pay-on-arrival never reaches the online payment step.
    if (paymentPlan === 'PAY_ON_ARRIVAL') return;
    setActionError('');
    setActionLoading(true);
    try {
      const result = await paymentsApi.init({
        bookingId: booking.id,
        type: paymentPlan,
        idempotencyKey: generateUUID(),
      });

      // Open Razorpay Checkout
      await loadRazorpayScript();
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: result.keyId,
          amount: result.amount,
          currency: result.currency,
          order_id: result.razorpayOrderId,
          name: 'Dhyana Stays',
          description: `Booking ${booking.id.slice(0, 8)}`,
          image: '/logo.png',
          prefill: {
            name: guestDetails.fullName,
            email: guestDetails.email || undefined,
            contact: guestDetails.phone,
          },
          theme: { color: '#0e3b47' },
          handler: () => {
            // Payment captured — webhook will confirm booking asynchronously
            resolve();
          },
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled. Your booking is saved — you can pay later from your dashboard.')),
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      });
      setStep('confirmed');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
        <p className="text-gray-500 mt-4">Loading stay details…</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container-page py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Stay not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => router.push('/')} className="btn-primary">
          Back to discovery
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-10 lg:px-10 lg:pb-10 xl:px-12">
      {/* Photos + the inline cover video are split from media inside StayGallery. */}
      <StayGallery
        listingId={listing.id}
        title={listing.title}
        city={listing.city}
        state={listing.state}
        description={listing.description}
        propertyType={listing.propertyType}
        media={listing.media}
      />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-3">
        {/* Left: Listing info */}
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <StayHeader
            listing={listing}
            listingReviews={listingReviews}
            canMessageHost={user?.role === 'GUEST' && !!(listing as any).host?.userId}
            onMessageHost={() => {
              const hostUserId = (listing as any).host.userId;
              guestMessagingApi
                .startConversation({
                  recipientId: hostUserId,
                  listingId: listing.id,
                  message: `Hi, I have a question about "${listing.title}"`,
                })
                .then((conv) => router.push(`/guest/messages/${conv.id}`))
                .catch((e: Error) => alert(e.message));
            }}
          />

          {/* Description */}
          <div className="card p-6 lg:p-7">
            <h2 className="font-semibold text-gray-900 mb-4">About this stay</h2>
            <p className="text-gray-600 leading-relaxed">{listing.description}</p>
          </div>

          {listing.tags && listing.tags.length > 0 && <StayAmenities tags={listing.tags} />}

          <StayDetailsGrid
            maxGuests={listing.rateRules?.[0]?.maxGuests}
            country={listing.country}
            timezone={listing.timezone}
          />

          {/* Seasonal rates (if any) */}
          {listing.seasonalRates && listing.seasonalRates.length > 0 && (
            <div className="card p-6 lg:p-7">
              <h2 className="font-semibold text-gray-900 mb-4">Seasonal pricing</h2>
              <div className="space-y-2">
                {listing.seasonalRates.map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {formatDate(r.startsAt)} – {formatDate(r.endsAt)}
                    </span>
                    <span className="font-medium text-brand-700">{formatINR(r.nightlyRate)} / night</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation policy */}
          <div className="card p-6 lg:p-7">
            <h2 className="font-semibold text-gray-900 mb-4">Cancellation policy</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>≥ 48 hours before check-in:</strong> 100% refund</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">~</span>
                <span><strong>10–48 hours before check-in:</strong> 50% refund</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span><strong>Less than 10 hours:</strong> No refund</span>
              </li>
            </ul>
          </div>

          {listingReviews && listingReviews.count > 0 && <StayReviews listingReviews={listingReviews} />}
        </div>

        {/* Right: Booking panel */}
        <div className="lg:col-span-1">
          <div id="booking-card" className="card p-6 lg:p-7 sticky top-24 scroll-mt-24">
            {/* Price */}
            <div className="mb-5">
              {listing.rateRules?.[0]?.baseNightlyRate ? (
                <div>
                  <span className="text-2xl font-bold text-brand-700">
                    {formatINR(listing.rateRules[0].baseNightlyRate)}
                  </span>
                  <span className="text-gray-400 text-sm"> / night</span>
                </div>
              ) : (
                <span className="text-gray-400">Price on request</span>
              )}
            </div>

            {/* Step: Details */}
            {step === 'details' && (
              <div className="space-y-4">
                {interactiveCalendar ? (
                  <div>
                    <label className="label">Choose your dates</label>
                    <AvailabilityCalendar
                      listingId={id}
                      value={{ checkIn, checkOut }}
                      onChange={(ci, co) => {
                        setCheckIn(ci);
                        setCheckOut(co);
                      }}
                      cleaningFee={listing.rateRules?.[0]?.cleaningFee ?? 0}
                      accentColor={listing.stayTheme?.tokens?.palette?.primary}
                      dualMonth={false}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="label">Check-in</label>
                      <input type="date" min={today} value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">Check-out</label>
                      <input type="date" min={checkIn || today} value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)} className="input" />
                    </div>
                  </>
                )}
                <div>
                  <label className="label">Guests</label>
                  <input type="number" min={1}
                    max={listing.rateRules?.[0]?.maxGuests ?? 50} value={guests}
                    onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                    className="input" />
                  {listing.rateRules?.[0]?.maxGuests && (
                    <p className="text-xs text-gray-400 mt-1">Max {listing.rateRules[0].maxGuests} guests</p>
                  )}
                </div>
                {/* Add-ons disabled in Phase 1 launch — provider payout pipeline is queued for Phase 2.
                    Re-enable by uncommenting once provider payouts ship. */}
                {/*
                <AddOnPicker
                  listingId={id}
                  value={addOnSelections}
                  onChange={setAddOnSelections}
                  disabled={actionLoading}
                />
                */}
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                <button onClick={handleGetQuote} disabled={!checkIn || !checkOut || actionLoading}
                  className="btn-primary w-full">
                  {actionLoading ? <><span className="spinner" /> Getting quote…</> : 'Get price quote'}
                </button>
              </div>
            )}

            {/* Step: Quote */}
            {step === 'quote' && quote && (
              <div className="space-y-4">
                <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{quote.nights} night{quote.nights !== 1 ? 's' : ''} · {guests} guest{guests !== 1 ? 's' : ''}</span>
                    <span className="font-medium">{formatINR(quote.subtotal)}</span>
                  </div>
                  {quote.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cleaning fee</span>
                      <span className="font-medium">{formatINR(quote.cleaningFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform fee ({Math.round((quote.platformFeeRate ?? 0.1) * 100)}%)</span>
                    <span className="font-medium">{formatINR(quote.platformFee)}</span>
                  </div>
                  {quote.gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST ({Math.round((quote.gstRate ?? 0.18) * 100)}%)</span>
                      <span className="font-medium">{formatINR(quote.gstAmount)}</span>
                    </div>
                  )}
                  <div className="divider !my-2" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-brand-700">{formatINR(quote.total)}</span>
                  </div>
                  {quote.expiresAt && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      Quote valid until {new Date(quote.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {formatDate(checkIn)} → {formatDate(checkOut)}
                </div>
                {othersHold?.held && (
                  <HeldByOthersBanner
                    remainingSeconds={othersHold.remainingSeconds ?? 0}
                    onFree={() => {
                      setOthersHold(null);
                      void refreshOthersHold();
                    }}
                  />
                )}
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                {!user ? (
                  <button onClick={() => router.push('/auth/login')} className="btn-primary w-full">
                    Sign in to book
                  </button>
                ) : othersHold?.held ? (
                  <button disabled className="btn-primary w-full opacity-60 cursor-not-allowed">
                    Dates on hold — try again shortly
                  </button>
                ) : (
                  <button onClick={handleCreateHold} disabled={actionLoading} className="btn-primary w-full">
                    {actionLoading ? <><span className="spinner" /> Holding dates…</> : 'Hold these dates (15 min)'}
                  </button>
                )}
                <button onClick={() => { setOthersHold(null); setStep('details'); }} className="btn-ghost w-full text-sm">
                  ← Change dates
                </button>
              </div>
            )}

            {/* Step: Guest details */}
            {step === 'guestdetails' && hold && (
              <div className="space-y-4">
                {resumed && (
                  <div className="alert-info text-xs">
                    ↩ Welcome back — we resumed your held dates. Finish your booking
                    before the timer runs out.
                  </div>
                )}
                <HoldCountdown
                  expiresAt={hold.expiresAt}
                  onExpire={() => {
                    setHold(null);
                    setResumed(false);
                    setActionError('Hold expired. Please get a fresh quote.');
                    setStep('quote');
                  }}
                />
                <div className="space-y-3">
                  <div>
                    <label className="label">Full name *</label>
                    <input type="text" required value={guestDetails.fullName}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="As on ID / passport" className="input" />
                  </div>
                  <div>
                    <label className="label">Phone number *</label>
                    <input type="tel" required value={guestDetails.phone}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210" className="input" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={guestDetails.email}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com" className="input" />
                  </div>
                  <div>
                    <label className="label">Home address</label>
                    <input type="text" value={guestDetails.address}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Street, city, state" className="input" />
                  </div>
                  <div>
                    <label className="label">Estimated arrival time</label>
                    <input type="text" value={guestDetails.estimatedArrival}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, estimatedArrival: e.target.value }))}
                      placeholder="e.g. 3:00 PM" className="input" />
                  </div>
                  <div>
                    <label className="label">Special requests</label>
                    <textarea value={guestDetails.specialRequests}
                      onChange={(e) => setGuestDetails((p) => ({ ...p, specialRequests: e.target.value }))}
                      placeholder="Dietary needs, accessibility, early check-in…"
                      rows={3} className="input resize-none" />
                  </div>
                </div>
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                <button
                  onClick={() => {
                    if (!guestDetails.fullName.trim() || !guestDetails.phone.trim()) {
                      setActionError('Full name and phone number are required.');
                      return;
                    }
                    setActionError('');
                    setStep('booking');
                  }}
                  className="btn-primary w-full">
                  Continue to payment →
                </button>
                <button
                  onClick={() => requestAbandon(() => { void handleReleaseAndBack(); })}
                  className="btn-ghost w-full text-sm"
                >
                  ← Back (release hold)
                </button>
              </div>
            )}

            {/* Step: Booking — choose payment plan */}
            {step === 'booking' && hold && (
              <div className="space-y-4">
                <div className="alert-info text-xs">⏱ Dates held for 15 minutes. Complete booking now.</div>
                <p className="font-medium text-gray-900 text-sm">Choose payment plan</p>
                <div className="space-y-3">
                  {(['FULL', 'DEPOSIT_50'] as const).map((plan) => (
                    <button key={plan} type="button" onClick={() => setPaymentPlan(plan)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        paymentPlan === plan ? 'border-brand-700 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-semibold text-sm text-gray-900">
                        {plan === 'FULL' ? '💳 Pay in full' : '🔀 Pay 50% deposit'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {plan === 'FULL'
                          ? `${formatINR(quote?.total ?? 0)} now`
                          : `${formatINR(quote?.depositAmount ?? Math.ceil((quote?.total ?? 0) / 2))} now, rest before check-in`}
                      </div>
                    </button>
                  ))}
                  {/* Pay on arrival — only if the host opted this listing in */}
                  {listing.payOnArrivalEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('PAY_ON_ARRIVAL')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        paymentPlan === 'PAY_ON_ARRIVAL'
                          ? 'border-brand-700 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">🏡 Pay on arrival</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Nothing now — pay {formatINR(quote?.total ?? 0)} at the property on check-in
                      </div>
                    </button>
                  )}
                </div>
                <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
                  />
                  <span>
                    I&apos;ve read and accept the{' '}
                    <a href="/legal/terms" target="_blank" className="text-brand-700 hover:underline">
                      terms of service
                    </a>{' '}
                    and{' '}
                    <a href="/legal/cancellation" target="_blank" className="text-brand-700 hover:underline">
                      cancellation policy
                    </a>{' '}
                    (100% refund if cancelled ≥48h before check-in, 50% if 10–48h, 0% if &lt;10h).
                  </span>
                </label>
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                <button
                  onClick={handleCreateBooking}
                  disabled={actionLoading || !termsAccepted}
                  className="btn-primary w-full"
                >
                  {actionLoading ? (
                    <><span className="spinner" /> Creating booking…</>
                  ) : paymentPlan === 'PAY_ON_ARRIVAL' ? (
                    'Reserve — pay at property'
                  ) : (
                    'Confirm booking'
                  )}
                </button>
              </div>
            )}

            {/* Step: Payment */}
            {step === 'payment' && booking && (
              <div className="space-y-4">
                <div className="bg-brand-50 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking ID</span>
                    <span className="font-mono text-xs text-gray-700">{booking.id.slice(0, 12)}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-medium">{booking.plan === 'FULL' ? 'Full payment' : '50% deposit'}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Amount due now</span>
                    <span className="text-brand-700">
                      {formatINR(
                        booking.plan === 'FULL'
                          ? booking.priceSnapshot.total
                          : booking.priceSnapshot.depositAmount,
                      )}
                    </span>
                  </div>
                </div>
                <div className="alert-info text-xs">
                  🔒 Secured by Razorpay. You will be redirected to complete payment.
                </div>
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                <button onClick={handleInitPayment} disabled={actionLoading} className="btn-primary w-full">
                  {actionLoading ? <><span className="spinner" /> Processing…</> : 'Pay now →'}
                </button>
              </div>
            )}

            {/* Step: Confirmed */}
            {step === 'confirmed' && booking && (
              <div className="text-center space-y-4">
                <div className="text-5xl">🎉</div>
                <h3 className="font-bold text-gray-900">
                  {booking.plan === 'PAY_ON_ARRIVAL' ? 'Reservation confirmed!' : 'Booking confirmed!'}
                </h3>
                <p className="text-sm text-gray-500">
                  {booking.plan === 'PAY_ON_ARRIVAL'
                    ? `Your dates are reserved. Pay ${formatINR(booking.priceSnapshot.total)} at the property on check-in.`
                    : 'Your payment is processing. View your booking for the latest status.'}
                </p>
                <button onClick={() => router.push(`/bookings/${booking.id}`)} className="btn-primary w-full">
                  View booking details
                </button>
                <button onClick={() => router.push('/dashboard')} className="btn-ghost w-full text-sm">
                  Go to dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video + Location — side by side on desktop, stacked on mobile, both
          capped to the same modest height rather than each section's own
          previous full-length treatment.

          TEMPORARY PREVIEW OVERRIDE — no listing in the current dataset has
          real coordinates yet, so the real guard below never renders,
          making this layout impossible to see live. Forced on for now with
          a fallback center (India) so the map has something to draw;
          restore the real guard (and delete PREVIEW_* below) once listings
          have real lat/lng:

            {listing.latitude && listing.longitude && ( ...map card... )}

          and the wrapping grid's className back to:

            `mt-8 grid grid-cols-1 gap-6 lg:mt-10 ${listing.latitude && listing.longitude ? 'lg:grid-cols-2' : ''}`
      */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-2">
        <StayVideoSection title={listing.title} youtubeUrl={listing.youtubeUrl} />
        {(() => {
          const PREVIEW_LAT = 20.5937; // fallback only — center of India, not a real listing coordinate
          const PREVIEW_LNG = 78.9629;
          const previewLat = listing.latitude ?? PREVIEW_LAT;
          const previewLng = listing.longitude ?? PREVIEW_LNG;
          return (
            <div className="card shadow-none border-0 flex h-full flex-col p-6 lg:p-7">
              <h2 className="mb-4 font-semibold text-gray-900">Location</h2>
              <div className="h-72 overflow-hidden rounded-xl lg:h-80">
                <ListingMap
                  listings={[{ ...listing, latitude: previewLat, longitude: previewLng }]}
                  height="100%"
                  center={[previewLat, previewLng]}
                  zoom={13}
                  interactive={true}
                />
              </div>
            </div>
          );
        })()}
      </div>

      <MobileStickyBar nightlyRate={listing.rateRules?.[0]?.baseNightlyRate} visible={step === 'details'} />

      {/* Abandon-hold confirmation */}
      {showAbandonConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={dismissAbandon}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-gray-900 mb-2">Cancel your hold?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Going back will release {checkIn && checkOut ? `${formatDate(checkIn)} → ${formatDate(checkOut)}` : 'these dates'} so
              other guests can book them. This can&apos;t be undone — you&apos;ll need to hold the dates again.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmAbandon} className="btn-primary w-full">
                Yes, cancel my hold
              </button>
              <button onClick={dismissAbandon} className="btn-ghost w-full text-sm">
                Keep my hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
