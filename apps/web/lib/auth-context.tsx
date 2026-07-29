"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthSession,
  getCurrentUserWithRefresh,
  getStoredAccessToken,
  getStoredRefreshToken,
  logoutUser,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function roleHome(role: AuthUser["role"]): string {
  switch (role) {
    case "HOST":
      return "/host";
    case "ADMIN":
      return "/admin";
    default:
      return "/traveller";
  }
}

function expectedRole(pathname: string): AuthUser["role"] | null {
  const segment = pathname.split("/")[1];

  if (segment === "traveller") return "GUEST";
  if (segment === "host") return "HOST";
  if (segment === "admin" || segment === "super-admin") return "ADMIN";

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const accessToken = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();

      if (!accessToken && !refreshToken) {
        if (!cancelled) {
          setLoading(false);
          router.replace(
            `/login?next=${encodeURIComponent(window.location.pathname)}`,
          );
        }
        return;
      }

      try {
        const profile = await getCurrentUserWithRefresh();

        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        clearAuthSession();

        if (!cancelled) {
          setUser(null);
          router.replace(
            `/login?next=${encodeURIComponent(window.location.pathname)}`,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (loading || !user) return;

    const requiredRole = expectedRole(pathname);

    if (requiredRole && user.role !== requiredRole) {
      router.replace(roleHome(user.role));
    }
  }, [loading, pathname, router, user]);

  const signOut = useCallback(async () => {
    const accessToken = getStoredAccessToken();

    try {
      if (accessToken) {
        await logoutUser(accessToken);
      }
    } catch (error) {
      console.error("Unable to complete backend logout:", error);
    } finally {
      clearAuthSession();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
