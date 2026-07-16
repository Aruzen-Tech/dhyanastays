import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SosBroadcastService } from '../sos/sos-broadcast.service';
import { QUEUE_SOS_BROADCAST } from './jobs.constants';

interface BroadcastJob {
  incidentId: string;
}

/**
 * High-priority SOS fan-out. One job per incident — enqueued inline from
 * SosService.createIncident with `priority: 1` so it jumps any lower-tier
 * jobs already in flight.
 */
@Processor(QUEUE_SOS_BROADCAST)
export class SosBroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(SosBroadcastProcessor.name);

  constructor(private readonly broadcast: SosBroadcastService) {
    super();
  }

  async process(job: Job<BroadcastJob>): Promise<void> {
    const { incidentId } = job.data;
    await this.broadcast.broadcast(incidentId);
  }
}
