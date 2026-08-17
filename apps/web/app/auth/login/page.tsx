'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../../../context/AuthContext';
import BrandMark from '../../../components/BrandMark';
import BrandStoryPanel, { BrandStoryStats } from '../../../components/auth/BrandStoryPanel';
import { useReveal } from '../../../hooks/useReveal';

/*
 * ─── Scope note ──────────────────────────────────────────────────────────
 * This file was redesigned as UI only. Every auth handler, branch, state
 * variable, redirect and link below is carried over unchanged from the
 * previous version: the `isAuth0Mode` split, `loginWithAuth0()`,
 * `login(email, password)` → `router.push('/dashboard')`, the error and
 * loading state, and both the /auth/register and /auth/admin-register links.
 *
 * Three things the redesign brief asked for are deliberately NOT here,
 * because no implementation of them exists anywhere in this codebase and a
 * control that looks functional but is not would be worse than its absence:
 *
 *   - Google / Apple sign-in. AuthContext exposes exactly three entry
 *     points — `login`, `register`, `loginWithAuth0`. There is no Google or
 *     Apple provider to call. (Auth0's Universal Login may itself offer
 *     them, but that is behind the single "Continue with Auth0" button.)
 *     Because there are no social buttons in email mode, the
 *     "── OR SIGN IN WITH EMAIL ──" divider is also omitted: it would be
 *     dividing the form from nothing.
 *   - Remember me. Nothing persists a "remember" preference; the checkbox
 *     would be inert.
 *   - Forgot password. There is no reset route or handler in the app
 *     (no /auth/forgot-password, no reset API), so the link would 404.
 *
 * The one control added is the password visibility toggle, which is purely
 * client-side — it swaps the input's `type` and touches no auth logic.
 */

type IconProps = { className?: string };

function IconMail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.7 6.2A9.9 9.9 0 0 1 12 6.1c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4M6.3 7.9A16.9 16.9 0 0 0 2 12.6s3.5 6.5 10 6.5a9.6 9.6 0 0 0 4-.85" />
      <path d="M9.9 10.5a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

function IconArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Leading-icon wrapper shared by both fields. */
function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
      {children}
    </span>
  );
}

export default function LoginPage() {
  const { login, loginWithAuth0, isAuth0Mode } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Presentation-only: swaps the password input's `type`. No auth impact.
  const [showPassword, setShowPassword] = useState(false);

  const { ref, armed, revealed } = useReveal<HTMLDivElement>();
  const enter = (animation: string) => {
    if (!armed) return '';
    return revealed ? `opacity-0 ${animation}` : 'opacity-0';
  };
  const at = (ms: number) => (armed && revealed ? { animationDelay: `${ms}ms` } : undefined);

  // ── Unchanged: custom JWT mode submit ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const footerLinks = (
    <div className="mt-8 space-y-2 text-center">
      <p className="text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2 rounded"
        >
          Create account
        </Link>
      </p>
      <p className="text-sm text-gray-400">
        Staff member?{' '}
        <Link
          href="/auth/admin-register"
          className="font-medium text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2 rounded"
        >
          Apply for admin access
        </Link>
      </p>
    </div>
  );

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-2">
      {/* ── Left: authentication ── */}
      <div className="flex items-center justify-center bg-surface px-5 py-12 sm:px-10 lg:px-12">
        <div ref={ref} className="w-full max-w-md">
          {/* Brand */}
          <Link
            href="/"
            className={`group inline-flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2 ${enter('animate-slide-up')}`}
            style={at(0)}
          >
            <BrandMark size={40} />
            <span className="text-lg font-bold tracking-tight text-brand-700 transition-opacity group-hover:opacity-80">
              Dhyana Stays
            </span>
          </Link>

          {/* Welcome */}
          <h1
            className={`mt-10 font-serif text-3xl leading-tight tracking-tight text-gray-900 sm:text-4xl ${enter('animate-slide-up')}`}
            style={at(70)}
          >
            Welcome back
          </h1>
          <p
            className={`mt-2.5 text-sm text-gray-500 sm:text-base ${enter('animate-slide-up')}`}
            style={at(130)}
          >
            Sign in to access your curated travel world.
          </p>

          {/* Error — unchanged state, now announced to assistive tech */}
          {error && (
            <div role="alert" className="alert-error mt-6">
              {error}
            </div>
          )}

          {isAuth0Mode ? (
            /* ── Unchanged: Auth0 Universal Login ── */
            <div className={`mt-8 ${enter('animate-slide-up')}`} style={at(190)}>
              <button
                onClick={() => loginWithAuth0()}
                className="btn-primary w-full gap-3 py-3.5 text-base"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                Continue with Auth0
              </button>
              <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
                You&apos;ll be taken to our secure sign-in page and returned here once
                you&apos;re done.
              </p>
            </div>
          ) : (
            /* ── Unchanged: email + password ── */
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className={enter('animate-slide-up')} style={at(190)}>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500"
                >
                  Email address
                </label>
                <div className="relative">
                  <FieldIcon>
                    <IconMail className="h-[18px] w-[18px]" />
                  </FieldIcon>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input py-3 pl-11"
                  />
                </div>
              </div>

              <div className={enter('animate-slide-up')} style={at(250)}>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500"
                >
                  Password
                </label>
                <div className="relative">
                  <FieldIcon>
                    <IconLock className="h-[18px] w-[18px]" />
                  </FieldIcon>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input py-3 pl-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30"
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <IconEye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <div className={`pt-1 ${enter('animate-slide-up')}`} style={at(310)}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <IconArrowRight className="h-[18px] w-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className={enter('animate-slide-up')} style={at(380)}>
            {footerLinks}
          </div>

          {/* Compact brand story — only where the full panel is hidden. */}
          <div className={enter('animate-fade-in')} style={at(440)}>
            <BrandStoryStats className="mt-10 lg:hidden" />
          </div>
        </div>
      </div>

      {/* ── Right: brand story. Hidden below lg so the form stays the focus. ── */}
      <BrandStoryPanel className="hidden border-l border-gray-200/60 lg:flex" />
    </div>
  );
}
