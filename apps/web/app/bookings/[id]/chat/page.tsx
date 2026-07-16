'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { conciergeGuestApi } from '../../../../lib/api';
import type { Conversation, ConversationMessage } from '../../../../lib/types';

const POLL_INTERVAL_MS = 15_000;

export default function GuestConciergeChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [thread, setThread] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const load = async (silent = false) => {
    try {
      const data = await conciergeGuestApi.getThread(id);
      setThread(data);
      if (!silent) await conciergeGuestApi.markRead(id).catch(() => {});
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const iv = setInterval(() => void load(true), POLL_INTERVAL_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  const hostName = useMemo(() => {
    if (!thread) return '';
    return thread.userTwo?.fullName ?? 'your host';
  }, [thread]);

  const isClosed = thread?.status === 'CLOSED';

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await conciergeGuestApi.sendMessage(id, text);
      setDraft('');
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container-page py-10">
        <p className="text-gray-500">Loading concierge chat…</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="container-page py-10 max-w-2xl mx-auto">
        <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
          ← Back to booking
        </Link>
        <div className="alert-error">{error || 'Chat unavailable'}</div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 max-w-3xl mx-auto">
      <Link href={`/bookings/${id}`} className="btn-ghost text-sm mb-4 inline-block">
        ← Back to booking
      </Link>

      <div className="card p-5 mb-4 bg-brand-50 border border-brand-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="page-title mb-1">Concierge — {thread.listing?.title}</h1>
            <p className="text-sm text-gray-600">
              Direct line to {hostName}. Typical reply within 4 hours.
            </p>
          </div>
          {isClosed && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
              Closed
            </span>
          )}
        </div>
      </div>

      {error && <div className="alert-error mb-3">{error}</div>}

      <div
        ref={listRef}
        className="card p-4 space-y-3 max-h-[60vh] overflow-y-auto mb-3"
      >
        {thread.messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            No messages yet. Send the first one.
          </p>
        )}
        {thread.messages.map((m) => (
          <ChatBubble key={m.id} message={m} isMe={m.senderId === user?.sub} />
        ))}
      </div>

      {isClosed ? (
        <div className="text-sm text-gray-500 text-center py-6">
          This thread has been closed. Please reach out to{' '}
          <Link href="/guest/help/contact" className="text-brand-700">
            support
          </Link>{' '}
          for any further questions.
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <textarea
            className="input flex-1"
            rows={2}
            placeholder="Type a message…"
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
        {!isMe && (
          <div className="text-[11px] font-semibold opacity-80 mb-0.5">
            {message.sender.fullName}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.body}
        </div>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
