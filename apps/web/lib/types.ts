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

export interface Tag {
  id: string;
  category: string;
  name: string;
}

export interface ListingTag {
  listingId: string;
  tagId: string;
  tag: Tag;
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
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  status: ListingStatus;
  needsReapproval: boolean;
  createdAt: string;
  updatedAt: string;
  rateRules?: RateRule[];
  media?: ListingMedia[];
  seasonalRates?: SeasonalRate[];
  tags?: ListingTag[];
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

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
  addOnsTotal: number;
  addOns: PriceSnapshotAddOn[];
  total: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  snapshotAt: string;
  hmac?: string;
}

// ─── Add-ons ─────────────────────────────────────────────────────────────────

export type CancellationTier =
  | 'FLEXIBLE'
  | 'MODERATE'
  | 'STRICT'
  | 'NON_REFUNDABLE';

export type AddOnScope = 'GLOBAL' | 'CLUSTER' | 'LISTING';
export type AddOnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETIRED';
export type AddOnState =
  | 'QUOTED'
  | 'HELD'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type ServiceProviderKind =
  | 'TRANSPORT'
  | 'FOOD'
  | 'WELLNESS'
  | 'EXPERIENCE'
  | 'CONCIERGE'
  | 'HOUSEKEEPING';

export interface ServiceProvider {
  id: string;
  name: string;
  kind: ServiceProviderKind;
  ownerUserId: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; email: string };
  _count?: { addOns: number };
}

export interface AddOn {
  id: string;
  providerId: string;
  title: string;
  description: string;
  priceMinor: number;
  commissionRate: number;
  currency: string;
  cancellationTier: CancellationTier;
  minLeadHours: number;
  maxPerBooking: number;
  scope: AddOnScope;
  clusterId?: string | null;
  listingId?: string | null;
  status: AddOnStatus;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: { id: string; name: string; kind: ServiceProviderKind };
  listing?: { id: string; title: string } | null;
}

export interface AddOnSelection {
  addOnId: string;
  quantity: number;
}

export interface BookingAddOn {
  id: string;
  bookingId: string;
  addOnId: string;
  providerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commission: number;
  providerShare: number;
  state: AddOnState;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  refundAmount?: number | null;
  createdAt: string;
  addOn?: {
    title: string;
    description: string;
    cancellationTier: CancellationTier;
    provider: { name: string; kind: ServiceProviderKind };
  };
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

export type PaymentPlan = 'FULL' | 'DEPOSIT_50' | 'PAY_LATER';

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  holdId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  plan: PaymentPlan;
  payLaterMonths?: number | null;
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
  payLaterSeq?: number | null;
  createdAt: string;
}

// ─── Pay Later ───────────────────────────────────────────────────────────────

export type PayLaterStatus =
  | 'SCHEDULED'
  | 'OVERDUE'
  | 'DEFAULTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PayLaterInstalment {
  id: string;
  planId: string;
  seq: number;
  amountMinor: number;
  dueAt: string;
  paidAt: string | null;
  paymentId: string | null;
  remindersSent: number;
  lastReminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayLaterPlan {
  id: string;
  bookingId: string;
  months: number;
  totalMinor: number;
  currency: string;
  status: PayLaterStatus;
  createdAt: string;
  updatedAt: string;
  instalments: PayLaterInstalment[];
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

export interface PayoutDryRunHost {
  hostId: string;
  hostName: string;
  hostEmail: string;
  lineCount: number;
  amount: number;
}

export interface PayoutDryRun {
  lineCount: number;
  totalAmount: number;
  hostCount: number;
  breakdown: PayoutDryRunHost[];
}

export interface RefundValidation {
  bookingId: string;
  status: string;
  listingTitle: string;
  guestName: string;
  guestEmail: string;
  totalPaid: number;
  totalRefunded: number;
  maxRefundable: number;
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

// ─── Staff Applications & Role Management ───────────────────────────────────

export type AdminLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type ServiceType = 'TRANSPORT' | 'FOOD' | 'WELLNESS' | 'EXPERIENCE' | 'CONCIERGE' | 'HOUSEKEEPING';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const ADMIN_LEVEL_LABELS: Record<AdminLevel, string> = {
  L1: 'Super Admin (Platform)',
  L2: 'Operations Admin',
  L3: 'Cluster / Regional Admin',
  L4: 'Property Admin',
  L5: 'Service Admin',
};

export interface StaffRole {
  level: AdminLevel;
  serviceType?: ServiceType | null;
  clusterId?: string | null;
  propertyId?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  kind?: string | null;
  isActive: boolean;
  createdAt: string;
  staffRole?: StaffRole | null;
}

export interface UserRoleHistoryEntry {
  id: string;
  actor: { id: string; email: string | null; fullName: string | null };
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  createdAt: string;
}

export interface UserRoleHistory {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    kind: string | null;
    createdAt: string;
    staffRole?: { level: AdminLevel; revokedAt: string | null } | null;
  };
  history: UserRoleHistoryEntry[];
}

export interface StaffApplication {
  id: string;
  applicantId?: string | null;
  email: string;
  fullName: string;
  requestedLevel: AdminLevel;
  requestedService?: ServiceType | null;
  clusterId?: string | null;
  propertyId?: string | null;
  justification: string;
  status: ApplicationStatus;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Host Analytics ─────────────────────────────────────────────────────────

export interface HostStats {
  totalListings: number;
  activeListings: number;
  totalBookings: number;
  totalRevenue: number;
  totalEarned: number;
  occupancyRate: number;
  upcomingCheckins: number;
}

export interface HostRevenueDataPoint {
  period: string;
  revenue: number;
  bookings: number;
}

export interface HostListingPerformance {
  listingId: string;
  title: string;
  city: string;
  state: string;
  status: ListingStatus;
  baseRate: number;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  bookedDays30: number;
}

export interface HostForecastBucket {
  label: string;
  days: number;
  revenue: number;
  bookings: number;
}

export interface HostCalendarBooking {
  id: string;
  listingId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  priceSnapshot: PriceQuote;
  listing: { id: string; title: string; city: string };
  guest: { fullName: string; email: string };
}

export interface HostBookingRow {
  id: string;
  listingId: string;
  guestId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  plan: PaymentPlan;
  priceSnapshot: PriceQuote;
  createdAt: string;
  listing: { id: string; title: string; city: string; state: string };
  guest: { fullName: string; email: string };
  payments: Payment[];
}

export interface HostNotification {
  id: string;
  hostId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Guest Profile ──────────────────────────────────────────────────────────

export interface GuestProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  _count: {
    bookings: number;
    reviews: number;
    wishlists: number;
  };
}

export interface GuestDashboardStats {
  totalBookings: number;
  upcomingStays: number;
  completedStays: number;
  totalSpent: number;
}

// ─── Wishlist ───────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  listingId: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    status: ListingStatus;
    media: ListingMedia[];
    rateRules: { baseNightlyRate: number; maxGuests: number }[];
  };
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  listingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { fullName: string; avatarUrl: string | null };
  listing?: { id: string; title: string; city: string; state: string };
}

export interface ListingReviews {
  reviews: Review[];
  avgRating: number;
  count: number;
}

// ─── Guest Notification ─────────────────────────────────────────────────────

export interface GuestNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Messaging ─────────────────────────────────────────────────────────────

export interface MessageUser {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender: MessageUser;
}

export interface Conversation {
  id: string;
  type: 'GUEST_HOST' | 'HOST_ADMIN';
  subject: string | null;
  userOne: MessageUser;
  userTwo: MessageUser;
  listing: { id: string; title: string } | null;
  booking: { id: string; status: BookingStatus; startsAt: string; endsAt: string } | null;
  messages: ConversationMessage[];
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  type: 'GUEST_HOST' | 'HOST_ADMIN';
  subject: string | null;
  otherUser: MessageUser;
  listing: { id: string; title: string } | null;
  lastMessage: { body: string; createdAt: string; senderId: string; isRead: boolean } | null;
  unreadCount: number;
  updatedAt: string;
}

// ─── Guest Preferences ─────────────────────────────────────────────────────

export interface GuestPreference {
  id: string;
  userId: string;
  dietaryNeeds: string[];
  wellnessInterests: string[];
  accessibility: string | null;
  roomPreference: string | null;
  experienceLevel: string | null;
  arrivalPreference: string | null;
  emergencyContact: { name: string; phone: string; relation: string } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Preparation Guide ────────────────────────────────────────────────────

export interface PreparationGuide {
  packingList?: string[];
  whatToExpect?: string;
  dailySchedule?: string;
  dietaryInfo?: string;
  arrivalInstructions?: string;
  additionalNotes?: string;
}

export interface BookingPreparation {
  bookingId: string;
  listingTitle: string;
  preparationGuide: PreparationGuide | null;
}

// ─── Guest Assistance ─────────────────────────────────────────────────────────

export interface PropertyDirections {
  address?: string;
  gpsLat?: number;
  gpsLng?: number;
  landmarks?: string;
  transportOptions?: string;
  parkingInfo?: string;
  nearestAirport?: string;
  nearestStation?: string;
  additionalNotes?: string;
}

export interface BookingDirections {
  bookingId: string;
  listingTitle: string;
  propertyDirections: PropertyDirections | null;
}

export interface ManualSection {
  title: string;
  content: string;
}

export interface PropertyManual {
  sections: ManualSection[];
}

export interface BookingManual {
  bookingId: string;
  listingTitle: string;
  propertyManual: PropertyManual | null;
}

export type IssueCategory = 'MAINTENANCE' | 'CLEANLINESS' | 'NOISE' | 'SAFETY' | 'OTHER';
export type IssueUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface GuestIssue {
  id: string;
  bookingId: string;
  listingId: string;
  guestId: string;
  category: IssueCategory;
  description: string;
  urgency: IssueUrgency;
  photoUrl: string | null;
  status: IssueStatus;
  hostNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: { id: string; title: string };
  guest?: { fullName: string; email: string };
  booking?: { id: string; startsAt: string; endsAt: string };
}

export interface CheckInData {
  confirmedName: string;
  arrivalTime: string;
  specialNotes: string | null;
  checkedInAt: string;
}

export interface CheckOutData {
  feedback: string | null;
  conditionNotes: string | null;
  checkedOutAt: string;
}

export interface CheckInOutStatus {
  bookingId: string;
  checkInData: CheckInData | null;
  checkOutData: CheckOutData | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

// ─── Referral & Credits ─────────────────────────────────────────────────────

export type ReferralStatus = 'PENDING' | 'SIGNED_UP' | 'FIRST_BOOKING' | 'CREDITED';

export interface ReferralEntry {
  id: string;
  guestName: string;
  status: ReferralStatus;
  credit: number; // paise
  creditedAt: string | null;
  createdAt: string;
}

export interface ReferralInfo {
  referralCode: string;
  shareUrl: string;
  referrerReward: number; // paise
  referredReward: number; // paise
  totalReferrals: number;
  creditedReferrals: number;
  totalEarned: number; // paise
  creditBalance: number; // paise
  referrals: ReferralEntry[];
}

export interface CreditLedgerEntry {
  id: string;
  amount: number; // paise
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export interface CreditLedger {
  balance: number; // paise
  entries: CreditLedgerEntry[];
}

// ─── Loyalty Tier ──────────────────────────────────────────────────────────────

export type LoyaltyTier = 'SEEKER' | 'PRACTITIONER' | 'SAGE';

export interface LoyaltyInfo {
  tier: LoyaltyTier;
  label: string;
  icon: string;
  description: string;
  color: string;
  completedStays: number;
  nextTier: string | null;
  staysToNext: number;
  platformFeeDiscount: number;
  benefits: string[];
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

// ─── Phase 2 §5.13: Rewards & Membership ────────────────────────────────────

export type MemberTier =
  | 'EXPLORER'
  | 'WANDERER'
  | 'SOJOURNER'
  | 'PATRON'
  | 'AMBASSADOR';

export type SipStatusValue = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface Membership {
  tier: MemberTier;
  points: number;
  tierSince: string;
  nextTierAt: number;
  pointsToNextTier: number;
  discountRate: number;
}

export interface Perk {
  id: string;
  tier: MemberTier;
  title: string;
  description: string;
}

export interface MemberPerks {
  tier: MemberTier;
  perks: Perk[];
}

export interface TripSip {
  id: string;
  userId: string;
  monthlyMinor: number;
  anchorDay: number;
  startedAt: string;
  closedAt: string | null;
  status: SipStatusValue;
  _count?: { contributions: number };
}

export interface SipContribution {
  id: string;
  sipId: string;
  amountMinor: number;
  depositedAt: string;
  ledgerEventId: string;
  paymentRef: string | null;
}

export interface TripSipDetail extends TripSip {
  contributions: SipContribution[];
}

export interface SipBalance {
  balance: number;
}
