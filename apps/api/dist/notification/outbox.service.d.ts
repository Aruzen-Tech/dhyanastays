import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type NotificationKind = 'booking.confirmed' | 'booking.cancelled' | 'balance.due' | 'pay_later.reminder' | 'host.listing.approved' | 'host.listing.rejected' | 'host.new_booking' | 'message.received' | 'issue.updated' | 'sos.ack' | 'sip.debit' | 'investor.document.uploaded' | 'investor.capital_call.opened' | 'investor.distribution.paid';
type TxClient = any;
export interface EnqueueParams {
    userId: string;
    kind: NotificationKind;
    channels: NotificationChannel[];
    payload: Record<string, any>;
}
export interface PreferenceBlob {
    channels?: Record<string, Record<string, boolean>>;
    quietHours?: {
        start: string;
        end: string;
        tz?: string;
    };
}
export declare class OutboxService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    static backoffSeconds(attempts: number): number;
    static maxAttempts(): number;
    enqueue(params: EnqueueParams, tx?: TxClient): Promise<void>;
    claimPending(now?: Date, limit?: number): Promise<{
        id: string;
        kind: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.OutboxStatus;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        payload: Prisma.JsonValue;
        attempts: number;
        lastError: string | null;
        nextAttemptAt: Date;
        sentAt: Date | null;
    }[]>;
    markSent(id: string): Promise<void>;
    recordFailure(id: string, error: string): Promise<void>;
    getPreference(userId: string, tx?: TxClient): Promise<PreferenceBlob>;
    upsertPreference(userId: string, channels: PreferenceBlob['channels'], quietHours?: PreferenceBlob['quietHours']): Promise<{
        updatedAt: Date;
        userId: string;
        channels: Prisma.JsonValue;
        quietHours: Prisma.JsonValue | null;
    }>;
    private isChannelAllowed;
}
export {};
