'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  crmApi,
  formatINR,
  formatDate,
  type CrmContact360,
  type CrmNote,
  type CrmTag,
  type CrmTimelineItem,
} from '../../../../lib/api';

const KIND_META: Record<CrmTimelineItem['kind'], { color: string; label: string }> = {
  crm: { color: '#8b5cf6', label: 'CRM' },
  booking: { color: '#16a34a', label: 'Booking' },
  message: { color: '#0ea5e9', label: 'Message' },
  issue: { color: '#f59e0b', label: 'Issue' },
  review: { color: '#eab308', label: 'Review' },
};

export default function CrmContactProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [contact, setContact] = useState<CrmContact360 | null>(null);
  const [timeline, setTimeline] = useState<CrmTimelineItem[]>([]);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [allTags, setAllTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
    if (!isLoading && user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, t, n, tags] = await Promise.all([
        crmApi.getContact(userId),
        crmApi.getTimeline(userId),
        crmApi.listNotes(userId),
        crmApi.listTags(),
      ]);
      setContact(c);
      setTimeline(t);
      setNotes(n);
      setAllTags(tags);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void load();
  }, [userId, load]);

  const toggleDnc = async () => {
    if (!contact) return;
    const next = !(contact.profile?.doNotContact ?? false);
    setBusy('dnc');
    try {
      await crmApi.updateProfile(userId, { doNotContact: next });
      await load();
    } finally {
      setBusy('');
    }
  };

  const addTag = async (tagId: string) => {
    if (!tagId) return;
    setBusy('tag');
    try {
      await crmApi.assignTag(userId, tagId);
      await load();
    } finally {
      setBusy('');
    }
  };

  const removeTag = async (tagId: string) => {
    setBusy(`tag:${tagId}`);
    try {
      await crmApi.removeTag(userId, tagId);
      await load();
    } finally {
      setBusy('');
    }
  };

  const addNote = async () => {
    if (!noteBody.trim()) return;
    setBusy('note');
    try {
      await crmApi.addNote(userId, { body: noteBody.trim(), pinned: notePinned });
      setNoteBody('');
      setNotePinned(false);
      await load();
    } finally {
      setBusy('');
    }
  };

  const togglePin = async (n: CrmNote) => {
    await crmApi.updateNote(n.id, { pinned: !n.pinned });
    await load();
  };

  const deleteNote = async (id: string) => {
    await crmApi.deleteNote(id);
    await load();
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container-page py-16">
        <div className="alert-error">{error || 'Contact not found.'}</div>
        <Link href="/admin/crm" className="btn-ghost mt-4">
          ← Back to contacts
        </Link>
      </div>
    );
  }

  const currentTagIds = new Set(contact.tags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id));
  const kpis = contact.kpis;

  return (
    <div className="container-page py-8">
      <Link href="/admin/crm" className="text-sm text-muted hover:text-brand-700">
        ← Contacts
      </Link>

      {/* Header */}
      <div className="card p-6 mt-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{contact.fullName}</h1>
              <span className="badge bg-gray-100 text-gray-600">
                {contact.type === 'HOST' ? 'Host' : 'Guest'}
              </span>
              {contact.profile?.doNotContact && (
                <span className="badge badge-warning">Do not contact</span>
              )}
            </div>
            <div className="text-sm text-muted mt-1">
              {contact.email}
              {contact.phone ? ` · ${contact.phone}` : ''} · Member since{' '}
              {formatDate(contact.createdAt)}
            </div>
          </div>
          <button className="btn-secondary" disabled={busy === 'dnc'} onClick={toggleDnc}>
            {contact.profile?.doNotContact ? 'Allow contact' : 'Mark do-not-contact'}
          </button>
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {contact.tags.map((t) => (
            <span
              key={t.id}
              className="badge inline-flex items-center gap-1"
              style={{ backgroundColor: `${t.color}22`, color: t.color }}
            >
              {t.name}
              <button
                className="opacity-60 hover:opacity-100"
                disabled={busy === `tag:${t.id}`}
                onClick={() => removeTag(t.id)}
                aria-label={`Remove ${t.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {availableTags.length > 0 && (
            <select
              className="input !w-auto !py-1 text-sm"
              value=""
              disabled={busy === 'tag'}
              onChange={(e) => addTag(e.target.value)}
            >
              <option value="">+ Add tag</option>
              {availableTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <Kpi label="Bookings" value={String(kpis.bookingsCount)} />
        <Kpi label="Lifetime value" value={formatINR(kpis.totalSpentPaise)} />
        <Kpi
          label="Last booking"
          value={kpis.lastBookingAt ? formatDate(kpis.lastBookingAt) : '—'}
        />
        <Kpi
          label="Reviews"
          value={
            kpis.reviewsCount
              ? `${kpis.reviewsCount} · ${kpis.avgRating?.toFixed(1) ?? '—'}★`
              : '0'
          }
        />
        <Kpi label="Open issues" value={String(kpis.openIssues)} />
        <Kpi label="Messages" value={String(kpis.messagesSent)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Timeline */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Activity timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 ml-2">
              {timeline.map((item) => {
                const meta = KIND_META[item.kind];
                return (
                  <li key={item.id} className="mb-5 ml-4">
                    <span
                      className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: meta.color }}
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="badge text-xs"
                        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <time className="text-xs text-muted">{formatDate(item.occurredAt)}</time>
                    </div>
                    <p className="text-sm text-gray-800 mt-1">{item.summary}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            className="input min-h-[80px]"
            placeholder="Add an internal note…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
              />
              Pin
            </label>
            <button
              className="btn-primary"
              disabled={busy === 'note' || !noteBody.trim()}
              onClick={addNote}
            >
              Add note
            </button>
          </div>

          <div className="divider" />

          {notes.length === 0 ? (
            <p className="text-sm text-muted">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted">
                    <span>{formatDate(n.createdAt)}</span>
                    <div className="flex gap-3">
                      <button className="hover:text-brand-700" onClick={() => togglePin(n)}>
                        {n.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button className="hover:text-red-600" onClick={() => deleteNote(n.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
