'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import type { ConversationMessage, MessageStatus } from '../lib/types';

interface Handlers {
  currentUserId: string;
  /** A new message arrived in this conversation. */
  onMessage: (m: ConversationMessage) => void;
  /** Delivery status changed for the given message ids. */
  onStatus: (ids: string[], status: MessageStatus) => void;
}

/**
 * Joins the conversation's realtime room and wires instant new-message,
 * delivery-status and typing updates. On an incoming message from the other
 * party it acks delivered + read (the thread is open). Returns the current
 * typing peer (if any) and an `emitTyping` for the composer. Callbacks are held
 * in a ref so the socket effect only re-runs when the conversation changes.
 */
export function useRealtimeConversation(
  conversationId: string | undefined,
  handlers: Handlers,
) {
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const hRef = useRef(handlers);
  hRef.current = handlers;
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();

    const join = () => {
      socket.emit('conversation:join', { conversationId });
      socket.emit('message:read', { conversationId }); // thread open → read
    };
    if (socket.connected) join();
    socket.on('connect', join);

    const onNew = (m: ConversationMessage) => {
      if (m.conversationId && m.conversationId !== conversationId) return;
      hRef.current.onMessage(m);
      if (m.senderId !== hRef.current.currentUserId) {
        socket.emit('message:delivered', { conversationId });
        socket.emit('message:read', { conversationId });
      }
    };
    const onStatus = (p: {
      conversationId: string;
      messageIds: string[];
      status: MessageStatus;
    }) => {
      if (p.conversationId !== conversationId) return;
      hRef.current.onStatus(p.messageIds, p.status);
    };
    const onTyping = (p: { userId: string; isTyping: boolean }) => {
      if (p.userId === hRef.current.currentUserId) return;
      setTypingUserId(p.isTyping ? p.userId : null);
      if (p.isTyping) {
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingUserId(null), 4000);
      }
    };

    socket.on('message:new', onNew);
    socket.on('message:status', onStatus);
    socket.on('typing', onTyping);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('connect', join);
      socket.off('message:new', onNew);
      socket.off('message:status', onStatus);
      socket.off('typing', onTyping);
      clearTimeout(typingTimer.current);
      setTypingUserId(null);
    };
  }, [conversationId]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (conversationId) getSocket().emit('typing', { conversationId, isTyping });
    },
    [conversationId],
  );

  return { typingUserId, emitTyping };
}
