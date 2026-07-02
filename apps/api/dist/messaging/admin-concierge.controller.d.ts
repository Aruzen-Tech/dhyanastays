import { RequestUser } from '../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class AdminConciergeController {
    private readonly messaging;
    constructor(messaging: MessagingService);
    list(status?: string, breached?: string): Promise<({
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
    getOne(id: string): Promise<{
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
    join(user: RequestUser, id: string): Promise<{
        joined: boolean;
        alreadyJoined: boolean;
    }>;
    send(user: RequestUser, id: string, dto: SendMessageDto): Promise<{
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
    private parseStatus;
}
