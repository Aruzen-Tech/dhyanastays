import { ConversationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../notification/outbox.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
import { AuditService } from '../common/services/audit.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { HostSettingsService } from '../host-settings/host-settings.service';
type TxClient = any;
export declare class MessagingService {
    private readonly prisma;
    private readonly outbox;
    private readonly adminNotifications;
    private readonly auditService;
    private readonly hostSettings;
    private readonly logger;
    constructor(prisma: PrismaService, outbox: OutboxService, adminNotifications: AdminNotificationService, auditService: AuditService, hostSettings: HostSettingsService);
    startConversation(userId: string, userRole: UserRole, dto: CreateConversationDto): Promise<{
        messages: ({
            sender: {
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        })[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        userTwo: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    }>;
    getConversations(userId: string): Promise<{
        id: string;
        type: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        status: import("@prisma/client").$Enums.ConversationStatus;
        subject: string | null;
        otherUser: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        lastMessage: {
            createdAt: Date;
            isRead: boolean;
            senderId: string;
            body: string;
            isSystem: boolean;
        };
        unreadCount: number;
        updatedAt: Date;
    }[]>;
    getConversationById(conversationId: string, userId: string): Promise<{
        messages: ({
            sender: {
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        })[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        userTwo: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    }>;
    adminGetConversationById(conversationId: string): Promise<{
        messages: ({
            sender: {
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        })[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        userTwo: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    }>;
    sendMessage(conversationId: string, userId: string, userRole: UserRole, dto: SendMessageDto): Promise<{
        sender: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        isRead: boolean;
        conversationId: string;
        senderId: string;
        senderRole: import("@prisma/client").$Enums.UserRole;
        body: string;
        isSystem: boolean;
    }>;
    markRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    ensureConciergeThread(bookingId: string, tx?: TxClient): Promise<any>;
    getConciergeThreadForGuest(bookingId: string, guestId: string): Promise<{
        messages: ({
            sender: {
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        })[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        userTwo: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    }>;
    getConciergeThreadForHost(bookingId: string, hostUserId: string): Promise<{
        messages: ({
            sender: {
                role: import("@prisma/client").$Enums.UserRole;
                id: string;
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        })[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
        userTwo: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    }>;
    listConciergeThreadsForAdmin(opts: {
        status?: ConversationStatus;
        breachedOnly?: boolean;
    }): Promise<({
        messages: {
            createdAt: Date;
            senderRole: import("@prisma/client").$Enums.UserRole;
            body: string;
            isSystem: boolean;
        }[];
        listing: {
            id: string;
            title: string;
        } | null;
        booking: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
        } | null;
        userOne: {
            id: string;
            email: string;
            fullName: string;
        };
        userTwo: {
            id: string;
            email: string;
            fullName: string;
        };
    } & {
        type: string;
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ConversationStatus;
        listingId: string | null;
        bookingId: string | null;
        userOneId: string;
        userTwoId: string;
        subject: string | null;
        lastGuestMessageAt: Date | null;
        lastHostMessageAt: Date | null;
        slaDueAt: Date | null;
        slaBreachedAt: Date | null;
        closedAt: Date | null;
    })[]>;
    adminJoinThread(conversationId: string, adminUserId: string): Promise<{
        joined: boolean;
        alreadyJoined: boolean;
    }>;
    sweepSlaBreaches(now?: Date): Promise<number>;
    closeStaleConciergeThreads(now?: Date): Promise<number>;
    private touchConversationAfterMessage;
    private notifyCounterpartyOfMessage;
    private escapeHtml;
    private resolveConversationType;
    private orderParticipants;
    private conversationInclude;
}
export {};
