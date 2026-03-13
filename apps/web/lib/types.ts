// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'GUEST' | 'HOST' | 'ADMIN';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

// ─── Host ────────────────────────────────────────────────────────────────────

export type HostVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HostUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Host {
  id: string;
  userId: string;
  verificationStatus: HostVerificationStatus;
  payoutAccountRef: string | null;
  payoutEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  user?: HostUser;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

/** Matches the RateRule DB model (included via Prisma relation). */
export interface RateRule {
  id: string;
  listingId: string;
  baseNightlyRate: number;
  cleaningFee: number;
  minNights: number;
  maxGuests: number;
}

export interface Listing {
  id: string;
  hostId: string;
  createdById: string;
  title: string;
  description: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: ListingStatus;
  needsReapproval: boolean;
  createdAt: string;
  updatedAt: string;
  /** Included when the API query uses include: { rateRules: true } */
  rateRules?: RateRule[];
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

/**
 * Matches the PriceSnapshot interface in apps/api/src/pricing/dto/quote.dto.ts.
 * Field names are intentionally identical to the backend shape.
 */
export interface PriceQuote {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  baseNightlyRate: number;
  nightlyBreakdown: Array<{ date: string; rate: number }>;
  subtotal: number;
  cleaningFee: number;
  platformFeeRate: number;
  platformFee: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  snapshotAt: string;
}

// ─── Hold ────────────────────────────────────────────────────────────────────

/** Matches the Hold DB model. */
export interface Hold {
  id: string;
  listingId: string;
  guestId: string;
  startsAt: string;
  endsAt: string;
  priceSnapshot: PriceQuote;
  expiresAt: string;
  idempotencyKey: string;
  createdAt: string;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'HOLD'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED_DEPOSIT'
  | 'BALANCE_DUE'
  | 'CONFIRMED_PAID'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'COMPLETED';

export type PaymentPlan = 'FULL' | 'DEPOSIT_50';

/** Matches the Booking DB model. priceSnapshot is the stored PriceQuote JSONB. */
export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  holdId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  plan: PaymentPlan;
  priceSnapshot: PriceQuote;
  balanceDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  payments?: Payment[];
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentStatus = 'INITIATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  type: PaymentPlan | 'BALANCE';
  status: PaymentStatus;
  gateway: string;
  gatewayOrderRef: string | null;
  gatewayPaymentRef: string | null;
  idempotencyKey: string;
  createdAt: string;
}

// ─── Payout ──────────────────────────────────────────────────────────────────

export type PayoutStatus =
  | 'NOT_ELIGIBLE'
  | 'ELIGIBLE'
  | 'SCHEDULED'
  | 'PAID'
  | 'ON_HOLD'
  | 'REVERSED';

export interface PayoutLine {
  id: string;
  hostId: string;
  listingId: string;
  bookingId: string;
  amount: number;
  eligibleAt: string;
  status: PayoutStatus;
  batchId: string | null;
  createdAt: string;
}

export interface PayoutBatch {
  id: string;
  runDate: string;
  status: PayoutStatus;
  totalAmount: number;
  createdAt: string;
  lines?: PayoutLine[];
}

export interface HostStatement {
  hostId: string;
  lines: PayoutLine[];
  totalEarned: number;
  totalPending: number;
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
