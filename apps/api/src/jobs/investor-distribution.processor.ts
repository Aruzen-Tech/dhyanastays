import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvestorService } from '../investor/investor.service';
import { QUEUE_INVESTOR_DISTRIBUTION } from './jobs.constants';

/**
 * Monthly close job — computes Distribution rows for every investor
 * for the previous calendar month. Idempotent thanks to the
 * (investorUserId, period) unique index.
 */
@Processor(QUEUE_INVESTOR_DISTRIBUTION)
export class InvestorDistributionProcessor extends WorkerHost {
  private readonly logger = new Logger(InvestorDistributionProcessor.name);

  constructor(private readonly investor: InvestorService) {
    super();
  }

  async process(_job: Job) {
    const result = await this.investor.runMonthlyClose();
    this.logger.log(
      `Investor distribution close period=${result.period} investors=${result.computed}`,
    );
    return result;
  }
}
