import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InvestorService } from '../investor/investor.service';
export declare class InvestorDistributionProcessor extends WorkerHost {
    private readonly investor;
    private readonly logger;
    constructor(investor: InvestorService);
    process(_job: Job): Promise<{
        period: string;
        computed: number;
    }>;
}
