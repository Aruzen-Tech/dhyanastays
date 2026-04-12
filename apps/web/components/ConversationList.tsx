'use client';

import Link from 'next/link';
import type { ConversationListItem } from '../lib/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface Props {
  conversations: ConversationListItem[];
  basePath: string; // e.g. "/guest/messages", "/host/messages", "/admin/messages"
  activeId?: string;
  currentUserId: string;
}

export default function ConversationList({ conversations, basePath, activeId, currentUserId }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-gray-500 text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((c) => {
        const isActive = c.id === activeId;
        const preview = c.lastMessage?.body ?? '';
        const truncated = preview.length > 60 ? preview.slice(0, 60) + '...' : preview;
        const isOwnLastMsg = c.lastMessage?.senderId === currentUserId;

        return (
          <Link
            key={c.id}
            href={`${basePath}/${c.id}`}
            className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
              isActive ? 'bg-brand-50 border-l-2 border-brand-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-semibold text-sm">
                  {c.otherUser.fullName.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {c.otherUser.fullName}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      {c.otherUser.role === 'ADMIN' ? 'Admin' : c.otherUser.role === 'HOST' ? 'Host' : 'Guest'}
                    </span>
                  </p>
                  {c.lastMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {timeAgo(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                {c.subject && (
                  <p className="text-xs text-brand-600 font-medium truncate">{c.subject}</p>
                )}

                {c.listing && (
                  <p className="text-xs text-gray-400 truncate">Re: {c.listing.title}</p>
                )}

                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {isOwnLastMsg && <span className="text-gray-400">You: </span>}
                  {truncated}
                </p>
              </div>

              {c.unreadCount > 0 && (
                <span className="bg-brand-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {c.unreadCount > 9 ? '9+' : c.unreadCount}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
