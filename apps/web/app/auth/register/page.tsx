'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function RegisterPage() {
  const { register, loginWithAuth0, isAuth0Mode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'GUEST' | 'HOST'>('GUEST');
  const [agreed, setAgreed] = useState(false);
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Auth0 mode: redirect to Universal Login with role param ────────────────
  if (isAuth0Mode) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">✨</div>
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 text-sm mt-1">Join the Dhyana Stays community</p>
            </div>

            {/* Role selector */}
            <div className="mb-6">
              <p className="label">I want to…</p>
              <div className="grid grid-cols-2 gap-3">
                {(['GUEST', 'HOST'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      role === r
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{r === 'GUEST' ? '🧘' : '🏡'}</div>
                    <div className="font-semibold text-sm text-gray-900">
                      {r === 'GUEST' ? 'Book stays' : 'List my property'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r === 'GUEST' ? 'Discover & book retreats' : 'Earn as a host'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {role === 'HOST' && (
              <div className="alert-info mb-5 text-sm">
                <p className="font-medium mb-1">📋 Host onboarding</p>
                <p className="text-xs opacity-80">
                  After registration your host profile will be reviewed by the Dhyana Stays team.
                  Once approved you can create and publish listings.
                </p>
              </div>
            )}

            <button
              onClick={() => loginWithAuth0({ role })}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              Create {role === 'GUEST' ? 'guest' : 'host'} account with Auth0
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-700 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Custom JWT mode: full registration form ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please accept the terms to continue');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, fullName, role, referralCode.trim() || undefined);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">✨</div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">Join the Dhyana Stays community</p>
          </div>

          {/* Error */}
          {error && <div className="alert-error mb-5">⚠️ {error}</div>}

          {/* Role selector */}
          <div className="mb-6">
            <p className="label">I want to…</p>
            <div className="grid grid-cols-2 gap-3">
              {(['GUEST', 'HOST'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === r
                      ? 'border-brand-700 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{r === 'GUEST' ? '🧘' : '🏡'}</div>
                  <div className="font-semibold text-sm text-gray-900">
                    {r === 'GUEST' ? 'Book stays' : 'List my property'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r === 'GUEST' ? 'Discover & book retreats' : 'Earn as a host'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Host verification notice */}
          {role === 'HOST' && (
            <div className="alert-info mb-5 text-sm">
              <p className="font-medium mb-1">📋 Host onboarding</p>
              <p className="text-xs opacity-80">
                After registration your host profile will be reviewed by the Dhyana Stays team.
                Once approved you can create and publish listings.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="label">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className={`input ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-400 focus:ring-red-300'
                    : ''
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Referral code */}
            <div>
              <label htmlFor="referralCode" className="label">
                Referral code
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                maxLength={12}
                className="input font-mono uppercase"
              />
              {referralCode.trim() && (
                <p className="text-xs text-green-600 mt-1">🎁 You&apos;ll receive ₹250 credit after your first stay</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <span className="text-brand-700 font-medium">Terms of Service</span>
                {' '}and{' '}
                <span className="text-brand-700 font-medium">Privacy Policy</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating account…
                </>
              ) : (
                `Create ${role === 'GUEST' ? 'guest' : 'host'} account`
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
