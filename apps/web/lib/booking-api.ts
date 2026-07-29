import {
  getStoredAccessToken,
  refreshStoredSession,
} from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type AvailabilityDayState =
  | "PAST"
  | "AVAILABLE"
  | "BOOKED"
  | "HELD"
  | "BLOCKED";

export interface AvailabilityDay {
  date: string;
  state: AvailabilityDayState;
  priceMinor: number;
  isSeasonal: boolean;
  isTurnover: boolean;
  minNights: number;
  heldUntil?: string;
}

export interface ListingAvailability {
  listingId: string;
  from: string;
  to: string;
  days: AvailabilityDay[];
}

export interface QuoteAddOnSelection {
  addOnId: string;
  quantity: number;
}

export interface PricingQuotePayload {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  addOns?: QuoteAddOnSelection[];
}

export interface PriceSnapshotAddOn {
  addOnId: string;
  providerId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commission: number;
  providerShare: number;
  cancellationTier: string;
}

export interface PriceSnapshot {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  baseNightlyRate: number;
  nightlyBreakdown: Array<{
    date: string;
    rate: number;
  }>;
  subtotal: number;
  cleaningFee: number;
  platformFeeRate: number;
  platformFee: number;
  loyaltyDiscount?: number;
  loyaltyTier?: string;
  addOnsTotal: number;
  addOns: PriceSnapshotAddOn[];
  gstRate: number;
  gstAmount: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  payLaterFirstInstalment?: Array<{
    months: number;
    amountMinor: number;
  }>;
  currency: string;
  snapshotAt: string;
  expiresAt: string;
  hmac?: string;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

function getErrorMessage(
  body: ApiErrorBody | null,
  fallback: string,
): string {
  if (Array.isArray(body?.message)) {
    return body.message.join(", ");
  }

  return body?.message ?? body?.error ?? fallback;
}

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        body as ApiErrorBody | null,
        `Request failed with status ${response.status}`,
      ),
    );
  }

  return body as T;
}

export function getListingAvailability(
  listingId: string,
  from: string,
  to: string,
): Promise<ListingAvailability> {
  const query = new URLSearchParams({ from, to });

  return apiRequest<ListingAvailability>(
    `/listings/${encodeURIComponent(listingId)}/availability?${query}`,
  );
}

export function createPricingQuote(
  payload: PricingQuotePayload,
): Promise<PriceSnapshot> {
  return apiRequest<PriceSnapshot>("/pricing/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function minorToRupees(amountMinor: number): number {
  return amountMinor / 100;
}


export interface CreateHoldPayload {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  idempotencyKey: string;
  addOns?: QuoteAddOnSelection[];
}

export interface BookingHold {
  id: string;
  listingId: string;
  guestId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  priceSnapshot: PriceSnapshot;
  idempotencyKey: string;
  createdAt?: string;
  updatedAt?: string;
}

async function authenticatedApiRequest<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const sendRequest = (accessToken: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

  let accessToken = getStoredAccessToken();

  if (!accessToken) {
    const refreshed = await refreshStoredSession();
    accessToken = refreshed.accessToken;
  }

  let response = await sendRequest(accessToken);

  if (response.status === 401) {
    const refreshed = await refreshStoredSession();
    response = await sendRequest(refreshed.accessToken);
  }

  const body = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        body as ApiErrorBody | null,
        `Request failed with status ${response.status}`,
      ),
    );
  }

  return body as T;
}

export function createBookingHold(
  payload: CreateHoldPayload,
): Promise<BookingHold> {
  return authenticatedApiRequest<BookingHold>("/holds", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function getActiveBookingHold(
  listingId: string,
): Promise<BookingHold | null> {
  const params = new URLSearchParams({ listingId });

  return authenticatedApiRequest<BookingHold | null>(
    `/holds/active?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export function releaseBookingHold(
  holdId: string,
): Promise<{
  released: boolean;
  alreadyGone?: boolean;
}> {
  return authenticatedApiRequest(
    `/holds/${encodeURIComponent(holdId)}`,
    {
      method: "DELETE",
    },
  );
}


export interface PublicListingAddOnProvider {
  id: string;
  name: string;
  kind: string;
}

export interface PublicListingAddOn {
  id: string;
  providerId: string;
  title: string;
  description: string;
  priceMinor: number;
  commissionRate: number;
  cancellationTier: string;
  minLeadHours: number;
  maxPerBooking: number;
  scope: string;
  clusterId?: string | null;
  listingId?: string | null;
  status: string;
  provider: PublicListingAddOnProvider;
}

export function getListingAddOns(
  listingId: string,
): Promise<PublicListingAddOn[]> {
  return apiRequest<PublicListingAddOn[]>(
    `/listings/${encodeURIComponent(listingId)}/addons`,
    {
      method: "GET",
    },
  );
}


export type BookingPaymentPlan =
  | "FULL"
  | "DEPOSIT_50"
  | "PAY_LATER"
  | "PAY_ON_ARRIVAL";

export interface BookingGuestDetails {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  estimatedArrival?: string;
  specialRequests?: string;
}

export interface CreateBookingPayload {
  holdId: string;
  plan: BookingPaymentPlan;
  payLaterMonths?: 3 | 6 | 12;
  idempotencyKey: string;
  guestDetails: BookingGuestDetails;
  acceptedTermsAt: string;
}

export interface CreatedBooking {
  id: string;
  status?: string;
  plan?: BookingPaymentPlan;
  [key: string]: unknown;
}

export function createBooking(
  payload: CreateBookingPayload,
): Promise<CreatedBooking> {
  return authenticatedApiRequest<CreatedBooking>("/bookings", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}


export interface BookingDetails {
  id: string;
  listingId: string;
  guestId: string;
  holdId: string;
  status: string;
  plan: BookingPaymentPlan;
  startsAt: string;
  endsAt: string;
  priceSnapshot: PriceSnapshot;
  guestDetails: BookingGuestDetails;
  acceptedTermsAt?: string;
  createdAt?: string;
  updatedAt?: string;
  listing?: {
    id: string;
    title: string;
    city?: string;
    state?: string;
    country?: string;
  };
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    type: string;
  }>;
}

export function getBookingById(
  bookingId: string,
): Promise<BookingDetails> {
  return authenticatedApiRequest<BookingDetails>(
    `/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "GET",
    },
  );
}
