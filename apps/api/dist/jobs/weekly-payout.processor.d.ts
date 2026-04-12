import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PayoutService } from '../payout/payout.service';
export declare class WeeklyPayoutProcessor extends WorkerHost {
    private readonly payoutService;
    private readonly logger;
    constructor(payoutService: PayoutService);
    process(job: Job): Promise<void>;
}
