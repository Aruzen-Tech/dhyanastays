'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { hostSettingsApi } from '../../../lib/api';
import type { HostControlPanel, HostSettings } from '../../../lib/types';

type ToggleKey = keyof Omit<HostSettings, 'hostId' | 'updatedAt'>;

const TOGGLES: Array<{
  key: ToggleKey;
  label: string;
  description: string;
}> = [
  {
    key: 'instantBook',
    label: 'Instant Book',
    description: 'Auto-confirm bookings without manual review. (Applies once instant-book rollout is live.)',
  },
  {
    key: 'allowGuestMessages',
    label: 'Accept Guest Messages',
    description: 'Let guests start a direct message thread with you. Turning this off blocks new threads.',
  },
  {
    key: 'allowConciergeChat',
    label: 'Concierge Chat',
    description: 'Allow guests to open a concierge thread on their confirmed booking.',
  },
  {
    key: 'emailOnNewBooking',
    label: 'Email on New Booking',
    description: 'Receive an email when a new booking lands for your listings.',
  },
  {
    key: 'smsOnNewBooking',
    label: 'SMS on New Booking',
    description: 'Receive an SMS for new bookings. (Requires a verified phone.)',
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-brand-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function HostControlPanelPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HostControlPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<ToggleKey | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'HOST')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role !== 'HOST') return;
    hostSettingsApi
      .get()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggle = async (key: ToggleKey) => {
    if (!data) return;
    const next = !data.settings[key];
    setBusy(key);
    setData({ ...data, settings: { ...data.settings, [key]: next } }); // optimistic
    try {
      const updated = await hostSettingsApi.update({ [key]: next });
      setData((prev) => (prev ? { ...prev, settings: updated } : prev));
      setToast('Saved');
      setTimeout(() => setToast(''), 1800);
    } catch (e: unknown) {
      setData((prev) =>
        prev ? { ...prev, settings: { ...prev.settings, [key]: !next } } : prev,
      );
      setError(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Could not load your control panel.'}</p>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
          ← Dashboard
        </Link>
        <h1 className="page-title">Host Control Panel</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your hosting preferences and see which platform features are available to you.
        </p>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Host-owned toggles */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Your preferences</h2>
        <p className="text-xs text-gray-500 mb-4">
          Settings you control. Changes apply immediately.
        </p>
        <div className="divide-y divide-gray-100">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-900">{t.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </div>
              <Toggle
                checked={data.settings[t.key]}
                disabled={busy === t.key}
                onChange={() => handleToggle(t.key)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Read-only platform feature availability */}
      <section className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Platform features</h2>
        <p className="text-xs text-gray-500 mb-4">
          Availability is set by the platform team. These affect what you and your guests can use.
        </p>
        <div className="space-y-2">
          {data.features.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{f.label}</div>
                <div className="text-xs text-gray-500">{f.description}</div>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                  f.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {f.enabled ? 'Available' : 'Unavailable'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
