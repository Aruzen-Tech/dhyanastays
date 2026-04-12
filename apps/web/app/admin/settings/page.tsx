'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/api';
import type { SystemConfigEntry } from '../../../lib/types';

// ─── Field metadata ──────────────────────────────────────────────────────────

interface FieldMeta {
  label: string;
  description: string;
  type: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const FIELD_META: Record<string, FieldMeta> = {
  platformFeePercent: {
    label: 'Platform Fee',
    description: 'Percentage charged on each booking subtotal. Applied to nightly rate + cleaning fee. Range: 1–50.',
    type: 'number',
    min: 1,
    max: 50,
    step: 0.5,
    unit: '%',
  },
  cancellationThresholdFull: {
    label: 'Full Refund Threshold',
    description: 'Hours before check-in within which a cancellation results in a 100% refund. Guests cancelling after this window receive a partial or no refund.',
    type: 'number',
    min: 0,
    step: 1,
    unit: 'hours',
  },
  cancellationThresholdPartial: {
    label: 'Partial Refund Threshold',
    description: 'Hours before check-in within which a cancellation results in a 50% refund. Below this threshold, no refund is issued.',
    type: 'number',
    min: 0,
    step: 1,
    unit: 'hours',
  },
  holdDurationMinutes: {
    label: 'Hold Duration',
    description: 'How long a price hold is kept reserved for a guest before it expires and dates are released. Shorter holds reduce abandoned holds; longer holds give guests more time.',
    type: 'number',
    min: 5,
    max: 120,
    step: 5,
    unit: 'minutes',
  },
  holdExpiryMinutes: {
    label: 'Hold Expiry',
    description: 'Alias for Hold Duration (minutes). Both settings control the same timer.',
    type: 'number',
    min: 5,
    max: 120,
    step: 5,
    unit: 'minutes',
  },
  balanceDueDays: {
    label: 'Balance Due Days',
    description: 'For deposit bookings, how many days before check-in the outstanding balance must be paid.',
    type: 'number',
    min: 1,
    max: 90,
    step: 1,
    unit: 'days',
  },
  payoutEligibilityHours: {
    label: 'Payout Eligibility Window',
    description: 'Hours after guest check-in before a payout line becomes eligible for processing. Allows time to address any disputes.',
    type: 'number',
    min: 0,
    max: 168,
    step: 1,
    unit: 'hours',
  },
  maxGuestsDefault: {
    label: 'Default Max Guests',
    description: 'Default maximum guests per listing if the host does not specify a limit.',
    type: 'number',
    min: 1,
    max: 100,
    step: 1,
    unit: 'guests',
  },
  maxGuestsGlobal: {
    label: 'Global Max Guests',
    description: 'Hard platform-wide cap on guests per booking regardless of listing settings.',
    type: 'number',
    min: 1,
    max: 200,
    step: 1,
    unit: 'guests',
  },
  minNightsDefault: {
    label: 'Default Min Nights',
    description: 'Default minimum stay length if the host does not set a minimum.',
    type: 'number',
    min: 1,
    step: 1,
    unit: 'nights',
  },
  minBookingLeadHours: {
    label: 'Minimum Booking Lead Time',
    description: 'Minimum hours in advance a booking must be made. Set to 0 for same-day bookings.',
    type: 'number',
    min: 0,
    step: 1,
    unit: 'hours',
  },
};

function getMeta(key: string): FieldMeta {
  return (
    FIELD_META[key] ?? {
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      description: '',
      type: 'text',
    }
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateField(key: string, raw: string): string | null {
  const meta = FIELD_META[key];
  if (!meta) return null;
  if (meta.type === 'number') {
    const n = parseFloat(raw);
    if (isNaN(n)) return 'Must be a number';
    if (meta.min !== undefined && n < meta.min) return `Minimum is ${meta.min}`;
    if (meta.max !== undefined && n > meta.max) return `Maximum is ${meta.max}`;
  }
  return null;
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

  // ─── Validation errors ────────────────────────────────────────────────────

  const validationErrors: Record<string, string> = {};
  for (const s of settings) {
    const err = validateField(s.key, current[s.key] ?? '');
    if (err) validationErrors[s.key] = err;
  }
  const hasErrors = Object.keys(validationErrors).length > 0;

  // ─── Discard changes ─────────────────────────────────────────────────────

  const handleDiscard = () => {
    const cur: Record<string, string> = {};
    for (const e of settings) {
      cur[e.key] = String(original[e.key] ?? '');
    }
    setCurrent(cur);
  };

  // ─── Save handler ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (hasErrors) {
      showToast('Fix validation errors before saving', 'error');
      return;
    }

    const changed: Array<{ key: string; value: unknown }> = [];
    for (const s of settings) {
      const cur = current[s.key];
      const orig = String(original[s.key] ?? '');
      if (cur !== orig) {
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
      showToast(`${changed.length} setting${changed.length !== 1 ? 's' : ''} saved`, 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

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
          className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-down ${
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
          <p className="text-gray-500 text-sm mt-1">Configure platform-wide parameters</p>
        </div>
        <button onClick={loadSettings} className="btn-ghost text-sm">&#8635; Refresh</button>
      </div>

      {error && <div className="alert-error mb-6">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="card p-6 space-y-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="skeleton h-3 rounded w-1/4 mb-1.5" />
              <div className="skeleton h-4 rounded w-2/3 mb-3" />
              <div className="skeleton h-10 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Settings form */}
      {!loading && settings.length > 0 && (
        <div className="card p-6">
          {/* Unsaved changes banner */}
          {isDirty && (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-700">
                  You have unsaved changes
                  {hasErrors && ' — fix errors before saving'}
                </span>
              </div>
              <button onClick={handleDiscard} className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                Discard
              </button>
            </div>
          )}

          <div className="space-y-8">
            {settings.map((s) => {
              const meta = getMeta(s.key);
              const valError = validationErrors[s.key];
              const isChanged = String(original[s.key] ?? '') !== current[s.key];

              return (
                <div key={s.id}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="text-sm font-semibold text-gray-800">
                      {meta.label}
                    </label>
                    {meta.unit && (
                      <span className="text-xs text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded">
                        {meta.unit}
                      </span>
                    )}
                    {isChanged && !valError && (
                      <span className="text-xs text-amber-600 font-medium">modified</span>
                    )}
                    {valError && (
                      <span className="text-xs text-red-600 font-medium">{valError}</span>
                    )}
                  </div>
                  {meta.description && (
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">{meta.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type={meta.type}
                      min={meta.min}
                      max={meta.max}
                      step={meta.step ?? (meta.type === 'number' ? 1 : undefined)}
                      value={current[s.key] ?? ''}
                      onChange={(e) =>
                        setCurrent((prev) => ({ ...prev, [s.key]: e.target.value }))
                      }
                      className={`input w-full sm:w-64 ${valError ? 'border-red-400 focus:border-red-500' : ''}`}
                    />
                    {isChanged && (
                      <button
                        type="button"
                        onClick={() => setCurrent((prev) => ({ ...prev, [s.key]: String(original[s.key] ?? '') }))}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Revert this field"
                      >
                        ↩ Revert
                      </button>
                    )}
                  </div>
                  {isChanged && !valError && (
                    <p className="text-xs text-gray-400 mt-1">
                      Previously: <span className="font-mono">{String(original[s.key])}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            {isDirty && (
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="btn-ghost text-sm py-2 px-4"
              >
                Discard Changes
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving || hasErrors}
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
          <p className="text-gray-400 text-sm">System configuration entries will appear here.</p>
        </div>
      )}
    </div>
  );
}
