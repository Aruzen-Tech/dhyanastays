'use client';

import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../../lib/api';

/**
 * Request a password reset link.
 *
 * The success screen is shown for any well-formed address, registered or not —
 * the API deliberately responds identically either way, and saying "no such
 * account" here would undo that and turn the page into an account-discovery
 * tool.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container-page py-16 max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>

        {sent ? (
          <>
            <p className="text-sm text-muted mt-2">
              If an account exists for <strong>{email.trim()}</strong>, we’ve sent a reset link
              to it. The link works once and expires in an hour.
            </p>
            <p className="text-sm text-muted mt-3">
              Nothing arrived? Check your spam folder, or{' '}
              <button
                type="button"
                className="text-brand-700 hover:underline"
                onClick={() => setSent(false)}
              >
                try a different address
              </button>
              .
            </p>
            <Link href="/auth/login" className="btn-primary w-full mt-6 text-center block">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="text-sm text-muted mt-2 mb-6">
              Enter the email you signed up with and we’ll send you a link to set a new password.
            </p>

            {error && <div className="alert-error mb-4">{error}</div>}

            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />

            <button type="submit" className="btn-primary w-full mt-6" disabled={sending}>
              {sending ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-sm text-center text-muted mt-4">
              Remembered it?{' '}
              <Link href="/auth/login" className="text-brand-700 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
