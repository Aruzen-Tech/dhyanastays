'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/api';
import type { SystemConfigEntry } from '../../../lib/types';

// ─── Label mapping ───────────────────────────────────────────────────────────

const SETTING_LABELS: Record<string, string> = {
  platformFeePercent: 'Platform Fee (%)',
  cancellationThresholdFull: 'Full Refund Threshold (hours)',
  cancellationThresholdPartial: 'Partial Refund Threshold (hours)',
  holdDurationMinutes: 'Hold Duration (minutes)',
  balanceDueDays: 'Balance Due Days Before Check-in',
  payoutEligibilityHours: 'Payout Eligibility (hours after check-in)',
  maxGuestsDefault: 'Default Max Guests',
  minNightsDefault: 'Default Min Nights',
};

function getLabel(key: string): string {
  return SETTING_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<SystemConfigEntry[]>([]);
  const [original, setOriginal] = useState<Record<string, unknown>>({});
  const [current, setCurrent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard');
  }, [user, isLoading, router]);

  // ─── Toast helper ────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const loadSettings = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getSettings()
      .then((entries) => {
        setSettings(entries);
        const orig: Record<string, unknown> = {};
        const cur: Record<string, string> = {};
        for (const e of entries) {
          orig[e.key] = e.value;
          cur[e.key] = String(e.value ?? '');
        }
        setOriginal(orig);
        setCurrent(cur);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    loadSettings();
  }, [user, loadSettings]);

  // ─── Dirty check ─────────────────────────────────────────────────────────

  const isDirty = settings.some((s) => String(original[s.key] ?? '') !== current[s.key]);

  // ─── Save handler ────────────────────────────────────────────────────────

  const handleSave = async () => {
    const changed: Array<{ key: string; value: unknown }> = [];
    for (const s of settings) {
      const cur = current[s.key];
      const orig = String(original[s.key] ?? '');
      if (cur !== orig) {
        // Try to parse as number, else send as string
        const numVal = Number(cur);
        changed.push({ key: s.key, value: isNaN(numVal) ? cur : numVal });
      }
    }
    if (changed.length === 0) return;

    setSaving(true);
    try {
      const updated = await adminApi.updateSettings(changed);
      setSettings(updated);
      const orig: Record<string, unknown> = {};
      const cur: Record<string, string> = {};
      for (const e of updated) {
        orig[e.key] = e.value;
        cur[e.key] = String(e.value ?? '');
      }
      setOriginal(orig);
      setCurrent(cur);
      showToast('Settings saved successfully', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render guard ────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure platform-wide parameters
          </p>
        </div>
        <button onClick={loadSettings} className="btn-ghost text-sm">
          &#8635; Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="card p-6 space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-9 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Settings form */}
      {!loading && settings.length > 0 && (
        <div className="card p-6">
          <div className="space-y-6">
            {settings.map((s) => (
              <div key={s.id}>
                <label className="label">{getLabel(s.key)}</label>
                <input
                  type="text"
                  value={current[s.key] ?? ''}
                  onChange={(e) =>
                    setCurrent((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                  className="input w-full sm:w-96"
                />
                {String(original[s.key] ?? '') !== current[s.key] && (
                  <p className="text-xs text-amber-600 mt-1">
                    Changed from: {String(original[s.key])}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <div>
              {isDirty && (
                <p className="text-sm text-amber-600 font-medium">
                  You have unsaved changes.
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="btn-primary text-sm py-2 px-6 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && settings.length === 0 && !error && (
        <div className="text-center py-20 card">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No settings found</h3>
          <p className="text-gray-400 text-sm">
            System configuration entries will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
