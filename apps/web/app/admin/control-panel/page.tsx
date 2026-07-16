'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useFeatures } from '../../../context/FeatureContext';
import { adminFeaturesApi } from '../../../lib/api';
import type { ResolvedFeature, FeatureCategory } from '../../../lib/types';

const CATEGORY_ORDER: FeatureCategory[] = [
  'Bookings & Payments',
  'Guest Experience',
  'AI & Concierge',
  'Messaging',
  'Loyalty & Growth',
  'Safety',
  'Investor',
];

const CATEGORY_ICON: Record<FeatureCategory, string> = {
  'Bookings & Payments': '💳',
  'Guest Experience': '🌿',
  'AI & Concierge': '🤖',
  Messaging: '💬',
  'Loyalty & Growth': '🎁',
  Safety: '🆘',
  Investor: '📈',
};

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

export default function AdminControlPanelPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { refresh: refreshFeatureContext } = useFeatures();

  const [features, setFeatures] = useState<ResolvedFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    adminFeaturesApi
      .list()
      .then(setFeatures)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggle = async (f: ResolvedFeature) => {
    if (f.critical && f.enabled) {
      const ok = confirm(
        `"${f.label}" is a critical feature. Disabling it stops it platform-wide for all users. Continue?`,
      );
      if (!ok) return;
    }
    setBusyKey(f.key);
    const next = !f.enabled;
    // optimistic
    setFeatures((prev) =>
      prev.map((x) => (x.key === f.key ? { ...x, enabled: next } : x)),
    );
    try {
      const updated = await adminFeaturesApi.toggle(f.key, next);
      setFeatures((prev) => prev.map((x) => (x.key === f.key ? updated : x)));
      setToast(`${f.label} ${next ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToast(''), 2200);
      // keep the global UI-gating context fresh
      void refreshFeatureContext();
    } catch (e: unknown) {
      // revert
      setFeatures((prev) =>
        prev.map((x) => (x.key === f.key ? { ...x, enabled: f.enabled } : x)),
      );
      setError(e instanceof Error ? e.message : 'Toggle failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setBusyKey(null);
    }
  };

  const enabledCount = features.filter((f) => f.enabled).length;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? features.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.key.includes(q),
        )
      : features;
    const map = new Map<FeatureCategory, ResolvedFeature[]>();
    for (const f of filtered) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [features, query]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <Link href="/admin" className="hover:text-brand-700">Admin</Link>
          <span>/</span>
          <span>Control Panel</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Platform Control Panel</h1>
            <p className="text-gray-500 text-sm mt-1">
              Enable or disable platform features and services. Disabling a feature stops
              its API and hides it across the app — instantly, for everyone.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-700">
                {enabledCount}
                <span className="text-gray-400 text-base font-normal">/{features.length}</span>
              </div>
              <div className="text-xs text-gray-500">features enabled</div>
            </div>
            <Link href="/admin/settings" className="btn-secondary text-sm">
              Platform Settings →
            </Link>
          </div>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Search */}
      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features…"
          className="input max-w-sm"
        />
      </div>

      {/* Grouped feature cards */}
      <div className="space-y-8">
        {grouped.map(({ category, items }) => (
          <section key={category}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              <span>{CATEGORY_ICON[category]}</span>
              {category}
              <span className="text-xs text-gray-400 font-normal normal-case">
                {items.filter((i) => i.enabled).length}/{items.length} on
              </span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((f) => (
                <div
                  key={f.key}
                  className={`card p-4 flex items-start justify-between gap-4 border-l-4 ${
                    f.enabled ? 'border-l-brand-500' : 'border-l-gray-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{f.label}</h3>
                      {f.critical && (
                        <span className="text-[10px] uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          Critical
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          f.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {f.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{f.description}</p>
                    <div className="text-[11px] text-gray-400 mt-2 flex flex-wrap gap-2">
                      <span className="font-mono">{f.key}</span>
                      <span>· for {f.audience.join(', ')}</span>
                      {f.overridden && f.updatedAt && (
                        <span>
                          · changed {new Date(f.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    <Toggle
                      checked={f.enabled}
                      disabled={busyKey === f.key}
                      onChange={() => handleToggle(f)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">
            No features match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}
