const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export interface MfaLoginResponse {
  mfaRequired: true;
  mfaToken: string;
}

export type LoginResponse = AuthTokens | MfaLoginResponse;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: "GUEST" | "HOST";
  referralCode?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "GUEST" | "HOST" | "ADMIN";
  isActive: boolean;
  auth0Sub: string | null;
  createdAt: string;
  hostProfile: {
    id: string;
    verificationStatus: string;
  } | null;
  adminLevel: string | null;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fallback;
  }

  const message = (data as { message?: unknown }).message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthApiError(
      getErrorMessage(data, `Request failed with status ${response.status}`),
      response.status,
    );
  }

  return data as T;
}

export function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerUser(
  payload: RegisterPayload,
): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshAuthSession(
  refreshToken: string,
): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function saveAuthSession(
  tokens: AuthTokens,
  remember: boolean,
): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("dhyana_access_token");
  localStorage.removeItem("dhyana_refresh_token");
  sessionStorage.removeItem("dhyana_access_token");
  sessionStorage.removeItem("dhyana_refresh_token");

  const storage = remember ? localStorage : sessionStorage;

  storage.setItem("dhyana_access_token", tokens.accessToken);
  storage.setItem("dhyana_refresh_token", tokens.refreshToken);
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("dhyana_access_token") ??
    localStorage.getItem("dhyana_access_token")
  );
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("dhyana_refresh_token") ??
    localStorage.getItem("dhyana_refresh_token")
  );
}

function getCurrentAuthStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  if (sessionStorage.getItem("dhyana_refresh_token")) {
    return sessionStorage;
  }

  if (localStorage.getItem("dhyana_refresh_token")) {
    return localStorage;
  }

  return null;
}

function saveRefreshedAuthSession(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;

  const storage = getCurrentAuthStorage() ?? sessionStorage;
  const otherStorage =
    storage === sessionStorage ? localStorage : sessionStorage;

  storage.setItem("dhyana_access_token", tokens.accessToken);
  storage.setItem("dhyana_refresh_token", tokens.refreshToken);

  otherStorage.removeItem("dhyana_access_token");
  otherStorage.removeItem("dhyana_refresh_token");
}

let refreshPromise: Promise<AuthTokens> | null = null;

export function refreshStoredSession(): Promise<AuthTokens> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token is available."));
  }

  refreshPromise = refreshAuthSession(refreshToken)
    .then((tokens) => {
      saveRefreshedAuthSession(tokens);
      return tokens;
    })
    .catch((error) => {
      clearAuthSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function getCurrentUserWithRefresh(): Promise<AuthUser> {
  const accessToken = getStoredAccessToken();

  if (accessToken) {
    try {
      return await getCurrentUser(accessToken);
    } catch (error) {
      if (!(error instanceof AuthApiError) || error.status !== 401) {
        throw error;
      }
    }
  }

  const tokens = await refreshStoredSession();
  return getCurrentUser(tokens.accessToken);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("dhyana_access_token");
  localStorage.removeItem("dhyana_refresh_token");
  sessionStorage.removeItem("dhyana_access_token");
  sessionStorage.removeItem("dhyana_refresh_token");
  sessionStorage.removeItem("dhyana_mfa_token");
}

export function logoutUser(accessToken: string): Promise<unknown> {
  return request<unknown>("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
