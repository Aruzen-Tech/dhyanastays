'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { crmApi, type CrmAnalytics } from '../../../../lib/api';
import CrmTabs from '../../../../components/crm/CrmTabs';

export default function CrmAnalyticsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CrmAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    crmApi
      .getAnalytics()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <p className="eyebrow text-brand-700">Relationship management</p>
      <h1 className="page-title mb-6">CRM · Analytics</h1>
      <CrmTabs />

      {error && <div className="alert-error mb-4">{error}</div>}
      {!data ? null : (
        <>
          {/* Contact KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat label="Contacts" value={data.contacts.total} />
            <Stat label="Guests" value={data.contacts.guests} />
            <Stat label="Hosts" value={data.contacts.hosts} />
            <Stat label="Owned" value={data.contacts.owned} />
            <Stat label="Unowned" value={data.contacts.unowned} tone={data.contacts.unowned > 0 ? 'warn' : undefined} />
            <Stat label="Do-not-contact" value={data.contacts.doNotContact} />
            <Stat
              label="Need attention"
              value={data.contacts.needAttention}
              tone={data.contacts.needAttention > 0 ? 'warn' : undefined}
              hint="In a pipeline stage, no contact in 30 days"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Pipeline distribution */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Pipeline distribution</h2>
              {data.pipeline.length === 0 ? (
                <p className="text-sm text-muted">No contacts in any stage yet.</p>
              ) : (
                <BarList
                  items={data.pipeline.map((s) => ({
                    label: `${s.name}`,
                    sub: s.kind.toLowerCase(),
                    value: s.count,
                    color: s.color,
                  }))}
                />
              )}
            </div>

            {/* Engagement trend */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Engagement · last 14 days</h2>
              <p className="text-xs text-muted mb-4">
                {data.engagement.outreachLast30} outreach · {data.engagement.callsLast30} calls ·{' '}
                {data.engagement.notesLast30} notes (30d)
              </p>
              <TrendChart trend={data.engagement.trend} />
            </div>

            {/* Top tags */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Top tags</h2>
              {data.tags.length === 0 ? (
                <p className="text-sm text-muted">No tags applied yet.</p>
              ) : (
                <BarList
                  items={data.tags.map((t) => ({ label: t.name, value: t.count, color: t.color }))}
                />
              )}
            </div>

            {/* Owners + tasks */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Owner load</h2>
              {data.owners.length === 0 ? (
                <p className="text-sm text-muted">No contacts are assigned to an owner yet.</p>
              ) : (
                <BarList
                  items={data.owners.map((o) => ({ label: o.name, value: o.count, color: '#8b5cf6' }))}
                />
              )}
            </div>
          </div>

          {/* Task health */}
          <div className="card p-6 mt-4">
            <h2 className="font-semibold text-gray-900 mb-4">Task health</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Stat label="Open" value={data.tasks.open} />
              <Stat label="Overdue" value={data.tasks.overdue} tone={data.tasks.overdue > 0 ? 'warn' : undefined} />
              <Stat label="Due in 7d" value={data.tasks.dueSoon} />
              <Stat label="Done (30d)" value={data.tasks.completedLast30} />
              <Stat label="High" value={data.tasks.byPriority.HIGH} />
              <Stat label="Medium" value={data.tasks.byPriority.MEDIUM} />
              <Stat label="Low" value={data.tasks.byPriority.LOW} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: 'warn';
  hint?: string;
}) {
  return (
    <div className="card p-4" title={hint}>
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`text-2xl font-semibold mt-1 tabular-nums ${
          tone === 'warn' ? 'text-amber-600' : 'text-gray-900'
        }`}
      >
        {value.toLocaleString('en-IN')}
      </div>
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; sub?: string; value: number; color: string }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((i, idx) => (
        <li key={idx}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-800">
              {i.label}
              {i.sub && <span className="text-muted"> · {i.sub}</span>}
            </span>
            <span className="tabular-nums text-muted">{i.value}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(i.value / max) * 100}%`, backgroundColor: i.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({ trend }: { trend: Array<{ date: string; outreach: number; calls: number }> }) {
  const max = Math.max(...trend.map((d) => d.outreach + d.calls), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {trend.map((d) => {
          const total = d.outreach + d.calls;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col justify-end"
              title={`${d.date}: ${d.outreach} outreach, ${d.calls} calls`}
            >
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${(d.outreach / max) * 100}%` }}
              />
              <div
                className="w-full bg-sky-400"
                style={{ height: `${(d.calls / max) * 100}%` }}
              />
              {total === 0 && <div className="w-full h-px bg-gray-200" />}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" /> Outreach
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> Calls logged
        </span>
      </div>
    </div>
  );
}
