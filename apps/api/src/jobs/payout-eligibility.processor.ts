import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PayoutService } from '../payout/payout.service';
import { QUEUE_PAYOUT_ELIGIBILITY } from './jobs.constants';

@Processor(QUEUE_PAYOUT_ELIGIBILITY)
export class PayoutEligibilityProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutEligibilityProcessor.name);

  constructor(private readonly payoutService: PayoutService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing payout-eligibility job ${job.id}`);
    const marked = await this.payoutService.markEligible();
    if (marked > 0) {
      this.logger.log(`Payout eligibility: marked ${marked} lines as ELIGIBLE`);
    }
  }
}
