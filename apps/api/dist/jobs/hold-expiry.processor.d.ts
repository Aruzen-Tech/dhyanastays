import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { HoldService } from '../hold/hold.service';
export declare class HoldExpiryProcessor extends WorkerHost {
    private readonly holdService;
    private readonly logger;
    constructor(holdService: HoldService);
    process(job: Job): Promise<void>;
}
