import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import {
  MESSAGE_CREATED,
  MESSAGE_STATUS,
  MessageCreatedEvent,
  MessageStatusEvent,
} from './messaging.events';

const room = (conversationId: string) => `conversation:${conversationId}`;

/** CORS origins for the socket.io handshake — mirrors the HTTP allow-list. */
function corsOrigins(): string[] | boolean {
  // In dev, reflect the request origin so localhost/127.0.0.1 variants and the
  // polling handshake are never blocked. Production restricts to ALLOWED_ORIGINS.
  if ((process.env.NODE_ENV ?? 'development') !== 'production') return true;
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

interface SocketUser {
  userId: string;
  role: UserRole;
}

/**
 * Realtime messaging over socket.io. Authenticates the handshake with the same
 * access JWT the REST API uses, then joins clients to per-conversation rooms.
 * The durable write path stays REST (validation, contact-block, persistence);
 * this gateway only pushes: new messages + delivered/read status + typing.
 */
@WebSocketGateway({ cors: { origin: corsOrigins(), credentials: true } })
export class MessagingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly messaging: MessagingService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) throw new Error('missing token');

      // Custom-JWT mode (HS256). Auth0/RS256 mode would need JWKS here.
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      const role = (payload['https://dhyanastays.in/role'] ??
        payload.role ??
        'GUEST') as UserRole;
      (client.data as SocketUser) = { userId: String(payload.sub), role };
    } catch {
      client.emit('unauthorized');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    const user = client.data as SocketUser;
    if (!user?.userId || !body?.conversationId) return { ok: false };
    const ok = await this.messaging.canAccessConversation(
      body.conversationId,
      user.userId,
      user.role,
    );
    if (!ok) return { ok: false };
    await client.join(room(body.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('conversation:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    if (body?.conversationId) await client.leave(room(body.conversationId));
    return { ok: true };
  }

  /** Recipient's client acks receipt → mark the counterparty's SENT → DELIVERED. */
  @SubscribeMessage('message:delivered')
  async onDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    const user = client.data as SocketUser;
    if (user?.userId && body?.conversationId) {
      await this.messaging.markDelivered(body.conversationId, user.userId).catch(() => {});
    }
    return { ok: true };
  }

  /** Recipient opened/focused the thread → mark the counterparty's msgs READ. */
  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    const user = client.data as SocketUser;
    if (user?.userId && body?.conversationId) {
      await this.messaging.markRead(body.conversationId, user.userId).catch(() => {});
    }
    return { ok: true };
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string; isTyping?: boolean },
  ): void {
    const user = client.data as SocketUser;
    if (!user?.userId || !body?.conversationId) return;
    client
      .to(room(body.conversationId))
      .emit('typing', { userId: user.userId, isTyping: !!body.isTyping });
  }

  // ── Broadcasts from MessagingService (via the event bus) ───────────────────

  @OnEvent(MESSAGE_CREATED)
  broadcastCreated(e: MessageCreatedEvent): void {
    this.server?.to(room(e.conversationId)).emit('message:new', e.message);
  }

  @OnEvent(MESSAGE_STATUS)
  broadcastStatus(e: MessageStatusEvent): void {
    this.server?.to(room(e.conversationId)).emit('message:status', {
      conversationId: e.conversationId,
      messageIds: e.messageIds,
      status: e.status,
      at: e.at,
    });
  }
}
