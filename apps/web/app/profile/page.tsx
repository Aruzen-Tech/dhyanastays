'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accountApi, formatDate } from '../../lib/api';
import ChangePasswordCard from '../../components/ChangePasswordCard';
import type { AccountProfile } from '../../lib/types';

const PHONE_RE = /^(\+?[1-9]\d{7,14}|[6-9]\d{9})$/;

const ROLE_LABEL: Record<string, string> = {
  GUEST: 'Guest',
  HOST: 'Host',
  ADMIN: 'Administrator',
};

/**
 * Personal information for the signed-in user, whatever their role.
 *
 * Role-specific records (the host application, the payout account, guest
 * preferences) keep their own pages — this links on to them rather than
 * absorbing them, so there is one obvious place to correct a name or number.
 */
export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await accountApi.getProfile();
      setProfile(p);
      setFullName(p.fullName);
      setPhone(p.phone ?? '');
      setAvatarUrl(p.avatarUrl ?? '');
      // An older account with no phone should land straight in edit mode.
      if (p.missing.includes('phone')) setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const problems: string[] = [];
  if (editing) {
    if (fullName.trim().length < 2) problems.push('Enter your full name.');
    if (!PHONE_RE.test(phone.trim())) {
      problems.push('Enter a 10-digit mobile number (or an international number with +).');
    }
  }

  const save = async () => {
    if (problems.length > 0) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await accountApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
      });
      setProfile(updated);
      setEditing(false);
      setNotice('Your details have been updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setEditing(false);
    setError('');
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container-page py-16">
        <div className="alert-error">{error || 'Profile unavailable.'}</div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="page-title">My profile</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Your personal information, and where to find the rest of your account.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}
      {notice && <div className="alert-success mb-4">{notice}</div>}

      {profile.missing.includes('phone') && (
        <div className="card p-4 mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800">Add your mobile number</p>
          <p className="text-sm text-amber-700 mt-0.5">
            We use it for booking updates and emergency support. Accounts created before this
            was required don’t have one on file.
          </p>
        </div>
      )}

      {/* ── Personal information ── */}
      <section className="card p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4 min-w-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover bg-gray-100 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-700 text-white flex items-center justify-center text-lg font-semibold shrink-0">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {profile.fullName}
              </h2>
              <p className="text-sm text-muted truncate">
                {ROLE_LABEL[profile.role] ?? profile.role} · joined{' '}
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
          {!editing && (
            <button className="btn-secondary text-sm shrink-0" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Full name</dt>
              <dd className="text-gray-900 mt-0.5">{profile.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="text-gray-900 mt-0.5 break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Mobile number</dt>
              <dd className={`mt-0.5 ${profile.phone ? 'text-gray-900' : 'text-amber-600'}`}>
                {profile.phone ?? 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Account type</dt>
              <dd className="text-gray-900 mt-0.5">
                {ROLE_LABEL[profile.role] ?? profile.role}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" className="input bg-gray-50" value={profile.email} disabled readOnly />
              <p className="text-xs text-muted mt-1">
                Your email is how you sign in, so it can’t be changed here. Contact support if
                you need it updated.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                className="input"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
              <p className="text-xs text-muted mt-1">
                Used for booking updates and emergency support.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="avatarUrl">Profile photo link (optional)</label>
              <input
                id="avatarUrl"
                className="input"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            {problems.length > 0 && (
              <ul className="space-y-1 text-xs text-red-600">
                {problems.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={cancel} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={save}
                disabled={saving || problems.length > 0}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Where the rest of the account lives ── */}
      <section className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Rest of your account</h2>
        <ul className="divide-y divide-gray-100">
          {profile.host && (
            <>
              <li className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Host application</p>
                  <p className="text-xs text-muted">
                    {profile.host.applicationComplete
                      ? `Verification: ${profile.host.verificationStatus.toLowerCase()}`
                      : 'Incomplete — you can’t submit a listing yet'}
                  </p>
                </div>
                <Link href="/host/application" className="btn-ghost text-sm shrink-0">
                  {profile.host.applicationComplete ? 'View' : 'Complete'}
                </Link>
              </li>
              <li className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Payout account</p>
                  <p className="text-xs text-muted">
                    {profile.host.payoutAccountStatus
                      ? `Status: ${profile.host.payoutAccountStatus.toLowerCase()}`
                      : 'Not set up — required before you can be paid'}
                  </p>
                </div>
                <Link href="/host/payouts/account" className="btn-ghost text-sm shrink-0">
                  {profile.host.payoutAccountStatus ? 'View' : 'Set up'}
                </Link>
              </li>
            </>
          )}
          {profile.role === 'GUEST' && (
            <li className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Travel preferences</p>
                <p className="text-xs text-muted">Dietary needs, experience interests</p>
              </div>
              <Link href="/guest/profile" className="btn-ghost text-sm shrink-0">
                Manage
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* Password & security — Auth0/SSO accounts have no local password. */}
      <div className="mt-4">
        <ChangePasswordCard canChange={profile.hasPassword} />
      </div>
    </div>
  );
}
