'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import MessageThread from '../../../../components/MessageThread';
import { useAuth } from '../../../../context/AuthContext';
import { guestMessagingApi } from '../../../../lib/api';
import type { Conversation } from '../../../../lib/types';

export default function GuestConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const fetchConversation = useCallback(() => {
    if (!user) return;
    guestMessagingApi
      .getConversation(id)
      .then((c) => {
        setConversation(c);
        guestMessagingApi.markRead(id).catch(() => {});
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 15000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  const handleSend = async (body: string) => {
    setSending(true);
    try {
      const msg = await guestMessagingApi.sendMessage(id, body);
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
      );
    } catch {
      // ignore
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

  if (error || !conversation) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-gray-500">{error || 'Conversation not found'}</p>
        <Link href="/guest/messages" className="btn-primary mt-4 inline-block">
          Back to messages
        </Link>
      </div>
    );
  }

  const otherUser =
    conversation.userOne.id === user?.sub ? conversation.userTwo : conversation.userOne;

  return (
    <div className="container-page py-6 max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <Link href="/guest/messages" className="btn-ghost p-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-brand-700 font-semibold text-sm">
            {otherUser.fullName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {otherUser.fullName}
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              {otherUser.role === 'HOST' ? 'Host' : otherUser.role === 'ADMIN' ? 'Admin' : 'Guest'}
            </span>
          </p>
          {conversation.listing && (
            <p className="text-xs text-gray-400 truncate">{conversation.listing.title}</p>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 min-h-0">
        <MessageThread
          messages={conversation.messages}
          currentUserId={user?.sub ?? ''}
          onSend={handleSend}
          sending={sending}
        />
      </div>
    </div>
  );
}
