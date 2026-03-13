'use client';

/**
 * AuthContext — dual-mode authentication
 *
 * Mode A (Auth0):   NEXT_PUBLIC_AUTH0_DOMAIN is set
 *   → Uses @auth0/auth0-react for login/logout/token
 *   → After login, calls POST /api/auth/sync to upsert user in our DB
 *
 * Mode B (Custom):  NEXT_PUBLIC_AUTH0_DOMAIN is NOT set
 *   → Uses our own argon2 + JWT auth (existing behaviour)
 *   → Tokens stored in localStorage
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { authApi, tokenStore, setTokenGetter } from '../lib/api';
import type { AuthTokens, JwtPayload, UserRole } from '../lib/types';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuth0Mode: boolean;
  /** Custom-auth login (Mode B only) */
  login: (email: string, password: string) => Promise<void>;
  /** Custom-auth register (Mode B only) */
  register: (
    email: string,
    password: string,
    fullName: string,
    role: 'GUEST' | 'HOST',
  ) => Promise<void>;
  /** Auth0 login redirect (Mode A only) */
  loginWithAuth0: (options?: { role?: 'GUEST' | 'HOST' }) => void;
  logout: () => Promise<void>;
  /** Get a valid access token (works in both modes) */
  getAccessToken: () => Promise<string | null>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── JWT decode helper (Mode B) ───────────────────────────────────────────────

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return { sub: payload.sub, email: payload.email, role: payload.role };
}

// ─── Mode B: Custom JWT provider ─────────────────────────────────────────────

function CustomAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.getAccess();
    setUser(userFromToken(token));
    setIsLoading(false);
  }, []);

  const applyTokens = useCallback((tokens: AuthTokens) => {
    tokenStore.set(tokens);
    setUser(userFromToken(tokens.accessToken));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login({ email, password });
      applyTokens(tokens);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string, role: 'GUEST' | 'HOST') => {
      const tokens = await authApi.register({ email, password, fullName, role });
      applyTokens(tokens);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear locally regardless
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return tokenStore.getAccess();
  }, []);

  const loginWithAuth0 = useCallback(() => {
    // No-op in custom mode
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuth0Mode: false,
        login,
        register,
        loginWithAuth0,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Mode A: Auth0 inner provider (must be inside Auth0Provider) ──────────────

function Auth0InnerProvider({ children }: { children: React.ReactNode }) {
  const {
    user: auth0User,
    isLoading: auth0Loading,
    isAuthenticated,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Register Auth0 token getter so all api.ts calls use Auth0 access token
  useEffect(() => {
    setTokenGetter(async () => {
      try {
        return await getAccessTokenSilently();
      } catch {
        return null;
      }
    });
    return () => setTokenGetter(() => Promise.resolve(null));
  }, [getAccessTokenSilently]);

  // Sync user to our DB after Auth0 login
  useEffect(() => {
    if (!isAuthenticated || !auth0User || isSyncing) return;

    const syncToDb = async () => {
      setIsSyncing(true);
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: auth0User.name ?? auth0User.email,
          }),
        });
        if (res.ok) {
          const profile = await res.json() as {
            id: string;
            email: string;
            fullName: string;
            role: UserRole;
          };
          setUser({
            sub: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            role: profile.role,
          });
        }
      } catch (err) {
        console.error('[Auth0] sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    void syncToDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, auth0User?.sub]);

  // Clear user on logout
  useEffect(() => {
    if (!isAuthenticated && !auth0Loading) {
      setUser(null);
    }
  }, [isAuthenticated, auth0Loading]);

  const login = useCallback(async () => {
    // In Auth0 mode, login is handled by loginWithAuth0
  }, []);

  const register = useCallback(async () => {
    // In Auth0 mode, registration is handled by loginWithAuth0 (Auth0 Universal Login)
  }, []);

  const loginWithAuth0 = useCallback(
    (options?: { role?: 'GUEST' | 'HOST' }) => {
      void loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
          // Pass desired role as a custom parameter — read by Auth0 Action
          ...(options?.role ? { 'ext-role': options.role } : {}),
        },
      });
    },
    [loginWithRedirect],
  );

  const logout = useCallback(async () => {
    setUser(null);
    auth0Logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : '/',
      },
    });
  }, [auth0Logout]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  }, [getAccessTokenSilently]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: auth0Loading || isSyncing,
        isAuth0Mode: true,
        login,
        register,
        loginWithAuth0,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Root provider — picks mode based on env var ──────────────────────────────

const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE ?? 'custom').toLowerCase();
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? '';
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? '';
const AUTH0_AUDIENCE = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE ?? '';
const AUTH0_REDIRECT_URI = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI ?? '/auth/callback';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const useAuth0 = AUTH_MODE === 'auth0' && !!AUTH0_DOMAIN && !!AUTH0_CLIENT_ID;
  if (useAuth0) {
    return (
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: AUTH0_REDIRECT_URI,
          audience: AUTH0_AUDIENCE || undefined,
          scope: 'openid profile email',
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
      >
        <Auth0InnerProvider>{children}</Auth0InnerProvider>
      </Auth0Provider>
    );
  }

  return <CustomAuthProvider>{children}</CustomAuthProvider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
