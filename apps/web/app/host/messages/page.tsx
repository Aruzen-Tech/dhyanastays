'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConversationList from '../../../components/ConversationList';
import { useAuth } from '../../../context/AuthContext';
import { hostMessagingApi } from '../../../lib/api';
import type { ConversationListItem } from '../../../lib/types';

export default function HostMessagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'GUEST_HOST' | 'HOST_ADMIN'>('all');

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    hostMessagingApi
      .getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered =
    filter === 'all'
      ? conversations
      : conversations.filter((c) => c.type === filter);

  if (isLoading || loading) {
    return (
      <div className="container-page py-16 text-center">
        <span className="spinner text-brand-700 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Messages</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'GUEST_HOST' as const, label: 'Guests' },
          { key: 'HOST_ADMIN' as const, label: 'Admin' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === tab.key
                ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <ConversationList
          conversations={filtered}
          basePath="/host/messages"
          currentUserId={user?.sub ?? ''}
        />
      </div>

      {conversations.length === 0 && !loading && (
        <p className="text-center text-gray-400 text-sm mt-4">
          No messages yet. Guests can reach you from your listing pages.
        </p>
      )}
    </div>
  );
}
