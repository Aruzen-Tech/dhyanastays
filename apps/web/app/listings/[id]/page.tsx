'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusBadge from '../../../components/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import {
  bookingsApi,
  formatDate,
  formatINR,
  generateUUID,
  holdsApi,
  listingsApi,
  paymentsApi,
  pricingApi,
} from '../../../lib/api';
import type { Booking, GuestDetails, Hold, Listing, PriceQuote } from '../../../lib/types';

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

// ─── Hero placeholder ─────────────────────────────────────────────────────────

const HERO_GRADIENTS: [string, string][] = [
  ['#1a5c4a', '#2d8268'],
  ['#2d5a8e', '#4a7fb5'],
  ['#6b3a2a', '#9c5a3c'],
  ['#4a3a6b', '#7a5a9c'],
  ['#3a5a2a', '#5a8a3c'],
];

function HeroPlaceholder({ id, city, state, title }: { id: string; city: string; state: string; title: string }) {
  const idx = id.charCodeAt(0) % HERO_GRADIENTS.length;
  const [from, to] = HERO_GRADIENTS[idx];
  const gradId = `hero-${id.slice(0, 8)}`;
  return (
    <svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-label={title}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="900" height="400" fill={`url(#${gradId})`} />
      <circle cx="750" cy="80" r="180" fill="white" fillOpacity="0.04" />
      <circle cx="150" cy="340" r="130" fill="white" fillOpacity="0.04" />
      <g transform="translate(420,130)" fill="white" fillOpacity="0.5">
        <polygon points="40,0 80,40 0,40" />
        <rect x="10" y="40" width="60" height="44" />
        <rect x="26" y="56" width="16" height="28" />
      </g>
      <text x="450" y="230" textAnchor="middle" fill="white" fillOpacity="0.7"
        fontSize="18" fontFamily="system-ui, sans-serif" fontWeight="600">
        {city}, {state}
      </text>
    </svg>
  );
}

type Step = 'details' | 'quote' | 'guestdetails' | 'booking' | 'payment' | 'confirmed';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

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
  const [paymentPlan, setPaymentPlan] = useState<'FULL' | 'DEPOSIT_50'>('FULL');
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

  useEffect(() => {
    listingsApi
      .getById(id)
      .then(setListing)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const today = new Date().toISOString().split('T')[0];

  const handleGetQuote = async () => {
    if (!checkIn || !checkOut) return;
    setActionError('');
    setActionLoading(true);
    try {
      const q = await pricingApi.quote({ listingId: id, checkIn, checkOut, guests });
      setQuote(q);
      setStep('quote');
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
      });
      setHold(h);
      setStep('guestdetails');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to hold dates');
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
      });
      setBooking(b);
      setStep('payment');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to create booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitPayment = async () => {
    if (!booking) return;
    setActionError('');
    setActionLoading(true);
    try {
      const result = await paymentsApi.init({
        bookingId: booking.id,
        type: paymentPlan,
        idempotencyKey: generateUUID(),
      });

      if (result.razorpayOrderId?.startsWith('stub_')) {
        // Dev stub mode — auto confirm
        await paymentsApi.stubConfirm(result.paymentId);
        setStep('confirmed');
      } else {
        // Production: open real Razorpay Checkout
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
            theme: { color: '#1a5c4a' },
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
      }
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

  const heroMedia = listing.media?.[0];

  return (
    <div className="container-page py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Listing info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="rounded-2xl overflow-hidden h-72 bg-brand-100">
            {heroMedia ? (
              <img
                src={heroMedia.url}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <HeroPlaceholder
                id={listing.id}
                city={listing.city}
                state={listing.state}
                title={listing.title}
              />
            )}
          </div>

          {/* Photo gallery (if multiple images) */}
          {listing.media && listing.media.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listing.media.slice(1, 5).map((m) => (
                <div key={m.id} className="rounded-xl overflow-hidden h-20 bg-gray-100">
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Title + status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
              <p className="text-gray-500 mt-1">
                📍 {listing.city}, {listing.state}, {listing.country}
              </p>
            </div>
            <StatusBadge status={listing.status} />
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">About this stay</h2>
            <p className="text-gray-600 leading-relaxed">{listing.description}</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: '👥', label: 'Max guests', value: listing.rateRules?.[0]?.maxGuests ?? '—' },
              { icon: '🌏', label: 'Country', value: listing.country },
              { icon: '🕐', label: 'Timezone', value: listing.timezone },
            ].map((d) => (
              <div key={d.label} className="card p-4 text-center">
                <div className="text-2xl mb-1">{d.icon}</div>
                <div className="text-xs text-gray-500">{d.label}</div>
                <div className="font-semibold text-gray-900 text-sm mt-0.5">{String(d.value)}</div>
              </div>
            ))}
          </div>

          {/* Seasonal rates (if any) */}
          {listing.seasonalRates && listing.seasonalRates.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Seasonal pricing</h2>
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
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Cancellation policy</h2>
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
        </div>

        {/* Right: Booking panel */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
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
                  <div className="divider !my-2" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-brand-700">{formatINR(quote.total)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {formatDate(checkIn)} → {formatDate(checkOut)}
                </div>
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                {!user ? (
                  <button onClick={() => router.push('/auth/login')} className="btn-primary w-full">
                    Sign in to book
                  </button>
                ) : (
                  <button onClick={handleCreateHold} disabled={actionLoading} className="btn-primary w-full">
                    {actionLoading ? <><span className="spinner" /> Holding dates…</> : 'Hold these dates (15 min)'}
                  </button>
                )}
                <button onClick={() => setStep('details')} className="btn-ghost w-full text-sm">
                  ← Change dates
                </button>
              </div>
            )}

            {/* Step: Guest details */}
            {step === 'guestdetails' && hold && (
              <div className="space-y-4">
                <div className="alert-info text-xs">
                  ⏱ Dates held for 15 minutes. Fill in your details to continue.
                </div>
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
                <button onClick={() => setStep('quote')} className="btn-ghost w-full text-sm">← Back</button>
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
                </div>
                {actionError && <div className="alert-error text-xs">{actionError}</div>}
                <button onClick={handleCreateBooking} disabled={actionLoading} className="btn-primary w-full">
                  {actionLoading ? <><span className="spinner" /> Creating booking…</> : 'Confirm booking'}
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
                <h3 className="font-bold text-gray-900">Booking confirmed!</h3>
                <p className="text-sm text-gray-500">
                  Your payment is processing. View your booking for the latest status.
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
    </div>
  );
}
