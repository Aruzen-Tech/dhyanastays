'use client';

import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage, MessageStatus } from '../lib/types';

/** WhatsApp-style delivery ticks shown on the sender's own messages. */
function StatusTicks({ status }: { status?: MessageStatus }) {
  if (!status) return null;
  const isRead = status === 'READ';
  const doubled = status === 'DELIVERED' || isRead;
  return (
    <span
      title={status.toLowerCase()}
      aria-label={status.toLowerCase()}
      className={isRead ? 'text-sky-500 font-semibold' : 'text-gray-400'}
    >
      {doubled ? '✓✓' : '✓'}
    </span>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${time}`;
}

interface Props {
  messages: ConversationMessage[];
  currentUserId: string;
  onSend: (body: string) => Promise<void>;
  sending?: boolean;
  /** Emitted (debounced) as the user types, for the realtime typing indicator. */
  onTyping?: (isTyping: boolean) => void;
  /** Shown above the composer when the other party is typing. */
  typingLabel?: string;
}

export default function MessageThread({
  messages,
  currentUserId,
  onSend,
  sending,
  onTyping,
  typingLabel,
}: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    if (!onTyping) return;
    onTyping(true);
    clearTimeout(typingIdle.current);
    typingIdle.current = setTimeout(() => onTyping(false), 1500);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const msg = draft.trim();
    setError('');
    setDraft('');
    clearTimeout(typingIdle.current);
    onTyping?.(false);
    try {
      await onSend(msg);
    } catch (err) {
      // Restore the draft so a blocked/failed message isn't lost, and surface
      // the reason (e.g. the contact-number block).
      setDraft(msg);
      setError(err instanceof Error ? err.message : 'Message could not be sent.');
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                {!isMine && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">
                        {msg.sender.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{msg.sender.fullName}</span>
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    isMine
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {msg.body}
                </div>
                <p
                  className={`text-xs text-gray-400 mt-1 flex items-center gap-1 ${
                    isMine ? 'justify-end' : ''
                  }`}
                >
                  <span>{formatTime(msg.createdAt)}</span>
                  {isMine && !msg.isSystem && <StatusTicks status={msg.status} />}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingLabel && (
        <div className="px-4 pb-1 text-xs text-gray-400 italic flex items-center gap-1">
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          {typingLabel}
        </div>
      )}

      {/* Send error (e.g. contact-number block) */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="input flex-1 resize-none py-2.5 min-h-[42px] max-h-[120px]"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="btn-primary px-4 py-2.5 flex-shrink-0 self-end"
        >
          {sending ? (
            <span className="spinner w-4 h-4" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
