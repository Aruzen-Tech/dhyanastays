import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessagingService } from '../messaging/messaging.service';
import { QUEUE_CONCIERGE_SLA } from './jobs.constants';

/**
 * Hourly sweep for concierge-chat SLA breaches and stale-thread closure.
 * Isolated from the per-message hot path so a slow DB read can't delay
 * message delivery. Runs:
 *   1. sweepSlaBreaches     — flag threads where host silence > 4h and
 *                              notify ops exactly once
 *   2. closeStaleConciergeThreads — close threads 7 days past check-out
 */
@Processor(QUEUE_CONCIERGE_SLA)
export class ConciergeSlaProcessor extends WorkerHost {
  private readonly logger = new Logger(ConciergeSlaProcessor.name);

  constructor(private readonly messaging: MessagingService) {
    super();
  }

  async process(_job: Job): Promise<{ breached: number; closed: number }> {
    const breached = await this.messaging.sweepSlaBreaches();
    const closed = await this.messaging.closeStaleConciergeThreads();
    if (breached || closed) {
      this.logger.log(
        `Concierge SLA sweep: ${breached} breached, ${closed} closed`,
      );
    }
    return { breached, closed };
  }
}
