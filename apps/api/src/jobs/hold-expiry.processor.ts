import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { HoldService } from '../hold/hold.service';
import { QUEUE_HOLD_EXPIRY } from './jobs.constants';

@Processor(QUEUE_HOLD_EXPIRY)
export class HoldExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(HoldExpiryProcessor.name);

  constructor(private readonly holdService: HoldService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing hold expiry job ${job.id}`);
    const expired = await this.holdService.expireStaleHolds();
    this.logger.log(`Hold expiry: expired ${expired} stale holds`);
  }
}
