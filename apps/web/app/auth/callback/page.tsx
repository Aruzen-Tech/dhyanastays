'use client';

/**
 * /auth/callback
 *
 * Auth0 redirects here after login/registration.
 * @auth0/auth0-react handles the token exchange automatically.
 * We show a loading spinner while the AuthContext syncs the user to our DB.
 * Once synced (user is set), we redirect to /dashboard.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Once loading is done and user is synced, redirect to dashboard
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
    // If loading is done but no user (e.g. Auth0 error), redirect to login
    if (!isLoading && !user) {
      const timer = setTimeout(() => {
        router.replace('/auth/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        {isLoading ? (
          <>
            <div className="text-5xl mb-4 animate-pulse">🏡</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Setting up your account…
            </h2>
            <p className="text-gray-500 text-sm">
              Completing sign-in, please wait.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        ) : !user ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Sign-in issue
            </h2>
            <p className="text-gray-500 text-sm">
              Something went wrong. Redirecting to login…
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Signed in!
            </h2>
            <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
          </>
        )}
      </div>
    </div>
  );
}
