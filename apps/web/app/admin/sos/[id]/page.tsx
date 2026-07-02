'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { adminSosApi } from '../../../../lib/api';
import type {
  SosIncident,
  SosMessage,
  SosTimeline,
  SosTimelineEntry,
} from '../../../../lib/api';

const POLL_INTERVAL_MS = 5000; // 5s on admin — heavier UI, less urgent than guest 3s

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 border-red-200',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FALSE_ALARM: 'bg-gray-200 text-gray-600 border-gray-300',
};

const TIMELINE_DOT: Record<string, string> = {
  OPENED: 'bg-red-600',
  ACKNOWLEDGED: 'bg-amber-500',
  IN_PROGRESS: 'bg-blue-500',
  RESOLVED: 'bg-emerald-600',
  FALSE_ALARM: 'bg-gray-400',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN');
}

export default function AdminSosIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [incident, setIncident] = useState<SosIncident | null>(null);
  const [timeline, setTimeline] = useState<SosTimeline | null>(null);
  const [messages, setMessages] = useState<SosMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [acting, setActing] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const [inc, tl, msgs] = await Promise.all([
          adminSosApi.get(id),
          adminSosApi.getTimeline(id),
          adminSosApi.listMessages(id),
        ]);
        if (cancelled) return;
        setIncident(inc);
        setTimeline(tl);
        setMessages(msgs);
        setLoading(false);

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

  const refresh = async () => {
    const [inc, tl, msgs] = await Promise.all([
      adminSosApi.get(id),
      adminSosApi.getTimeline(id),
      adminSosApi.listMessages(id),
    ]);
    setIncident(inc);
    setTimeline(tl);
    setMessages(msgs);
  };

  const act = async (action: 'ack' | 'start' | 'resolve' | 'false') => {
    setActing(action);
    try {
      if (action === 'ack') await adminSosApi.ack(id);
      else if (action === 'start') await adminSosApi.start(id);
      else if (action === 'resolve') await adminSosApi.resolve(id, {});
      else await adminSosApi.resolve(id, { falseAlarm: true });
      await refresh();
    } finally {
      setActing(null);
    }
  };

  const handleSend = async () => {
    const content = chatInput.trim();
    if (!content || sending) return;
    setChatError('');
    setSending(true);
    const optimistic: SosMessage = {
      id: `opt-${Date.now()}`,
      incidentId: id,
      senderId: user?.sub ?? 'me',
      senderRole: 'ADMIN',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatInput('');
    try {
      const saved = await adminSosApi.sendMessage(id, content);
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
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  if (error || !incident || !timeline) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-red-500">{error || 'Incident not found.'}</p>
        <Link href="/admin/sos" className="btn-ghost mt-4 inline-block">
          ← SOS console
        </Link>
      </div>
    );
  }

  const isTerminal = incident.status === 'RESOLVED' || incident.status === 'FALSE_ALARM';
  const mapsUrl = `https://maps.google.com/?q=${incident.lat},${incident.lng}`;
  const guestPhone = incident.user?.phone;

  return (
    <div className="container-page py-8 max-w-4xl mx-auto">
      <Link href="/admin/sos" className="btn-ghost text-sm mb-4 inline-block">
        ← Back to incident list
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* ── Left column: incident header + chat ──────────────────────── */}
        <div>
          <div
            className={`card p-5 mb-4 border-2 ${STATUS_STYLES[incident.status] ?? ''}`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <div className="text-xs uppercase tracking-wider font-medium">
                  {incident.tier}
                </div>
                <h1 className="text-2xl font-semibold mt-1">
                  {incident.user?.fullName ?? incident.userId}
                </h1>
                <p className="text-xs mt-1 opacity-80">
                  Opened {fmtDateTime(incident.openedAt)} · Incident{' '}
                  <span className="font-mono">{incident.id.slice(0, 10)}</span>
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[incident.status]}`}
              >
                {incident.status.replace(/_/g, ' ')}
              </span>
            </div>
            {incident.message && (
              <blockquote className="border-l-4 border-current pl-3 py-1 mt-3 text-sm italic opacity-90">
                {incident.message}
              </blockquote>
            )}
          </div>

          {/* Chat */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">
                Chat with {incident.user?.fullName ?? 'guest'}
              </h2>
              <span className="text-xs text-gray-400">
                {messages.length} message{messages.length === 1 ? '' : 's'}
              </span>
            </div>

            {messages.length === 0 ? (
              <p className="text-xs text-gray-500 mb-4">
                No messages yet. Send the guest a reassurance + first question.
              </p>
            ) : (
              <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.senderRole === 'ADMIN'
                          ? 'bg-brand-700 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <div className="text-[10px] opacity-70 mb-0.5">
                        {m.senderRole === 'ADMIN' ? 'You' : 'Guest'} ·{' '}
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
                  placeholder="Reply to the guest…"
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

        {/* ── Right column: actions + timeline + meta ──────────────────── */}
        <div className="space-y-4">
          {/* Quick contact */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Contact</h3>
            <div className="space-y-2">
              {guestPhone ? (
                <a
                  href={`tel:${guestPhone}`}
                  className="block card p-3 hover:bg-red-50 transition border-red-200 text-center"
                >
                  <div className="text-xl">📞</div>
                  <div className="font-semibold text-sm mt-1">Call guest</div>
                  <div className="text-xs text-gray-500 mt-0.5">{guestPhone}</div>
                </a>
              ) : (
                <div className="card p-3 opacity-60 text-center">
                  <div className="text-xl">📞</div>
                  <div className="font-semibold text-sm mt-1">No phone on file</div>
                </div>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block card p-3 hover:bg-gray-50 transition text-center"
              >
                <div className="text-xl">📍</div>
                <div className="font-semibold text-sm mt-1">Open in Maps</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                </div>
              </a>
            </div>
          </div>

          {/* Actions */}
          {!isTerminal && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Actions</h3>
              <div className="space-y-2">
                {incident.status === 'OPEN' && (
                  <button
                    onClick={() => void act('ack')}
                    disabled={acting === 'ack'}
                    className="btn-primary w-full text-sm"
                  >
                    {acting === 'ack' ? <span className="spinner" /> : 'Acknowledge'}
                  </button>
                )}
                {(incident.status === 'OPEN' ||
                  incident.status === 'ACKNOWLEDGED') && (
                  <button
                    onClick={() => void act('start')}
                    disabled={acting === 'start'}
                    className="btn-ghost w-full text-sm"
                  >
                    {acting === 'start' ? '…' : 'Mark in progress'}
                  </button>
                )}
                <button
                  onClick={() => void act('resolve')}
                  disabled={acting === 'resolve'}
                  className="btn-ghost w-full text-sm text-emerald-700"
                >
                  {acting === 'resolve' ? '…' : 'Resolve'}
                </button>
                <button
                  onClick={() => void act('false')}
                  disabled={acting === 'false'}
                  className="btn-ghost w-full text-sm text-gray-500"
                >
                  {acting === 'false' ? '…' : 'False alarm'}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Timeline</h3>
            <ol className="space-y-3">
              {timeline.timeline.map((entry: SosTimelineEntry, idx: number) => (
                <li key={`${entry.status}-${idx}`} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        TIMELINE_DOT[entry.status] ?? 'bg-gray-400'
                      }`}
                    />
                    {idx < timeline.timeline.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="text-xs font-medium text-gray-900">
                      {entry.status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {fmtTime(entry.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Broadcast status */}
          {incident.broadcasts && incident.broadcasts.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                Broadcast log
              </h3>
              <ul className="space-y-1 text-xs">
                {incident.broadcasts.map((b, i) => (
                  <li
                    key={`${b.channel}-${i}`}
                    className="flex justify-between text-gray-600"
                  >
                    <span>{b.channel}</span>
                    <span
                      className={
                        b.status === 'SENT'
                          ? 'text-emerald-700'
                          : b.status === 'SKIPPED'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }
                    >
                      {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
