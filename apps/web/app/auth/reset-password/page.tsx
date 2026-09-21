'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import PasswordInput from '../../../components/PasswordInput';
import { authApi } from '../../../lib/api';

/**
 * Redeem a reset link and set a new password.
 *
 * The token is checked before the form is shown, so someone arriving on a stale
 * link is told immediately rather than after typing a password twice. On
 * success we send them to sign in rather than logging them in automatically —
 * the person holding the link isn't necessarily the account owner until they
 * can use the new password.
 */
function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    authApi
      .checkResetToken(token)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const problems: string[] = [];
  if (password.length > 0 && password.length < 8) {
    problems.push('Password must be at least 8 characters.');
  }
  if (confirm.length > 0 && confirm !== password) {
    problems.push('Passwords do not match.');
  }
  const canSubmit = password.length >= 8 && confirm === password && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md">
      <div className="card p-8">
        {done ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
            <p className="text-sm text-muted mt-2">
              You’ve been signed out everywhere else. Taking you to sign in…
            </p>
            <Link href="/auth/login" className="btn-primary w-full mt-6 text-center block">
              Sign in
            </Link>
          </>
        ) : !token || !valid ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">This link has expired</h1>
            <p className="text-sm text-muted mt-2">
              Reset links work once and last an hour. Request a fresh one and we’ll send it
              straight over.
            </p>
            <Link
              href="/auth/forgot-password"
              className="btn-primary w-full mt-6 text-center block"
            >
              Send a new link
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
            <p className="text-sm text-muted mt-2 mb-6">
              Choose something you haven’t used here before. You’ll be signed out on every other
              device.
            </p>

            {error && <div className="alert-error mb-4">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="newPassword">New password</label>
                <PasswordInput
                  id="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={setPassword}
                  disabled={saving}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">Confirm new password</label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={setConfirm}
                  disabled={saving}
                  placeholder="Re-enter the new password"
                />
              </div>
            </div>

            {problems.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-red-600">
                {problems.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            )}

            <button type="submit" className="btn-primary w-full mt-6" disabled={!canSubmit}>
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16 text-center">
          <span className="spinner text-brand-700 w-8 h-8" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
