import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SosBroadcastService } from '../sos/sos-broadcast.service';
interface BroadcastJob {
    incidentId: string;
}
export declare class SosBroadcastProcessor extends WorkerHost {
    private readonly broadcast;
    private readonly logger;
    constructor(broadcast: SosBroadcastService);
    process(job: Job<BroadcastJob>): Promise<void>;
}
export {};
