'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { adminSosApi, type SosIncident, type SosStatus } from '../../../lib/api';

const STATUS_FILTERS: { value: SosStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'FALSE_ALARM', label: 'False alarm' },
];

const STATUS_STYLES: Record<SosStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  FALSE_ALARM: 'bg-gray-200 text-gray-600',
};

export default function AdminSosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SosIncident[]>([]);
  const [filter, setFilter] = useState<SosStatus | 'ALL'>('OPEN');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    try {
      const data = await adminSosApi.list(filter === 'ALL' ? undefined : filter);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
    // Auto-refresh while viewing open incidents.
    const int = setInterval(() => {
      if (user) void load();
    }, 15_000);
    return () => clearInterval(int);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const act = async (
    id: string,
    action: 'ack' | 'start' | 'resolve' | 'false',
  ) => {
    setActing(id + action);
    try {
      if (action === 'ack') await adminSosApi.ack(id);
      else if (action === 'start') await adminSosApi.start(id);
      else if (action === 'resolve') await adminSosApi.resolve(id, {});
      else await adminSosApi.resolve(id, { falseAlarm: true });
      await load();
    } finally {
      setActing(null);
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
    <div className="container-page py-10">
      <div className="mb-6">
        <h1 className="page-title">SOS Incident Console</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live stream of panic taps. Auto-refreshes every 15 seconds.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filter === f.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          No incidents match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status]}`}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {r.id.slice(0, 10)}…
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(r.openedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {r.tier} — {r.user?.fullName ?? r.userId}
                    {r.user?.phone && (
                      <a
                        href={`tel:${r.user.phone}`}
                        className="ml-2 text-sm text-brand-700 font-normal"
                      >
                        📞 {r.user.phone}
                      </a>
                    )}
                  </div>
                  {r.message && (
                    <p className="text-sm text-gray-600 mt-1">“{r.message}”</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <a
                      href={`https://maps.google.com/?q=${r.lat},${r.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-700"
                    >
                      📍 Open in Maps ({r.lat.toFixed(4)}, {r.lng.toFixed(4)})
                    </a>
                    {r.bookingId && (
                      <>
                        {' · '}
                        <Link
                          href={`/admin/bookings/${r.bookingId}`}
                          className="text-brand-700"
                        >
                          Booking {r.bookingId.slice(0, 8)}…
                        </Link>
                      </>
                    )}
                  </div>
                  {r.broadcasts && r.broadcasts.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      Broadcast:{' '}
                      {r.broadcasts
                        .map((b) => `${b.channel}→${b.status}`)
                        .join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Link
                    href={`/admin/sos/${r.id}`}
                    className="btn-primary text-xs text-center"
                  >
                    Open console →
                  </Link>
                  {r.status === 'OPEN' && (
                    <button
                      disabled={acting === r.id + 'ack'}
                      onClick={() => act(r.id, 'ack')}
                      className="btn-ghost text-xs"
                    >
                      {acting === r.id + 'ack' ? '…' : 'Quick ack'}
                    </button>
                  )}
                  {(r.status === 'OPEN' || r.status === 'ACKNOWLEDGED') && (
                    <button
                      disabled={acting === r.id + 'start'}
                      onClick={() => act(r.id, 'start')}
                      className="btn-ghost text-xs"
                    >
                      Mark in progress
                    </button>
                  )}
                  {r.status !== 'RESOLVED' && r.status !== 'FALSE_ALARM' && (
                    <>
                      <button
                        disabled={acting === r.id + 'resolve'}
                        onClick={() => act(r.id, 'resolve')}
                        className="btn-ghost text-xs text-emerald-700"
                      >
                        Resolve
                      </button>
                      <button
                        disabled={acting === r.id + 'false'}
                        onClick={() => act(r.id, 'false')}
                        className="btn-ghost text-xs text-gray-500"
                      >
                        False alarm
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
