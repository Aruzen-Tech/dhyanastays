import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminNotificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        title: string;
        isRead: boolean;
    }>;
    getNotifications(unreadOnly: boolean): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        title: string;
        isRead: boolean;
    }[]>;
    markRead(id: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        title: string;
        isRead: boolean;
    }>;
    markAllRead(): Promise<{
        count: number;
    }>;
}
