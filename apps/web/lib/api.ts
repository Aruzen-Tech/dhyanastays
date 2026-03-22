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
  CalendarBooking,
  GuestDetails,
  Hold,
  Host,
  HostPerformance,
  HostStatement,
  Listing,
  ListingMedia,
  Payment,
  PayoutBatch,
  PayoutLine,
  PriceQuote,
  RateLimitStats,
  Refund,
  RevenueDataPoint,
  RevenueForecast,
  SeasonalRate,
  SystemConfigEntry,
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

  search: (q: string) =>
    request<Listing[]>(`/listings/search?q=${encodeURIComponent(q)}`),

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

  adminGetAll: (page = 1, limit = 50) =>
    request<{ bookings: Booking[]; total: number; page: number; limit: number }>(
      `/bookings/admin/all?page=${page}&limit=${limit}`,
    ),
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

  stubConfirm: (paymentId: string) =>
    request<{ payment: Payment; message: string }>(
      `/payments/stub-confirm/${paymentId}`,
      { method: 'POST' },
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
