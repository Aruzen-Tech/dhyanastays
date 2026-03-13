import type {
  AuthTokens,
  Booking,
  Hold,
  Host,
  HostStatement,
  Listing,
  Payment,
  PayoutBatch,
  PayoutLine,
  PriceQuote,
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

/**
 * Pluggable token getter — replaced by AuthContext in Auth0 mode.
 *
 * In Auth0 mode, AuthContext calls `setTokenGetter(() => getAccessTokenSilently())`
 * so all API calls automatically use the Auth0 access token.
 */
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

  // Auto-refresh on 401 (custom JWT mode only — Auth0 handles refresh internally)
  if (res.status === 401 && !isRetry && !_tokenGetter) {
    const refreshToken = tokenStore.getRefresh();

    // Never force session-expired behavior for login/register endpoints.
    // Their 401 should surface as "Invalid credentials".
    if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) {
      throw new Error('Invalid credentials');
    }

    // For other auth endpoints, clear stale session.
    if (isAuthEndpoint) {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired');
    }

    // For protected non-auth endpoints, only refresh if we actually have a refresh token.
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
        // ignore and fall through to non-auth 401 handling below
      }
    }

    // Keep user on page for RBAC 401s (e.g., not admin) without forced logout.
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

    // Do not surface raw unauthorized message for protected, non-auth endpoints.
    // Keep UX stable by returning a generic access-denied message.
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

  // 204 No Content
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
  /** GET /api/host/profile — returns the authenticated host's profile + verification status */
  getProfile: () => request<Host>('/host/profile'),
};

// ─── Admin: host approvals ────────────────────────────────────────────────────

export const adminHostsApi = {
  /** GET /api/admin/hosts/pending — list hosts awaiting verification */
  getPending: () => request<Host[]>('/admin/hosts/pending'),

  /** POST /api/admin/hosts/:id/approve */
  approve: (id: string) =>
    request<Host>(`/admin/hosts/${id}/approve`, { method: 'POST' }),

  /** POST /api/admin/hosts/:id/reject */
  reject: (id: string) =>
    request<Host>(`/admin/hosts/${id}/reject`, { method: 'POST' }),
};

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listingsApi = {
  /** Public discovery feed — APPROVED listings with rateRules included */
  getPublic: () => request<Listing[]>('/listings'),

  getById: (id: string) => request<Listing>(`/listings/${id}`),

  // Host
  /** Returns all listings owned by the authenticated host (any status) */
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
  }>) =>
    request<Listing>(`/host/listings/${id}`, {
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

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const pricingApi = {
  /**
   * Backend QuoteDto requires: listingId, checkIn, checkOut, guests (Int ≥ 1).
   * guests defaults to 1 if not provided.
   */
  quote: (body: { listingId: string; checkIn: string; checkOut: string; guests?: number }) =>
    request<PriceQuote>('/pricing/quote', {
      method: 'POST',
      body: JSON.stringify({ guests: 1, ...body }),
    }),
};

// ─── Holds ────────────────────────────────────────────────────────────────────

export const holdsApi = {
  /**
   * Backend CreateHoldDto requires: listingId, checkIn, checkOut, guests (Int ≥ 1), idempotencyKey.
   * guests defaults to 1 if not provided.
   */
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
  /**
   * Backend CreateBookingDto expects: holdId, plan (not paymentPlan), idempotencyKey.
   */
  create: (body: {
    holdId: string;
    plan: 'FULL' | 'DEPOSIT_50';
    idempotencyKey: string;
  }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getById: (id: string) => request<Booking>(`/bookings/${id}`),

  /** GET /bookings — returns all bookings for the authenticated guest */
  getMyBookings: () => request<Booking[]>('/bookings'),

  /** Returns the updated Booking (service now returns booking directly, not { booking, refundAmount }) */
  cancel: (id: string, reason: string) =>
    request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  complete: (id: string) =>
    request<Booking>(`/bookings/${id}/complete`, { method: 'POST' }),

  /** Admin: get all bookings paginated */
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

  /**
   * LOCAL DEV ONLY — simulate Razorpay payment capture.
   * Automatically called after init() when razorpayOrderId starts with "stub_".
   */
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
