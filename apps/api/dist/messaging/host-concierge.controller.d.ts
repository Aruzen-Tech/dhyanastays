import { RequestUser } from '../common/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class HostConciergeController {
    private readonly messaging;
    constructor(messaging: MessagingService);
    getThread(user: RequestUser, bookingId: string): Promise<{
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
        messages: ({
            sender: {
                id: string;
                fullName: string;
                role: import("@prisma/client").$Enums.UserRole;
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
        userOne: {
            id: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
        };
        userTwo: {
            id: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        createdAt: Date;
        updatedAt: Date;
        type: string;
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
    send(user: RequestUser, bookingId: string, dto: SendMessageDto): Promise<{
        sender: {
            id: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
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
    markRead(user: RequestUser, bookingId: string): Promise<{
        success: boolean;
    }>;
}
