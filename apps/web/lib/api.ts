import type {
  AdminListingDetail,
  AdminNotification,
  AdminSearchResults,
  AdminStats,
  AdminUser,
  AuditEntry,
  AuthTokens,
  AvailabilityBlock,
  Booking,
  BookingDirections,
  BookingManual,
  BookingPreparation,
  CalendarBooking,
  CheckInOutStatus,
  Conversation,
  ConversationListItem,
  ConversationMessage,
  GuestDashboardStats,
  GuestDetails,
  GuestIssue,
  GuestNotification,
  GuestPreference,
  GuestProfile,
  Hold,
  Host,
  HostBookingRow,
  HostCalendarBooking,
  HostForecastBucket,
  HostListingPerformance,
  HostNotification,
  HostPerformance,
  HostRevenueDataPoint,
  HostStatement,
  HostStats,
  IssueCategory,
  IssueStatus,
  IssueUrgency,
  Listing,
  ListingMedia,
  ListingReviews,
  PayoutBatch,
  PayoutLine,
  PreparationGuide,
  PriceQuote,
  PropertyDirections,
  PropertyManual,
  RateLimitStats,
  Refund,
  Review,
  RevenueDataPoint,
  RevenueForecast,
  SeasonalRate,
  SystemConfigEntry,
  Tag,
  ListingTag,
  WishlistItem,
  ReferralInfo,
  CreditLedger,
  LoyaltyInfo,
  PayoutDryRun,
  RefundValidation,
} from './types';

// ─── Token helpers (custom JWT mode) ─────────────────────────────────────────

const ACCESS_KEY = 'ds_access';
const REFRESH_KEY = 'ds_refresh';

export const tokenStore = {
  getAccess: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null,
  getRefresh: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
  set: (tokens: AuthTokens) => {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

let _tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _tokenGetter = fn;
}

async function getToken(): Promise<string | null> {
  if (_tokenGetter) {
    return _tokenGetter();
  }
  return tokenStore.getAccess();
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  const isAuthEndpoint =
    path.startsWith('/auth/me') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register');

  if (res.status === 401 && !isRetry && !_tokenGetter) {
    const refreshToken = tokenStore.getRefresh();

    if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) {
      throw new Error('Invalid credentials');
    }

    if (isAuthEndpoint) {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired');
    }

    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens: AuthTokens = await refreshRes.json();
          tokenStore.set(newTokens);
          return request<T>(path, options, true);
        }
      } catch {
        // ignore and fall through
      }
    }

    throw new Error('Access denied');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      // ignore parse error
    }

    if (
      res.status === 401 &&
      !path.startsWith('/auth/me') &&
      !path.startsWith('/auth/logout') &&
      !path.startsWith('/auth/refresh') &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register')
    ) {
      throw new Error('Access denied');
    }

    if (path.startsWith('/auth/login') && res.status === 401) {
      throw new Error('Invalid credentials');
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    role: 'GUEST' | 'HOST';
    referralCode?: string;
  }) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// ─── Host profile ─────────────────────────────────────────────────────────────

export const hostApi = {
  getProfile: () => request<Host>('/host/profile'),
};

// ─── Admin: host approvals ────────────────────────────────────────────────────

export const adminHostsApi = {
  getPending: () => request<Host[]>('/admin/hosts/pending'),
  approve: (id: string) =>
    request<Host>(`/admin/hosts/${id}/approve`, { method: 'POST' }),
  reject: (id: string) =>
    request<Host>(`/admin/hosts/${id}/reject`, { method: 'POST' }),
};

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listingsApi = {
  getPublic: () => request<Listing[]>('/listings'),

  getTags: () => request<Tag[]>('/listings/meta/tags'),

  search: (q: string) =>
    request<Listing[]>(`/listings/search?q=${encodeURIComponent(q)}`),

  getByBounds: (swLat: number, swLng: number, neLat: number, neLng: number) =>
    request<Listing[]>(`/listings/map?swLat=${swLat}&swLng=${swLng}&neLat=${neLat}&neLng=${neLng}`),

  getById: (id: string) => request<Listing>(`/listings/${id}`),

  getHostListings: () => request<Listing[]>('/host/listings'),

  create: (body: {
    title: string;
    description: string;
    city: string;
    state: string;
    baseNightlyRate: number;
    maxGuests: number;
  }) =>
    request<Listing>('/host/listings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<{
    title: string;
    description: string;
    city: string;
    state: string;
    country: string;
    baseNightlyRate: number;
    maxGuests: number;
    minNights: number;
    cleaningFee: number;
  }>) =>
    request<Listing>(`/host/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Media
  addMedia: (id: string, body: { url: string; mediaType: string; sortOrder?: number }) =>
    request<ListingMedia>(`/host/listings/${id}/media`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteMedia: (id: string, mediaId: string) =>
    request<{ deleted: boolean }>(`/host/listings/${id}/media/${mediaId}`, {
      method: 'DELETE',
    }),

  // Seasonal rates
  addSeasonalRate: (id: string, body: { startsAt: string; endsAt: string; nightlyRate: number }) =>
    request<SeasonalRate>(`/host/listings/${id}/seasonal-rates`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getSeasonalRates: (id: string) =>
    request<SeasonalRate[]>(`/host/listings/${id}/seasonal-rates`),

  deleteSeasonalRate: (id: string, rateId: string) =>
    request<{ deleted: boolean }>(`/host/listings/${id}/seasonal-rates/${rateId}`, {
      method: 'DELETE',
    }),

  // Availability blocks
  addAvailabilityBlock: (id: string, body: { startsAt: string; endsAt: string; reason: string }) =>
    request<AvailabilityBlock>(`/host/listings/${id}/availability-blocks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getAvailabilityBlocks: (id: string) =>
    request<AvailabilityBlock[]>(`/host/listings/${id}/availability-blocks`),

  deleteAvailabilityBlock: (id: string, blockId: string) =>
    request<{ deleted: boolean }>(`/host/listings/${id}/availability-blocks/${blockId}`, {
      method: 'DELETE',
    }),

  // Tags / Amenities
  getAllTags: () =>
    request<Tag[]>('/host/tags'),

  getListingTags: (id: string) =>
    request<ListingTag[]>(`/host/listings/${id}/tags`),

  setListingTags: (id: string, tagIds: string[]) =>
    request<Listing>(`/host/listings/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    }),

  // Preparation guide
  getPreparation: (id: string) =>
    request<{ preparationGuide: PreparationGuide | null }>(`/host/listings/${id}/preparation`),

  updatePreparation: (id: string, body: Partial<PreparationGuide>) =>
    request<{ id: string; preparationGuide: PreparationGuide }>(`/host/listings/${id}/preparation`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Directions
  getDirections: (id: string) =>
    request<{ propertyDirections: PropertyDirections | null }>(`/host/listings/${id}/directions`),

  updateDirections: (id: string, body: Partial<PropertyDirections>) =>
    request<{ id: string; propertyDirections: PropertyDirections }>(`/host/listings/${id}/directions`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Manual
  getManual: (id: string) =>
    request<{ propertyManual: PropertyManual | null }>(`/host/listings/${id}/manual`),

  updateManual: (id: string, body: { sections: Array<{ title: string; content: string }> }) =>
    request<{ id: string; propertyManual: PropertyManual }>(`/host/listings/${id}/manual`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Admin
  getPending: () => request<Listing[]>('/admin/listings/pending'),

  approve: (id: string) =>
    request<Listing>(`/admin/listings/${id}/approve`, { method: 'POST' }),

  reject: (id: string, note?: string) =>
    request<Listing>(`/admin/listings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  requestChanges: (id: string, note: string) =>
    request<Listing>(`/admin/listings/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
};

// ─── Storage (presigned uploads) ──────────────────────────────────────────────

export const storageApi = {
  getPresignedUrl: (folder: string, filename: string, mimeType: string) =>
    request<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }>(
      '/storage/presigned',
      {
        method: 'POST',
        body: JSON.stringify({ folder, filename, mimeType }),
      },
    ),
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const pricingApi = {
  quote: (body: { listingId: string; checkIn: string; checkOut: string; guests?: number }) =>
    request<PriceQuote>('/pricing/quote', {
      method: 'POST',
      body: JSON.stringify({ guests: 1, ...body }),
    }),
};

// ─── Holds ────────────────────────────────────────────────────────────────────

export const holdsApi = {
  create: (body: {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guests?: number;
    idempotencyKey: string;
  }) =>
    request<Hold>('/holds', {
      method: 'POST',
      body: JSON.stringify({ guests: 1, ...body }),
    }),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  create: (body: {
    holdId: string;
    plan: 'FULL' | 'DEPOSIT_50';
    idempotencyKey: string;
    guestDetails: GuestDetails;
  }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getById: (id: string) => request<Booking>(`/bookings/${id}`),

  getMyBookings: () => request<Booking[]>('/bookings'),

  getHostBookings: () => request<Booking[]>('/bookings/host'),

  cancel: (id: string, reason: string) =>
    request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  complete: (id: string) =>
    request<Booking>(`/bookings/${id}/complete`, { method: 'POST' }),

  adminGetAll: (page = 1, limit = 50, status?: string, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return request<{ bookings: Booking[]; total: number; page: number; limit: number }>(
      `/bookings/admin/all?${params}`,
    );
  },

  getPreparation: (id: string) =>
    request<BookingPreparation>(`/bookings/${id}/preparation`),

  // Guest Assistance
  getDirections: (id: string) =>
    request<BookingDirections>(`/bookings/${id}/directions`),

  getManual: (id: string) =>
    request<BookingManual>(`/bookings/${id}/manual`),

  createIssue: (id: string, body: { category: IssueCategory; description: string; urgency?: IssueUrgency; photoUrl?: string }) =>
    request<GuestIssue>(`/bookings/${id}/issues`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getIssues: (id: string) =>
    request<GuestIssue[]>(`/bookings/${id}/issues`),

  checkIn: (id: string, body: { confirmedName: string; arrivalTime: string; specialNotes?: string }) =>
    request<Booking>(`/bookings/${id}/check-in`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  checkOut: (id: string, body: { feedback?: string; conditionNotes?: string }) =>
    request<Booking>(`/bookings/${id}/check-out`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getCheckInOutStatus: (id: string) =>
    request<CheckInOutStatus>(`/bookings/${id}/check-in-status`),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  init: (body: {
    bookingId: string;
    type: 'FULL' | 'DEPOSIT_50' | 'BALANCE';
    idempotencyKey: string;
  }) =>
    request<{ paymentId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
      '/payments/init',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  payBalance: (bookingId: string, idempotencyKey: string) =>
    request<{ paymentId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
      `/payments/bookings/${bookingId}/pay-balance`,
      { method: 'POST', body: JSON.stringify({ idempotencyKey }) },
    ),
};

// ─── Payouts ──────────────────────────────────────────────────────────────────

export const payoutsApi = {
  getEligible: () => request<PayoutLine[]>('/admin/payouts/eligible'),

  runWeekly: () =>
    request<PayoutBatch>('/admin/payouts/run-weekly', { method: 'POST' }),

  getBatches: () => request<PayoutBatch[]>('/admin/payouts/batches'),

  markBatchPaid: (batchId: string) =>
    request<PayoutBatch>(`/admin/payouts/batches/${batchId}/mark-paid`, {
      method: 'POST',
    }),

  getHostStatements: () => request<HostStatement>('/host/payouts/statements'),

  dryRun: () =>
    request<PayoutDryRun>('/admin/payouts/dry-run'),
};

// ─── Admin Console ───────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => request<AdminStats>('/admin/stats'),

  getUsers: (page = 1, limit = 20, role?: string, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    return request<{ users: AdminUser[]; total: number; page: number; limit: number }>(
      `/admin/users?${params}`,
    );
  },

  deactivateUser: (id: string) =>
    request<AdminUser>(`/admin/users/${id}/deactivate`, { method: 'POST' }),

  activateUser: (id: string) =>
    request<AdminUser>(`/admin/users/${id}/activate`, { method: 'POST' }),

  getAuditLog: (page = 1, limit = 30, action?: string, resourceType?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action) params.set('action', action);
    if (resourceType) params.set('resourceType', resourceType);
    return request<{ entries: AuditEntry[]; total: number; page: number; limit: number }>(
      `/admin/audit-log?${params}`,
    );
  },

  // Revenue analytics
  getRevenue: (from: string, to: string, groupBy: 'day' | 'week' | 'month') =>
    request<RevenueDataPoint[]>(
      `/admin/analytics/revenue?from=${from}&to=${to}&groupBy=${groupBy}`,
    ),

  // Listing detail
  getListingDetail: (id: string) =>
    request<AdminListingDetail>(`/admin/listings/${id}`),

  // Refunds
  getRefunds: (page = 1, limit = 20) =>
    request<{ refunds: Refund[]; total: number; page: number; limit: number }>(
      `/admin/refunds?page=${page}&limit=${limit}`,
    ),
  createRefund: (body: { bookingId: string; amount: number; reason: string }) =>
    request<Refund>('/admin/refunds', { method: 'POST', body: JSON.stringify(body) }),
  validateRefundBooking: (bookingId: string) =>
    request<RefundValidation>(`/admin/refunds/validate/${encodeURIComponent(bookingId)}`),

  // System settings
  getSettings: () => request<SystemConfigEntry[]>('/admin/settings'),
  updateSettings: (updates: Array<{ key: string; value: unknown }>) =>
    request<SystemConfigEntry[]>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }),

  // Calendar
  getCalendarBookings: (month: string, listingId?: string) => {
    const params = new URLSearchParams({ month });
    if (listingId) params.set('listingId', listingId);
    return request<CalendarBooking[]>(`/admin/bookings/calendar?${params}`);
  },

  // Host performance
  getHostPerformance: () => request<HostPerformance[]>('/admin/hosts/performance'),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    request<AdminNotification[]>(`/admin/notifications?unreadOnly=${unreadOnly}`),
  markNotificationRead: (id: string) =>
    request<AdminNotification>(`/admin/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request<{ count: number }>('/admin/notifications/read-all', { method: 'POST' }),

  // Bulk actions
  bulkApproveListings: (ids: string[]) =>
    request<{ count: number }>('/admin/listings/bulk-approve', {
      method: 'POST', body: JSON.stringify({ ids }),
    }),
  bulkDeactivateUsers: (ids: string[]) =>
    request<{ count: number }>('/admin/users/bulk-deactivate', {
      method: 'POST', body: JSON.stringify({ ids }),
    }),
  bulkCompleteBookings: (ids: string[]) =>
    request<{ count: number }>('/admin/bookings/bulk-complete', {
      method: 'POST', body: JSON.stringify({ ids }),
    }),

  // Global search
  search: (q: string) =>
    request<AdminSearchResults>(`/admin/search?q=${encodeURIComponent(q)}`),

  // Admin activity
  getAdminActivity: (page = 1, limit = 30, adminId?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (adminId) params.set('adminId', adminId);
    return request<{ entries: AuditEntry[]; total: number; page: number; limit: number }>(
      `/admin/activity?${params}`,
    );
  },

  // Rate limiter
  getRateLimitStats: () => request<RateLimitStats>('/admin/rate-limits/stats'),

  // Revenue forecast
  getForecast: () => request<RevenueForecast[]>('/admin/analytics/forecast'),
};

// ─── Host Analytics ──────────────────────────────────────────────────────────

export const hostAnalyticsApi = {
  getStats: () => request<HostStats>('/host/analytics/stats'),

  getRevenue: (from: string, to: string, groupBy: 'day' | 'week' | 'month') =>
    request<HostRevenueDataPoint[]>(
      `/host/analytics/revenue?from=${from}&to=${to}&groupBy=${groupBy}`,
    ),

  getListingPerformance: () =>
    request<HostListingPerformance[]>('/host/analytics/listing-performance'),

  getForecast: () => request<HostForecastBucket[]>('/host/analytics/forecast'),

  getCalendarBookings: (month: string, listingId?: string) => {
    const params = new URLSearchParams({ month });
    if (listingId) params.set('listingId', listingId);
    return request<HostCalendarBooking[]>(`/host/bookings/calendar?${params}`);
  },

  getBookings: (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return request<{ bookings: HostBookingRow[]; total: number; page: number; limit: number }>(
      `/host/bookings/list?${params}`,
    );
  },

  getNotifications: (unreadOnly = false) =>
    request<HostNotification[]>(`/host/notifications?unreadOnly=${unreadOnly}`),

  markNotificationRead: (id: string) =>
    request<HostNotification>(`/host/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    request<{ count: number }>('/host/notifications/read-all', { method: 'POST' }),
};

// ─── Guest ───────────────────────────────────────────────────────────────────

export const guestApi = {
  // Profile
  getProfile: () => request<GuestProfile>('/guest/profile'),
  updateProfile: (body: { fullName?: string; phone?: string }) =>
    request<GuestProfile>('/guest/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Dashboard stats
  getStats: () => request<GuestDashboardStats>('/guest/stats'),

  // Preferences
  getPreferences: () => request<GuestPreference | null>('/guest/preferences'),
  updatePreferences: (body: Partial<Omit<GuestPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
    request<GuestPreference>('/guest/preferences', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Wishlist
  getWishlist: () => request<WishlistItem[]>('/guest/wishlist'),
  addToWishlist: (listingId: string) =>
    request<WishlistItem>(`/guest/wishlist/${listingId}`, { method: 'POST' }),
  removeFromWishlist: (listingId: string) =>
    request<{ success: boolean }>(`/guest/wishlist/${listingId}`, { method: 'DELETE' }),
  isWishlisted: (listingId: string) =>
    request<{ wishlisted: boolean }>(`/guest/wishlist/check/${listingId}`),

  // Reviews
  createReview: (body: { bookingId: string; rating: number; comment?: string }) =>
    request<Review>('/guest/reviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMyReviews: () => request<Review[]>('/guest/reviews'),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    request<GuestNotification[]>(`/guest/notifications?unreadOnly=${unreadOnly}`),
  getUnreadCount: () =>
    request<{ count: number }>('/guest/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    request<GuestNotification>(`/guest/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/guest/notifications/read-all', { method: 'POST' }),

  // Loyalty
  getLoyalty: () => request<LoyaltyInfo>('/guest/loyalty'),

  // Referral
  getReferral: () => request<ReferralInfo>('/guest/referral'),
  applyReferralCode: (referralCode: string) =>
    request<void>('/guest/referral/apply', {
      method: 'POST',
      body: JSON.stringify({ referralCode }),
    }),
  getCredits: () => request<CreditLedger>('/guest/credits'),
};

// ─── Listing Reviews (public) ────────────────────────────────────────────────

export const reviewsApi = {
  getListingReviews: (listingId: string) =>
    request<ListingReviews>(`/listings/${listingId}/reviews`),
};

// ─── Messaging ───────────────────────────────────────────────────────────────

function createMessagingApi(prefix: string) {
  return {
    getConversations: () =>
      request<ConversationListItem[]>(`/${prefix}/conversations`),

    getConversation: (id: string) =>
      request<Conversation>(`/${prefix}/conversations/${id}`),

    startConversation: (body: {
      recipientId: string;
      listingId?: string;
      bookingId?: string;
      subject?: string;
      message: string;
    }) =>
      request<Conversation>(`/${prefix}/conversations`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    sendMessage: (conversationId: string, body: string) =>
      request<ConversationMessage>(`/${prefix}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),

    markRead: (conversationId: string) =>
      request<{ success: boolean }>(`/${prefix}/conversations/${conversationId}/read`, {
        method: 'POST',
      }),

    getUnreadCount: () =>
      request<{ count: number }>(`/${prefix}/conversations/unread-count`),
  };
}

// ─── Host Issues ────────────────────────────────────────────────────────────

export const hostIssuesApi = {
  getAll: (status?: IssueStatus) => {
    const params = status ? `?status=${status}` : '';
    return request<GuestIssue[]>(`/host/issues${params}`);
  },

  updateStatus: (id: string, body: { status: IssueStatus; hostNotes?: string }) =>
    request<GuestIssue>(`/host/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ─── Admin Issues ───────────────────────────────────────────────────────────

export const adminIssuesApi = {
  getAll: (status?: IssueStatus) => {
    const params = status ? `?status=${status}` : '';
    return request<GuestIssue[]>(`/admin/issues${params}`);
  },

  updateStatus: (id: string, body: { status: IssueStatus; hostNotes?: string }) =>
    request<GuestIssue>(`/admin/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export const guestMessagingApi = createMessagingApi('guest');
export const hostMessagingApi = createMessagingApi('host');
export const adminMessagingApi = createMessagingApi('admin');

// ─── Utility ──────────────────────────────────────────────────────────────────

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
