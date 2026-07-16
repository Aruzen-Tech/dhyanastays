'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { notificationPrefsApi } from '../../../lib/api';

const KINDS: { value: string; label: string; desc: string; locked?: boolean }[] = [
  {
    value: 'booking.confirmed',
    label: 'Booking confirmed',
    desc: 'Transactional — always sent',
    locked: true,
  },
  {
    value: 'booking.cancelled',
    label: 'Booking cancelled',
    desc: 'Transactional — always sent',
    locked: true,
  },
  { value: 'balance.due', label: 'Balance due reminder', desc: 'When your balance payment is due' },
  { value: 'pay_later.reminder', label: 'Pay later reminder', desc: 'Instalment reminders' },
  { value: 'message.received', label: 'New message', desc: 'Host replies to your messages' },
  { value: 'issue.updated', label: 'Issue updates', desc: 'Status changes on issues you report' },
  { value: 'sos.ack', label: 'SOS acknowledgement', desc: 'Always sent', locked: true },
  { value: 'sip.debit', label: 'SIP contribution debit', desc: 'Monthly auto-debit reminders' },
];

const CHANNELS: { value: string; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-app' },
];

export default function NotificationPreferencesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const [channels, setChannels] = useState<Record<string, Record<string, boolean>>>({});
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    notificationPrefsApi
      .get()
      .then((pref) => {
        setChannels(pref.channels ?? {});
        if (pref.quietHours) {
          setQuietStart(pref.quietHours.start);
          setQuietEnd(pref.quietHours.end);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const isEnabled = (kind: string, channel: string) => {
    return channels[kind]?.[channel] !== false;
  };

  const toggle = (kind: string, channel: string) => {
    setChannels((prev) => {
      const next = { ...prev };
      const kindMap = { ...(next[kind] ?? {}) };
      kindMap[channel] = kindMap[channel] === false ? true : false;
      next[kind] = kindMap;
      return next;
    });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const quietHours =
        quietStart && quietEnd ? { start: quietStart, end: quietEnd } : undefined;
      await notificationPrefsApi.upsert({ channels, quietHours });
      setToast('Preferences saved');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-10">
        <p className="text-gray-500">Loading…</p>
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

      <div className="mb-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost text-sm mb-4">
          ← Back to dashboard
        </button>
        <h1 className="page-title">Notification Preferences</h1>
        <p className="text-gray-500 text-sm mt-1">
          Choose which channels to receive each type of notification on. Transactional
          notifications (booking confirmations, cancellations, SOS) are always sent.
        </p>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      <section className="card p-6 mb-4 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-4">Channels per notification</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2">Notification</th>
              {CHANNELS.map((c) => (
                <th key={c.value} className="py-2 px-3 text-center">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KINDS.map((kind) => (
              <tr key={kind.value} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div className="font-medium text-gray-900">{kind.label}</div>
                  <div className="text-xs text-gray-400">{kind.desc}</div>
                </td>
                {CHANNELS.map((c) => (
                  <td key={c.value} className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={kind.locked ? true : isEnabled(kind.value, c.value)}
                      disabled={kind.locked}
                      onChange={() => toggle(kind.value, c.value)}
                      className="w-4 h-4 accent-brand-500 disabled:opacity-40"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Quiet hours</h2>
        <p className="text-xs text-gray-400 mb-4">
          Non-transactional notifications scheduled during this window are delayed until the
          window ends. Times are in your local timezone (24h format).
        </p>
        <div className="flex gap-3 items-center">
          <label className="text-sm text-gray-600">
            Start
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              className="input ml-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            End
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              className="input ml-2"
            />
          </label>
          {(quietStart || quietEnd) && (
            <button
              type="button"
              onClick={() => {
                setQuietStart('');
                setQuietEnd('');
              }}
              className="btn-ghost text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
