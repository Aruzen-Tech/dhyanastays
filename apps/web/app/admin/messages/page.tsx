'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConversationList from '../../../components/ConversationList';
import { useAuth } from '../../../context/AuthContext';
import { adminMessagingApi } from '../../../lib/api';
import type { ConversationListItem } from '../../../lib/types';

export default function AdminMessagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    adminMessagingApi
      .getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

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

      <div className="card overflow-hidden">
        <ConversationList
          conversations={conversations}
          basePath="/admin/messages"
          currentUserId={user?.sub ?? ''}
        />
      </div>

      {conversations.length === 0 && !loading && (
        <p className="text-center text-gray-400 text-sm mt-4">
          No messages yet. Hosts can reach you through their dashboard.
        </p>
      )}
    </div>
  );
}
