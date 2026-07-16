'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { sosApi } from '../../../lib/api';
import type { SosIncident, SosStatus } from '../../../lib/api';

// Soft polling — auto-refresh while there's an active incident so the badge
// flips to "Acknowledged" without the guest having to refresh.
const POLL_INTERVAL_MS = 10_000;

const STATUS_LABEL: Record<SosStatus, string> = {
  OPEN: 'Awaiting response',
  ACKNOWLEDGED: 'Help is on the way',
  IN_PROGRESS: 'Responder en route',
  RESOLVED: 'Resolved',
  FALSE_ALARM: 'False alarm',
};

const STATUS_COLOR: Record<SosStatus, string> = {
  OPEN: 'bg-red-100 text-red-700 border-red-200',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200',
  FALSE_ALARM: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ACTIVE_STATUSES: SosStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'];

function isActive(s: SosStatus): boolean {
  return ACTIVE_STATUSES.includes(s);
}

function fmtRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtFullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GuestSosHistoryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // Initial load + polling. Polling pauses if there's no active incident.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const data = await sosApi.listMine();
        if (cancelled) return;
        setIncidents(data);
        setLoading(false);
        // Only keep polling if any incident is still active.
        if (data.some((i) => isActive(i.status))) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load incidents');
        setLoading(false);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const { active, resolved, visible } = useMemo(() => {
    const active = incidents.filter((i) => isActive(i.status));
    const resolved = incidents.filter((i) => !isActive(i.status));
    const visible =
      filter === 'ACTIVE' ? active : filter === 'RESOLVED' ? resolved : incidents;
    return { active, resolved, visible };
  }, [incidents, filter]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-red-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
          ← Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">SOS history</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track active alerts and review past incidents. Active alerts auto-refresh.
            </p>
          </div>
          <Link
            href="/sos"
            className="btn-primary bg-red-600 hover:bg-red-700 text-sm whitespace-nowrap"
          >
            🆘 New SOS
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}

      {/* Active alert callout — sticky-feeling so guest sees it immediately */}
      {active.length > 0 && (
        <div className="card p-4 mb-5 border-2 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="spinner text-red-600" aria-label="Live" />
            <h2 className="font-semibold text-red-800 text-sm">
              {active.length} active alert{active.length === 1 ? '' : 's'} — help is being coordinated
            </h2>
          </div>
          <p className="text-xs text-red-700">
            Click any alert below to open its live console — chat with support, see status updates, or call directly.
          </p>
        </div>
      )}

      {/* Filter chips */}
      {incidents.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(
            [
              { value: 'ALL', label: `All (${incidents.length})` },
              { value: 'ACTIVE', label: `Active (${active.length})` },
              { value: 'RESOLVED', label: `Resolved (${resolved.length})` },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                filter === f.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">🛡️</div>
          <p className="text-sm">No SOS incidents on file.</p>
          <p className="text-xs mt-2">
            We hope you never need it. If you ever do, the SOS button is in the navbar.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No incidents match this filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((i) => {
            const active = isActive(i.status);
            return (
              <li key={i.id}>
                <Link
                  href={`/sos/${i.id}`}
                  className={`card block p-4 hover:shadow-md transition border-2 ${
                    active ? STATUS_COLOR[i.status] : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-700">
                          {i.tier}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            STATUS_COLOR[i.status]
                          }`}
                        >
                          {STATUS_LABEL[i.status]}
                        </span>
                        {active && (
                          <span className="spinner text-red-600" aria-label="Live" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Opened {fmtRelative(i.openedAt)} ·{' '}
                        <span className="font-mono">{i.id.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-brand-700 font-medium whitespace-nowrap">
                      {active ? 'Open console →' : 'View →'}
                    </div>
                  </div>
                  {i.message && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      &ldquo;{i.message}&rdquo;
                    </p>
                  )}
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-3 flex-wrap">
                    <span>📍 {i.lat.toFixed(4)}, {i.lng.toFixed(4)}</span>
                    {i.ackedAt && (
                      <span>· Acknowledged {fmtRelative(i.ackedAt)}</span>
                    )}
                    {i.resolvedAt && (
                      <span>· Resolved {fmtFullDateTime(i.resolvedAt)}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
