'use client';

import { useState } from 'react';
import PasswordInput from './PasswordInput';
import { authApi, tokenStore } from '../lib/api';

/**
 * Password & security.
 *
 * Changing a password is how someone reacts to a suspected compromise, so the
 * server revokes every other session. It hands back a fresh token pair for the
 * device that made the change, which we store immediately — otherwise the user
 * would be signed out of the very page they're standing on.
 */
export default function ChangePasswordCard({ canChange }: { canChange: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const problems: string[] = [];
  if (open) {
    if (!current) problems.push('Enter your current password.');
    if (next.length < 8) problems.push('New password must be at least 8 characters.');
    if (next && current && next === current) {
      problems.push('Your new password must be different from the current one.');
    }
    if (confirm !== next) problems.push('New passwords do not match.');
  }

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const submit = async () => {
    if (problems.length > 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const tokens = await authApi.changePassword({
        currentPassword: current,
        newPassword: next,
      });
      // Keep this device signed in on the newly issued pair.
      tokenStore.set(tokens);
      reset();
      setOpen(false);
      setNotice('Password changed. You’ve been signed out on every other device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-semibold text-gray-900">Password &amp; security</h2>
          <p className="text-sm text-muted mt-0.5">
            {canChange
              ? 'Changing your password signs you out everywhere else.'
              : 'This account signs in with a social or SSO provider, so there’s no password to change.'}
          </p>
        </div>
        {canChange && !open && (
          <button className="btn-secondary text-sm shrink-0" onClick={() => setOpen(true)}>
            Change password
          </button>
        )}
      </div>

      {notice && <div className="alert-success mt-4">{notice}</div>}

      {canChange && open && (
        <div className="mt-5 space-y-4">
          {error && <div className="alert-error">{error}</div>}

          <div>
            <label className="label" htmlFor="currentPassword">Current password</label>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              value={current}
              onChange={setCurrent}
              disabled={saving}
              placeholder="Your current password"
            />
          </div>

          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={setNext}
              disabled={saving}
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmNewPassword">Confirm new password</label>
            <PasswordInput
              id="confirmNewPassword"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={setConfirm}
              disabled={saving}
              placeholder="Re-enter the new password"
            />
          </div>

          {problems.length > 0 && (
            <ul className="space-y-1 text-xs text-red-600">
              {problems.map((p) => <li key={p}>• {p}</li>)}
            </ul>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="btn-ghost"
              disabled={saving}
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={saving || problems.length > 0}
              onClick={submit}
            >
              {saving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
