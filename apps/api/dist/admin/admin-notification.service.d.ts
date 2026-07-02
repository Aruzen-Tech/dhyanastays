import { PrismaService } from '../prisma/prisma.service';
export declare class AdminNotificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }>;
    getNotifications(unreadOnly: boolean): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }[]>;
    markRead(id: string): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }>;
    markAllRead(): Promise<{
        count: number;
    }>;
}
