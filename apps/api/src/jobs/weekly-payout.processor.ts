import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PayoutService } from '../payout/payout.service';
import { QUEUE_WEEKLY_PAYOUT } from './jobs.constants';

@Processor(QUEUE_WEEKLY_PAYOUT)
export class WeeklyPayoutProcessor extends WorkerHost {
  private readonly logger = new Logger(WeeklyPayoutProcessor.name);

  constructor(private readonly payoutService: PayoutService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing weekly payout batch job ${job.id}`);
    try {
      const result = await this.payoutService.runWeeklyBatch('system');
      this.logger.log(
        `Weekly payout batch complete: batchId=${result.batchId} ` +
          `total=INR ${result.totalAmount} lines=${result.lineCount} hosts=${result.hostCount}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Weekly payout batch skipped: ${message}`);
    }
  }
}
