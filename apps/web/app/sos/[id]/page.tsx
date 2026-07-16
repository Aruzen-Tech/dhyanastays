'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { sosApi } from '../../../lib/api';
import type {
  SosIncident,
  SosMessage,
  SosTimeline,
  SosTimelineEntry,
} from '../../../lib/api';

// Polling cadence — chat + status update every 3s while OPEN/ACK/IN_PROGRESS,
// stop polling once RESOLVED/FALSE_ALARM so we don't hammer the API.
const POLL_INTERVAL_MS = 3000;

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Awaiting response',
  ACKNOWLEDGED: 'Help is on the way',
  IN_PROGRESS: 'Responder en route',
  RESOLVED: 'Resolved',
  FALSE_ALARM: 'False alarm',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 border-red-200',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200',
  FALSE_ALARM: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TIMELINE_DOT: Record<string, string> = {
  OPENED: 'bg-red-600',
  ACKNOWLEDGED: 'bg-amber-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-green-600',
  FALSE_ALARM: 'bg-gray-400',
};

const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SosIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [incident, setIncident] = useState<SosIncident | null>(null);
  const [timeline, setTimeline] = useState<SosTimeline | null>(null);
  const [messages, setMessages] = useState<SosMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // Initial load + polling.
  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const [inc, tl, msgs] = await Promise.all([
          sosApi.getIncident(id),
          sosApi.getTimeline(id),
          sosApi.listMessages(id),
        ]);
        if (cancelled) return;
        setIncident(inc);
        setTimeline(tl);
        setMessages(msgs);
        setLoading(false);

        // Keep polling unless terminal.
        const terminal = inc.status === 'RESOLVED' || inc.status === 'FALSE_ALARM';
        if (!terminal) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load incident');
        setLoading(false);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = chatInput.trim();
    if (!content || sending) return;
    setChatError('');
    setSending(true);
    // Optimistic append so the chat feels instant even with 3s poll.
    const optimistic: SosMessage = {
      id: `opt-${Date.now()}`,
      incidentId: id,
      senderId: user?.sub ?? 'me',
      senderRole: 'GUEST',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatInput('');
    try {
      const saved = await sosApi.sendMessage(id, content);
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), saved]);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-red-600 w-8 h-8" />
      </div>
    );
  }

  if (error || !incident || !timeline) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Incident not found.'}</p>
        <Link href="/dashboard" className="btn-ghost mt-4 inline-block">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const isTerminal = incident.status === 'RESOLVED' || incident.status === 'FALSE_ALARM';
  const mapsUrl = `https://maps.google.com/?q=${incident.lat},${incident.lng}`;

  return (
    <div className="container-page py-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="btn-ghost text-sm mb-4 inline-block">
        ← Dashboard
      </Link>

      {/* ── Status banner ──────────────────────────────────────────────── */}
      <div
        className={`card p-5 mb-4 border-2 ${STATUS_COLOR[incident.status] ?? ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider font-medium">
              {incident.tier}
            </div>
            <h1 className="text-2xl font-semibold mt-1">
              {STATUS_LABEL[incident.status] ?? incident.status}
            </h1>
            <p className="text-xs mt-1 opacity-80">
              Opened {fmtTime(incident.openedAt)} · Incident{' '}
              <span className="font-mono">{incident.id.slice(0, 10)}</span>
            </p>
          </div>
          {!isTerminal && <span className="spinner" aria-label="Live" />}
        </div>
        {incident.message && (
          <blockquote className="border-l-4 border-current pl-3 py-1 mt-3 text-sm italic opacity-90">
            {incident.message}
          </blockquote>
        )}
      </div>

      {/* ── Quick actions: call + map ──────────────────────────────────── */}
      {!isTerminal && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SUPPORT_PHONE ? (
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="card p-4 text-center hover:bg-red-50 transition border-red-200"
            >
              <div className="text-2xl">📞</div>
              <div className="font-semibold mt-1">Call support</div>
              <div className="text-xs text-gray-500 mt-0.5">{SUPPORT_PHONE}</div>
            </a>
          ) : (
            <div className="card p-4 text-center opacity-60">
              <div className="text-2xl">📞</div>
              <div className="font-semibold mt-1">Call support</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Not configured
              </div>
            </div>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-4 text-center hover:bg-gray-50 transition"
          >
            <div className="text-2xl">📍</div>
            <div className="font-semibold mt-1">Open location</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
            </div>
          </a>
        </div>
      )}

      {/* ── Status timeline ────────────────────────────────────────────── */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Status timeline</h2>
        <ol className="space-y-3">
          {timeline.timeline.map((entry: SosTimelineEntry, idx: number) => (
            <li key={`${entry.status}-${idx}`} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div
                  className={`w-3 h-3 rounded-full ${
                    TIMELINE_DOT[entry.status] ?? 'bg-gray-400'
                  }`}
                />
                {idx < timeline.timeline.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="text-sm font-medium text-gray-900">
                  {entry.status.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500">{fmtTime(entry.at)}</div>
                {entry.note && (
                  <div className="text-xs text-gray-600 mt-1">{entry.note}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Chat with responding admin ─────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">Chat with support</h2>
          <span className="text-xs text-gray-400">
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </span>
        </div>

        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 mb-4">
            No messages yet. Ops will reach out as soon as they pick up the alert.
          </p>
        ) : (
          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.senderRole === 'GUEST' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.senderRole === 'GUEST'
                      ? 'bg-brand-700 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  <div className="text-[10px] opacity-70 mb-0.5">
                    {m.senderRole === 'GUEST' ? 'You' : 'Support'} ·{' '}
                    {fmtTime(m.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {!isTerminal ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message support…"
              maxLength={2000}
              disabled={sending}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={sending || !chatInput.trim()}
              className="btn-primary"
            >
              Send
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-500 text-center italic">
            Incident closed — chat is read-only.
          </p>
        )}
        {chatError && <p className="text-red-500 text-xs mt-2">{chatError}</p>}
      </div>
    </div>
  );
}
