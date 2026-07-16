import { NotificationOutbox } from '@prisma/client';
import { NotificationService } from './notification.service';
import { OutboxService } from './outbox.service';
export declare class OutboxDispatcher {
    private readonly notifications;
    private readonly outbox;
    private readonly logger;
    constructor(notifications: NotificationService, outbox: OutboxService);
    dispatch(row: NotificationOutbox): Promise<void>;
    private dispatchEmail;
    private dispatchSms;
    private dispatchWhatsApp;
    private dispatchPush;
}
