import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OutboxService } from '../notification/outbox.service';
import { OutboxDispatcher } from '../notification/outbox-dispatcher.service';
export declare class NotificationOutboxProcessor extends WorkerHost {
    private readonly outbox;
    private readonly dispatcher;
    private readonly logger;
    constructor(outbox: OutboxService, dispatcher: OutboxDispatcher);
    process(_job: Job): Promise<void>;
}
