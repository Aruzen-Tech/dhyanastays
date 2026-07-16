import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MessagingService } from '../messaging/messaging.service';
export declare class ConciergeSlaProcessor extends WorkerHost {
    private readonly messaging;
    private readonly logger;
    constructor(messaging: MessagingService);
    process(_job: Job): Promise<{
        breached: number;
        closed: number;
    }>;
}
