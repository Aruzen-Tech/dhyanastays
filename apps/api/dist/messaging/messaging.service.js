"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MessagingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const outbox_service_1 = require("../notification/outbox.service");
const admin_notification_service_1 = require("../admin/admin-notification.service");
const audit_service_1 = require("../common/services/audit.service");
const host_settings_service_1 = require("../host-settings/host-settings.service");
const CONCIERGE_SLA_HOURS = 4;
const CONCIERGE_CLOSE_DAYS_AFTER_END = 7;
const CONFIRMED_BOOKING_STATUSES = [
    client_1.BookingStatus.CONFIRMED_DEPOSIT,
    client_1.BookingStatus.CONFIRMED_PAID,
    client_1.BookingStatus.BALANCE_DUE,
    client_1.BookingStatus.COMPLETED,
];
let MessagingService = MessagingService_1 = class MessagingService {
    constructor(prisma, outbox, adminNotifications, auditService, hostSettings) {
        this.prisma = prisma;
        this.outbox = outbox;
        this.adminNotifications = adminNotifications;
        this.auditService = auditService;
        this.hostSettings = hostSettings;
        this.logger = new common_1.Logger(MessagingService_1.name);
    }
    async startConversation(userId, userRole, dto) {
        const recipient = await this.prisma.user.findUnique({
            where: { id: dto.recipientId },
        });
        if (!recipient)
            throw new common_1.NotFoundException('Recipient not found');
        if (userRole === 'GUEST' && recipient.role === 'HOST') {
            const allowed = await this.hostSettings.allowsGuestMessages(recipient.id);
            if (!allowed) {
                throw new common_1.ForbiddenException('This host is not accepting direct messages right now.');
            }
        }
        const type = this.resolveConversationType(userRole, recipient.role);
        const [userOneId, userTwoId] = this.orderParticipants(userId, userRole, dto.recipientId, recipient.role);
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
            await this.touchConversationAfterMessage(existing.id, userRole, existing.kind, existing.status);
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
    async getConversations(userId) {
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
    async getConversationById(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: this.conversationInclude(),
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
            throw new common_1.ForbiddenException('Not your conversation');
        }
        return conversation;
    }
    async adminGetConversationById(conversationId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: this.conversationInclude(),
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        return conversation;
    }
    async sendMessage(conversationId, userId, userRole, dto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const isParticipant = conversation.userOneId === userId || conversation.userTwoId === userId;
        if (!isParticipant && userRole !== client_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Not your conversation');
        }
        if (conversation.status === client_1.ConversationStatus.CLOSED) {
            throw new common_1.BadRequestException('Conversation is closed');
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
        await this.touchConversationAfterMessage(conversationId, userRole, conversation.kind, conversation.status);
        if (conversation.kind === client_1.ConversationKind.CONCIERGE) {
            await this.notifyCounterpartyOfMessage(conversation.id, userId, userRole, dto.body);
        }
        return message;
    }
    async markRead(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
            throw new common_1.ForbiddenException('Not your conversation');
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
    async getUnreadCount(userId) {
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
    async ensureConciergeThread(bookingId, tx) {
        const client = tx ?? this.prisma;
        const existing = await client.conversation.findFirst({
            where: { bookingId, kind: client_1.ConversationKind.CONCIERGE },
        });
        if (existing)
            return existing;
        const booking = await client.booking.findUnique({
            where: { id: bookingId },
            include: {
                listing: { select: { hostId: true, title: true, host: { select: { userId: true } } } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (!booking.listing.host) {
            throw new common_1.BadRequestException('Listing has no host user');
        }
        const guestId = booking.guestId;
        const hostUserId = booking.listing.host.userId;
        try {
            const created = await client.conversation.create({
                data: {
                    type: 'GUEST_HOST',
                    kind: client_1.ConversationKind.CONCIERGE,
                    status: client_1.ConversationStatus.OPEN,
                    userOneId: guestId,
                    userTwoId: hostUserId,
                    listingId: booking.listingId,
                    bookingId,
                    subject: `Concierge — ${booking.listing.title}`,
                    messages: {
                        create: {
                            senderId: hostUserId,
                            senderRole: client_1.UserRole.HOST,
                            isSystem: true,
                            body: `Welcome! This is your direct line to the host for everything about your stay — ` +
                                `arrivals, schedule, dietary needs, or anything that comes up during the retreat. ` +
                                `Replies typically come within a few hours.`,
                        },
                    },
                },
            });
            return created;
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                const winner = await client.conversation.findFirst({
                    where: { bookingId, kind: client_1.ConversationKind.CONCIERGE },
                });
                if (winner)
                    return winner;
            }
            throw err;
        }
    }
    async getConciergeThreadForGuest(bookingId, guestId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                guestId: true,
                status: true,
                listing: { select: { host: { select: { userId: true } } } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== guestId) {
            throw new common_1.ForbiddenException('Not your booking');
        }
        if (!CONFIRMED_BOOKING_STATUSES.includes(booking.status)) {
            throw new common_1.BadRequestException('Concierge chat is available after confirmation');
        }
        const hostUserId = booking.listing?.host?.userId;
        if (hostUserId) {
            const allowed = await this.hostSettings.allowsConciergeChat(hostUserId);
            if (!allowed) {
                throw new common_1.ForbiddenException('Concierge chat is not available for this stay.');
            }
        }
        const thread = await this.ensureConciergeThread(bookingId);
        return this.getConversationById(thread.id, guestId);
    }
    async getConciergeThreadForHost(bookingId, hostUserId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                listing: { select: { host: { select: { userId: true } } } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.listing.host?.userId !== hostUserId) {
            throw new common_1.ForbiddenException('Not your listing');
        }
        if (!CONFIRMED_BOOKING_STATUSES.includes(booking.status)) {
            throw new common_1.BadRequestException('Concierge chat is available after confirmation');
        }
        const thread = await this.ensureConciergeThread(booking.id);
        return this.getConversationById(thread.id, hostUserId);
    }
    async listConciergeThreadsForAdmin(opts) {
        return this.prisma.conversation.findMany({
            where: {
                kind: client_1.ConversationKind.CONCIERGE,
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
    async adminJoinThread(conversationId, adminUserId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const already = await this.prisma.message.findFirst({
            where: {
                conversationId,
                isSystem: true,
                senderId: adminUserId,
            },
        });
        if (already)
            return { joined: true, alreadyJoined: true };
        const admin = await this.prisma.user.findUnique({
            where: { id: adminUserId },
            select: { fullName: true },
        });
        await this.prisma.message.create({
            data: {
                conversationId,
                senderId: adminUserId,
                senderRole: client_1.UserRole.ADMIN,
                isSystem: true,
                body: `${admin?.fullName ?? 'Ops'} from the Dhyana Stays team has joined to help.`,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        await this.auditService.log(adminUserId, 'CONCIERGE_ADMIN_JOINED', 'conversation', conversationId, {});
        return { joined: true, alreadyJoined: false };
    }
    async sweepSlaBreaches(now = new Date()) {
        const due = await this.prisma.conversation.findMany({
            where: {
                kind: client_1.ConversationKind.CONCIERGE,
                status: client_1.ConversationStatus.OPEN,
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
        if (due.length === 0)
            return 0;
        for (const c of due) {
            await this.prisma.conversation.update({
                where: { id: c.id },
                data: { slaBreachedAt: now },
            });
            const hoursWaiting = c.lastGuestMessageAt
                ? Math.round((now.getTime() - new Date(c.lastGuestMessageAt).getTime()) / 3_600_000)
                : CONCIERGE_SLA_HOURS;
            await this.adminNotifications.create('CONCIERGE_SLA_BREACH', 'Concierge host-reply SLA breached', `${c.userOne.fullName} has been waiting ${hoursWaiting}h for a host reply on ${c.listing?.title ?? 'a booking'}.`, { conversationId: c.id, bookingId: c.bookingId });
        }
        this.logger.log(`SLA breach sweep: flagged ${due.length} concierge threads`);
        return due.length;
    }
    async closeStaleConciergeThreads(now = new Date()) {
        const cutoff = new Date(now.getTime() - CONCIERGE_CLOSE_DAYS_AFTER_END * 24 * 60 * 60 * 1000);
        const stale = await this.prisma.conversation.findMany({
            where: {
                kind: client_1.ConversationKind.CONCIERGE,
                status: client_1.ConversationStatus.OPEN,
                booking: {
                    status: client_1.BookingStatus.COMPLETED,
                    endsAt: { lt: cutoff },
                },
            },
            select: { id: true },
            take: 500,
        });
        if (stale.length === 0)
            return 0;
        const ids = stale.map((c) => c.id);
        await this.prisma.conversation.updateMany({
            where: { id: { in: ids } },
            data: { status: client_1.ConversationStatus.CLOSED, closedAt: now },
        });
        this.logger.log(`Closed ${stale.length} stale concierge threads`);
        return stale.length;
    }
    async touchConversationAfterMessage(conversationId, senderRole, kind, status) {
        const now = new Date();
        const data = { updatedAt: now };
        if (kind === client_1.ConversationKind.CONCIERGE && status === client_1.ConversationStatus.OPEN) {
            if (senderRole === client_1.UserRole.GUEST) {
                data.lastGuestMessageAt = now;
                data.slaDueAt = new Date(now.getTime() + CONCIERGE_SLA_HOURS * 3_600_000);
                data.slaBreachedAt = null;
            }
            else if (senderRole === client_1.UserRole.HOST || senderRole === client_1.UserRole.ADMIN) {
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
    async notifyCounterpartyOfMessage(conversationId, senderId, senderRole, body) {
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
        if (!conv)
            return;
        const recipientId = senderId === conv.userOneId ? conv.userTwoId : conv.userOneId;
        const senderName = senderId === conv.userOneId ? conv.userOne.fullName : conv.userTwo.fullName;
        const recipient = await this.prisma.user.findUnique({
            where: { id: recipientId },
            select: { email: true, fullName: true },
        });
        if (!recipient?.email)
            return;
        const preview = body.length > 180 ? body.slice(0, 180) + '…' : body;
        const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
        const link = senderRole === client_1.UserRole.GUEST
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
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    resolveConversationType(senderRole, recipientRole) {
        const roles = new Set([senderRole, recipientRole]);
        if (roles.has('GUEST') && roles.has('HOST'))
            return 'GUEST_HOST';
        if (roles.has('HOST') && roles.has('ADMIN'))
            return 'HOST_ADMIN';
        if (roles.has('GUEST') && roles.has('ADMIN'))
            return 'GUEST_HOST';
        throw new common_1.BadRequestException(`Cannot create conversation between ${senderRole} and ${recipientRole}`);
    }
    orderParticipants(userAId, userARole, userBId, userBRole) {
        const priority = { GUEST: 0, HOST: 1, ADMIN: 2 };
        return priority[userARole] <= priority[userBRole]
            ? [userAId, userBId]
            : [userBId, userAId];
    }
    conversationInclude() {
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
                orderBy: { createdAt: 'asc' },
                include: {
                    sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
                },
            },
        };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = MessagingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        outbox_service_1.OutboxService,
        admin_notification_service_1.AdminNotificationService,
        audit_service_1.AuditService,
        host_settings_service_1.HostSettingsService])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map