'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { conciergeAdminApi } from '../../../../lib/api';
import type { Conversation, ConversationMessage } from '../../../../lib/types';

const POLL_INTERVAL_MS = 15_000;

export default function AdminConciergeThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [thread, setThread] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async () => {
    try {
      const data = await conciergeAdminApi.get(id);
      setThread(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load thread');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const iv = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await conciergeAdminApi.sendMessage(id, text);
      setDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const join = async () => {
    setJoining(true);
    try {
      await conciergeAdminApi.join(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-10">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="container-page py-10 max-w-2xl mx-auto">
        <Link href="/admin/concierge" className="btn-ghost text-sm mb-4 inline-block">
          ← Back
        </Link>
        <div className="alert-error">{error || 'Thread not found'}</div>
      </div>
    );
  }

  const hasJoined = thread.messages.some(
    (m) => m.senderId === user?.sub && m.isSystem,
  );
  const isClosed = thread.status === 'CLOSED';

  return (
    <div className="container-page py-8 max-w-3xl mx-auto">
      <Link href="/admin/concierge" className="btn-ghost text-sm mb-4 inline-block">
        ← Back to console
      </Link>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="page-title mb-1">
              {thread.userOne.fullName} ↔ {thread.userTwo.fullName}
            </h1>
            <p className="text-sm text-gray-600">
              {thread.listing?.title ?? '—'}
              {thread.booking && (
                <>
                  {' · '}
                  {new Date(thread.booking.startsAt).toLocaleDateString('en-IN')} →{' '}
                  {new Date(thread.booking.endsAt).toLocaleDateString('en-IN')}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {thread.slaBreachedAt && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                SLA breached
              </span>
            )}
            {isClosed && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                Closed
              </span>
            )}
            {!hasJoined && !isClosed && (
              <button
                className="btn-primary text-xs"
                onClick={() => void join()}
                disabled={joining}
              >
                {joining ? '…' : 'Join thread'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert-error mb-3">{error}</div>}

      <div
        ref={listRef}
        className="card p-4 space-y-3 max-h-[55vh] overflow-y-auto mb-3"
      >
        {thread.messages.map((m) => (
          <ChatBubble key={m.id} message={m} isMe={m.senderId === user?.sub} />
        ))}
      </div>

      {isClosed ? (
        <div className="text-sm text-gray-500 text-center py-6">
          This thread is closed.
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <textarea
            className="input flex-1"
            rows={2}
            placeholder="Reply as Dhyana Stays ops…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            maxLength={2000}
          />
          <button
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
            className="btn-primary"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  message,
  isMe,
}: {
  message: ConversationMessage;
  isMe: boolean;
}) {
  if (message.isSystem) {
    return (
      <div className="text-center text-xs text-gray-500 italic py-2">
        {message.body}
      </div>
    );
  }
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isMe
            ? 'bg-brand-700 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        <div
          className={`text-[11px] font-semibold mb-0.5 ${isMe ? 'opacity-90' : 'opacity-80'}`}
        >
          {message.sender.fullName} · {message.sender.role}
        </div>
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.body}
        </div>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
          })}
        </div>
      </div>
    </div>
  );
}
