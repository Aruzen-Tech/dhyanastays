import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
export declare class SosBroadcastService {
    private readonly prisma;
    private readonly notifications;
    private readonly config;
    private readonly adminNotifications;
    private readonly logger;
    private readonly opsPhone;
    private readonly opsEmail;
    private readonly webUrl;
    private smsCbState;
    private smsCbConsecutiveFailures;
    private smsCbOpenedAt;
    constructor(prisma: PrismaService, notifications: NotificationService, config: ConfigService, adminNotifications: AdminNotificationService);
    broadcast(incidentId: string): Promise<void>;
    private trySms;
    private shouldAttemptSms;
    private recordSmsSuccess;
    private recordSmsFailure;
    getSmsBreakerStateForTesting(): {
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        consecutiveFailures: number;
        openedAt: number | null;
    };
    private tryEmail;
    private renderTrustedContactEmail;
    private renderOpsEmail;
}
