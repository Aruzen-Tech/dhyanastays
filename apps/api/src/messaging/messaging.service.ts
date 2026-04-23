import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ConversationKind,
  ConversationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../notification/outbox.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
import { AuditService } from '../common/services/audit.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Concierge SLA: host must reply within this window after a guest message,
 * otherwise the hourly sweep creates an admin alert. 4 hours per §5.10.
 */
const CONCIERGE_SLA_HOURS = 4;

/**
 * Post-stay retention before a concierge thread auto-closes. 7 days after
 * `booking.endsAt` — gives the guest a grace window for late follow-ups
 * (lost items, late invoices) without leaving threads indefinitely open.
 */
const CONCIERGE_CLOSE_DAYS_AFTER_END = 7;

/** Booking statuses where a concierge thread may exist / remain OPEN. */
const CONFIRMED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED_DEPOSIT,
  BookingStatus.CONFIRMED_PAID,
  BookingStatus.BALANCE_DUE,
  BookingStatus.COMPLETED,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly adminNotifications: AdminNotificationService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Create or find conversation (ad-hoc, pre-booking) ────────────────────

  async startConversation(
    userId: string,
    userRole: UserRole,
    dto: CreateConversationDto,
  ) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const type = this.resolveConversationType(userRole, recipient.role);
    const [userOneId, userTwoId] = this.orderParticipants(
      userId,
      userRole,
      dto.recipientId,
      recipient.role,
    );

    const existing = await this.prisma.conversation.findUnique({
      where: {
        userOneId_userTwoId_listingId: {
          userOneId,
          userTwoId,
          listingId: dto.listingId ?? '',
        },
      },
      include: this.conversationInclude(),
    });

    if (existing) {
      await this.prisma.message.create({
        data: {
          conversationId: existing.id,
          senderId: userId,
          senderRole: userRole,
          body: dto.message,
        },
      });
      await this.touchConversationAfterMessage(
        existing.id,
        userRole,
        existing.kind,
        existing.status,
      );
      return this.getConversationById(existing.id, userId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        userOneId,
        userTwoId,
        listingId: dto.listingId || null,
        bookingId: dto.bookingId || null,
        subject: dto.subject || null,
        messages: {
          create: {
            senderId: userId,
            senderRole: userRole,
            body: dto.message,
          },
        },
      },
      include: this.conversationInclude(),
    });

    return conversation;
  }

  // ─── List conversations for a user ────────────────────────────────────────

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: {
        userOne: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        userTwo: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
        booking: { select: { id: true, startsAt: true, endsAt: true, status: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, isRead: true, isSystem: true },
        },
        _count: {
          select: {
            messages: { where: { isRead: false, senderId: { not: userId } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      type: c.type,
      kind: c.kind,
      status: c.status,
      subject: c.subject,
      otherUser: c.userOneId === userId ? c.userTwo : c.userOne,
      listing: c.listing,
      booking: c.booking,
      slaDueAt: c.slaDueAt,
      slaBreachedAt: c.slaBreachedAt,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      updatedAt: c.updatedAt,
    }));
  }

  // ─── Get single conversation with messages ───────────────────────────────

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }
    return conversation;
  }

  /** Admin (L2+) reads any conversation, skipping the participant check. */
  async adminGetConversationById(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  // ─── Send message ────────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    userId: string,
    userRole: UserRole,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const isParticipant =
      conversation.userOneId === userId || conversation.userTwoId === userId;
    if (!isParticipant && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Not your conversation');
    }
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Conversation is closed');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        senderRole: userRole,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      },
    });

    await this.touchConversationAfterMessage(
      conversationId,
      userRole,
      conversation.kind,
      conversation.status,
    );

    // Only concierge threads fan out notifications here. Ad-hoc threads stay
    // lightweight and rely on in-app polling.
    if (conversation.kind === ConversationKind.CONCIERGE) {
      await this.notifyCounterpartyOfMessage(
        conversation.id,
        userId,
        userRole,
        dto.body,
      );
    }

    return message;
  }

  // ─── Mark messages as read ───────────────────────────────────────────────

  async markRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  // ─── Unread count ────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ userOneId: userId }, { userTwoId: userId }],
        },
      },
    });
    return { count };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONCIERGE (§5.10)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Ensure a concierge thread exists for the given booking. Idempotent:
   * safe to call from booking confirmation even when retried, because the
   * partial unique `Conversation_bookingId_concierge_uq` guarantees at most
   * one concierge row per booking.
   *
   * When a concierge thread is created we also post a system welcome message
   * so the guest sees a non-empty thread on first open.
   */
  async ensureConciergeThread(bookingId: string, tx?: TxClient) {
    const client = tx ?? this.prisma;

    const existing = await client.conversation.findFirst({
      where: { bookingId, kind: ConversationKind.CONCIERGE },
    });
    if (existing) return existing;

    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true, title: true, host: { select: { userId: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.listing.host) {
      throw new BadRequestException('Listing has no host user');
    }

    const guestId = booking.guestId;
    const hostUserId = booking.listing.host.userId;

    // GUEST < HOST in priority, so userOne=guest, userTwo=host.
    try {
      const created = await client.conversation.create({
        data: {
          type: 'GUEST_HOST',
          kind: ConversationKind.CONCIERGE,
          status: ConversationStatus.OPEN,
          userOneId: guestId,
          userTwoId: hostUserId,
          listingId: booking.listingId,
          bookingId,
          subject: `Concierge — ${booking.listing.title}`,
          messages: {
            create: {
              senderId: hostUserId,
              senderRole: UserRole.HOST,
              isSystem: true,
              body:
                `Welcome! This is your direct line to the host for everything about your stay — ` +
                `arrivals, schedule, dietary needs, or anything that comes up during the retreat. ` +
                `Replies typically come within a few hours.`,
            },
          },
        },
      });
      return created;
    } catch (err) {
      // Race: another caller (e.g. parallel confirmation worker) won the
      // partial unique. Re-read and return.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await client.conversation.findFirst({
          where: { bookingId, kind: ConversationKind.CONCIERGE },
        });
        if (winner) return winner;
      }
      throw err;
    }
  }

  /** Guest view of the concierge thread, gated by booking ownership. */
  async getConciergeThreadForGuest(bookingId: string, guestId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, guestId: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId) {
      throw new ForbiddenException('Not your booking');
    }
    if (!CONFIRMED_BOOKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Concierge chat is available after confirmation');
    }

    const thread = await this.ensureConciergeThread(bookingId);
    return this.getConversationById(thread.id, guestId);
  }

  /** Host view of the concierge thread, gated by listing ownership. */
  async getConciergeThreadForHost(bookingId: string, hostUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { host: { select: { userId: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.listing.host?.userId !== hostUserId) {
      throw new ForbiddenException('Not your listing');
    }
    if (!CONFIRMED_BOOKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Concierge chat is available after confirmation');
    }

    const thread = await this.ensureConciergeThread(booking.id);
    return this.getConversationById(thread.id, hostUserId);
  }

  /** Admin view: any concierge thread, no participant check. */
  async listConciergeThreadsForAdmin(opts: {
    status?: ConversationStatus;
    breachedOnly?: boolean;
  }) {
    return this.prisma.conversation.findMany({
      where: {
        kind: ConversationKind.CONCIERGE,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.breachedOnly ? { slaBreachedAt: { not: null } } : {}),
      },
      include: {
        userOne: { select: { id: true, fullName: true, email: true } },
        userTwo: { select: { id: true, fullName: true, email: true } },
        listing: { select: { id: true, title: true } },
        booking: { select: { id: true, startsAt: true, endsAt: true, status: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderRole: true, isSystem: true },
        },
      },
      orderBy: [
        { slaBreachedAt: 'desc' },
        { slaDueAt: 'asc' },
        { updatedAt: 'desc' },
      ],
      take: 200,
    });
  }

  /** Admin (L1/L2) joins a thread — posts a visible system message. */
  async adminJoinThread(conversationId: string, adminUserId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const already = await this.prisma.message.findFirst({
      where: {
        conversationId,
        isSystem: true,
        senderId: adminUserId,
      },
    });
    if (already) return { joined: true, alreadyJoined: true };

    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { fullName: true },
    });

    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: adminUserId,
        senderRole: UserRole.ADMIN,
        isSystem: true,
        body: `${admin?.fullName ?? 'Ops'} from the Dhyana Stays team has joined to help.`,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await this.auditService.log(
      adminUserId,
      'CONCIERGE_ADMIN_JOINED',
      'conversation',
      conversationId,
      {},
    );

    return { joined: true, alreadyJoined: false };
  }

  // ── SLA sweep — called hourly from the concierge-sla processor ───────────

  /**
   * Find OPEN concierge threads whose host-reply SLA has already lapsed
   * (slaDueAt < now) and haven't yet been flagged to ops. For each, mark
   * `slaBreachedAt` and create an AdminNotification. Returns count processed.
   */
  async sweepSlaBreaches(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.conversation.findMany({
      where: {
        kind: ConversationKind.CONCIERGE,
        status: ConversationStatus.OPEN,
        slaBreachedAt: null,
        slaDueAt: { lt: now, not: null },
      },
      select: {
        id: true,
        bookingId: true,
        listing: { select: { title: true } },
        userOne: { select: { fullName: true } },
        lastGuestMessageAt: true,
      },
      take: 200,
    });
    if (due.length === 0) return 0;

    for (const c of due) {
      await this.prisma.conversation.update({
        where: { id: c.id },
        data: { slaBreachedAt: now },
      });
      const hoursWaiting = c.lastGuestMessageAt
        ? Math.round(
            (now.getTime() - new Date(c.lastGuestMessageAt).getTime()) / 3_600_000,
          )
        : CONCIERGE_SLA_HOURS;
      await this.adminNotifications.create(
        'CONCIERGE_SLA_BREACH',
        'Concierge host-reply SLA breached',
        `${c.userOne.fullName} has been waiting ${hoursWaiting}h for a host reply on ${c.listing?.title ?? 'a booking'}.`,
        { conversationId: c.id, bookingId: c.bookingId },
      );
    }
    this.logger.log(`SLA breach sweep: flagged ${due.length} concierge threads`);
    return due.length;
  }

  /**
   * Close concierge threads for bookings that completed more than
   * CONCIERGE_CLOSE_DAYS_AFTER_END days ago. Idempotent — already CLOSED
   * threads are excluded by the `status` predicate.
   */
  async closeStaleConciergeThreads(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - CONCIERGE_CLOSE_DAYS_AFTER_END * 24 * 60 * 60 * 1000,
    );
    const stale = await this.prisma.conversation.findMany({
      where: {
        kind: ConversationKind.CONCIERGE,
        status: ConversationStatus.OPEN,
        booking: {
          status: BookingStatus.COMPLETED,
          endsAt: { lt: cutoff },
        },
      },
      select: { id: true },
      take: 500,
    });
    if (stale.length === 0) return 0;

    const ids = stale.map((c) => c.id);
    await this.prisma.conversation.updateMany({
      where: { id: { in: ids } },
      data: { status: ConversationStatus.CLOSED, closedAt: now },
    });
    // Closed status + `closedAt` is surfaced by the UI as a "Thread closed"
    // banner — we intentionally don't post a system message here because
    // Message requires a valid senderId FK and this is a scheduler sweep.
    this.logger.log(`Closed ${stale.length} stale concierge threads`);
    return stale.length;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNALS
  // ══════════════════════════════════════════════════════════════════════════

  private async touchConversationAfterMessage(
    conversationId: string,
    senderRole: UserRole,
    kind: ConversationKind,
    status: ConversationStatus,
  ) {
    const now = new Date();
    const data: Prisma.ConversationUpdateInput = { updatedAt: now };

    if (kind === ConversationKind.CONCIERGE && status === ConversationStatus.OPEN) {
      if (senderRole === UserRole.GUEST) {
        // First outstanding guest message sets the 4h clock; subsequent
        // guest messages extend it to keep `slaDueAt` meaningful.
        data.lastGuestMessageAt = now;
        data.slaDueAt = new Date(now.getTime() + CONCIERGE_SLA_HOURS * 3_600_000);
        data.slaBreachedAt = null;
      } else if (senderRole === UserRole.HOST || senderRole === UserRole.ADMIN) {
        // Host (or ops standing in) responded — clear the SLA clock.
        data.lastHostMessageAt = now;
        data.slaDueAt = null;
        data.slaBreachedAt = null;
      }
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data,
    });
  }

  private async notifyCounterpartyOfMessage(
    conversationId: string,
    senderId: string,
    senderRole: UserRole,
    body: string,
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        userOneId: true,
        userTwoId: true,
        bookingId: true,
        listing: { select: { title: true } },
        userOne: { select: { fullName: true } },
        userTwo: { select: { fullName: true } },
      },
    });
    if (!conv) return;

    // Concierge = GUEST_HOST; sender maps deterministically to counterparty.
    const recipientId =
      senderId === conv.userOneId ? conv.userTwoId : conv.userOneId;
    const senderName =
      senderId === conv.userOneId ? conv.userOne.fullName : conv.userTwo.fullName;

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, fullName: true },
    });
    if (!recipient?.email) return;

    const preview = body.length > 180 ? body.slice(0, 180) + '…' : body;
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    const link =
      senderRole === UserRole.GUEST
        ? `${webUrl}/host/bookings/${conv.bookingId}/chat`
        : `${webUrl}/bookings/${conv.bookingId}/chat`;

    const email = {
      to: recipient.email,
      subject: `New message from ${senderName} — ${conv.listing?.title ?? 'your booking'}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a5c4a">You have a new concierge message</h2>
          <p>Hi ${recipient.fullName},</p>
          <p><strong>${senderName}</strong> just sent you a message about <em>${conv.listing?.title ?? 'your booking'}</em>:</p>
          <blockquote style="background:#f3f4f6;padding:12px 16px;border-left:4px solid #1a5c4a;white-space:pre-wrap">${this.escapeHtml(preview)}</blockquote>
          <a href="${link}" style="display:inline-block;background:#1a5c4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">Reply now</a>
        </div>
      `,
    };

    await this.outbox.enqueue({
      userId: recipientId,
      kind: 'message.received',
      channels: ['EMAIL'],
      payload: email,
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private resolveConversationType(
    senderRole: UserRole,
    recipientRole: UserRole,
  ): string {
    const roles = new Set([senderRole, recipientRole]);
    if (roles.has('GUEST') && roles.has('HOST')) return 'GUEST_HOST';
    if (roles.has('HOST') && roles.has('ADMIN')) return 'HOST_ADMIN';
    if (roles.has('GUEST') && roles.has('ADMIN')) return 'GUEST_HOST';
    throw new BadRequestException(
      `Cannot create conversation between ${senderRole} and ${recipientRole}`,
    );
  }

  private orderParticipants(
    userAId: string,
    userARole: UserRole,
    userBId: string,
    userBRole: UserRole,
  ): [string, string] {
    const priority: Record<string, number> = { GUEST: 0, HOST: 1, ADMIN: 2 };
    return priority[userARole] <= priority[userBRole]
      ? [userAId, userBId]
      : [userBId, userAId];
  }

  private conversationInclude() {
    return {
      userOne: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      userTwo: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      listing: { select: { id: true, title: true } },
      booking: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        },
      },
    };
  }
}
