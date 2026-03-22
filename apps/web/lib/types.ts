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

export interface RateRule {
  id: string;
  listingId: string;
  baseNightlyRate: number;
  cleaningFee: number;
  minNights: number;
  maxGuests: number;
}

export interface ListingMedia {
  id: string;
  listingId: string;
  url: string;
  mediaType: string;
  sortOrder: number;
  createdAt: string;
}

export interface SeasonalRate {
  id: string;
  listingId: string;
  startsAt: string;
  endsAt: string;
  nightlyRate: number;
  createdAt: string;
}

export interface AvailabilityBlock {
  id: string;
  listingId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
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
  rateRules?: RateRule[];
  media?: ListingMedia[];
  seasonalRates?: SeasonalRate[];
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

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

// ─── Guest Details ────────────────────────────────────────────────────────────

export interface GuestDetails {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  estimatedArrival?: string;
  specialRequests?: string;
}

// ─── Hold ────────────────────────────────────────────────────────────────────

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
  guestDetails?: GuestDetails;
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

// ─── Admin Dashboard ────────────────────────────────────────────────────────

export interface AdminStats {
  users: {
    total: number;
    guests: number;
    hosts: number;
    admins: number;
    pendingHosts: number;
  };
  listings: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    pendingPayment: number;
  };
  revenue: {
    totalCollected: number;
    platformFees: number;
  };
  payouts: {
    eligibleAmount: number;
    paidAmount: number;
  };
  recentBookings: Array<Booking & {
    guest?: { fullName: string; email: string };
  }>;
  recentAudit: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: { fullName: string; email: string } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  host?: {
    id: string;
    verificationStatus: HostVerificationStatus;
    payoutEnabled: boolean;
  } | null;
  _count?: { bookings: number };
}

// ─── Revenue Analytics ──────────────────────────────────────────────────────

export interface RevenueDataPoint {
  period: string;
  totalCollected: number;
  platformFees: number;
  hostShare: number;
  bookingCount: number;
}

// ─── Admin Listing Detail ───────────────────────────────────────────────────

export interface AdminListingDetail extends Listing {
  media: ListingMedia[];
  rateRules: RateRule[];
  seasonalRates: SeasonalRate[];
  availabilityBlocks: AvailabilityBlock[];
  host: { id: string; userId: string; user: { fullName: string; email: string } };
  bookings: Array<Booking & { guest?: { fullName: string; email: string } }>;
  totalRevenue: number;
  bookingCount: number;
}

// ─── Refund ─────────────────────────────────────────────────────────────────

export interface Refund {
  id: string;
  bookingId: string;
  paymentId: string | null;
  amount: number;
  reason: string;
  gatewayRefundRef: string | null;
  createdAt: string;
  booking?: Booking;
}

// ─── System Config ──────────────────────────────────────────────────────────

export interface SystemConfigEntry {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string | null;
}

// ─── Admin Notification ─────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Calendar ───────────────────────────────────────────────────────────────

export interface CalendarBooking {
  id: string;
  listingId: string;
  listingTitle: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
}

// ─── Host Performance ───────────────────────────────────────────────────────

export interface HostPerformance {
  hostId: string;
  hostName: string;
  hostEmail: string;
  totalListings: number;
  approvedListings: number;
  totalBookings: number;
  completedBookings: number;
  occupancyRate: number;
  totalRevenue: number;
  avgBookingValue: number;
}

// ─── Global Search ──────────────────────────────────────────────────────────

export interface AdminSearchResults {
  users: Array<{ id: string; fullName: string; email: string; role: UserRole }>;
  bookings: Array<{ id: string; status: BookingStatus; startsAt: string; endsAt: string; listingTitle: string }>;
  listings: Array<{ id: string; title: string; city: string; status: ListingStatus }>;
  hosts: Array<{ id: string; userId: string; fullName: string; email: string; verificationStatus: HostVerificationStatus }>;
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

export interface RateLimitStats {
  totalBlocked: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  recentBlocked: Array<{ ip: string; path: string; blockedAt: string }>;
}

// ─── Revenue Forecast ───────────────────────────────────────────────────────

export interface RevenueForecast {
  period: string;
  confirmedRevenue: number;
  expectedDeposits: number;
  expectedBalance: number;
  bookingCount: number;
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
