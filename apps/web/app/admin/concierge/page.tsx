'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { conciergeAdminApi } from '../../../lib/api';
import type { ConciergeAdminThread } from '../../../lib/types';

type Filter = 'ALL' | 'OPEN' | 'CLOSED' | 'BREACHED';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'BREACHED', label: 'SLA breached' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function AdminConciergePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ConciergeAdminThread[]>([]);
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    try {
      const opts =
        filter === 'ALL'
          ? {}
          : filter === 'BREACHED'
            ? { breachedOnly: true }
            : { status: filter };
      const data = await conciergeAdminApi.list(opts);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-10">
        <p className="text-gray-500">Loading concierge threads…</p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <h1 className="page-title">Concierge Console</h1>
        <p className="text-gray-500 text-sm mt-1">
          Host-reply SLA is 4 hours. Breached threads are auto-flagged — step in
          if the guest is waiting too long.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => (
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
          No concierge threads match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.slaBreachedAt && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        SLA breached
                      </span>
                    )}
                    {!r.slaBreachedAt && r.slaDueAt && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Host reply due{' '}
                        {new Date(r.slaDueAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Updated {new Date(r.updatedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {r.userOne.fullName} ↔ {r.userTwo.fullName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.listing?.title ?? '—'}
                    {r.booking && (
                      <>
                        {' · '}
                        {new Date(r.booking.startsAt).toLocaleDateString('en-IN')} →{' '}
                        {new Date(r.booking.endsAt).toLocaleDateString('en-IN')}
                      </>
                    )}
                  </div>
                  {r.lastMessage && (
                    <div className="mt-2 text-xs text-gray-500 truncate">
                      <span className="uppercase tracking-wide opacity-80">
                        {r.lastMessage.senderRole}
                      </span>
                      : {r.lastMessage.body}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Link
                    href={`/admin/concierge/${r.id}`}
                    className="btn-primary text-xs text-center"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
