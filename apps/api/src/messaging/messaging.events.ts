/**
 * Internal event-bus contract between MessagingService (producer) and
 * MessagingGateway (realtime broadcaster). Keeps the service free of any
 * socket.io dependency — it just emits; the gateway fans out to the room.
 */

export const MESSAGE_CREATED = 'message.created';
export const MESSAGE_STATUS = 'message.status';

export interface MessageCreatedEvent {
  conversationId: string;
  // The created message (with `sender`) — broadcast verbatim to the room.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
}

export interface MessageStatusEvent {
  conversationId: string;
  messageIds: string[];
  status: 'DELIVERED' | 'READ';
  at: string;
}
