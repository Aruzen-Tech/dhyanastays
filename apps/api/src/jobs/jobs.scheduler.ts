import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  QUEUE_BALANCE_DUE,
  QUEUE_HOLD_EXPIRY,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
} from './jobs.constants';

@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    @InjectQueue(QUEUE_HOLD_EXPIRY) private readonly holdExpiryQueue: Queue,
    @InjectQueue(QUEUE_BALANCE_DUE) private readonly balanceDueQueue: Queue,
    @InjectQueue(QUEUE_PAYOUT_ELIGIBILITY)
    private readonly payoutEligibilityQueue: Queue,
    @InjectQueue(QUEUE_WEEKLY_PAYOUT) private readonly weeklyPayoutQueue: Queue,
  ) {}

  /**
   * Expire stale holds every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleHoldExpiry() {
    this.logger.debug('Enqueuing hold-expiry job');
    await this.holdExpiryQueue.add('expire', {}, { removeOnComplete: 100, removeOnFail: 50 });
  }

  /**
   * Check balance-due transitions every 15 minutes.
   */
  @Cron('0 */15 * * * *')
  async scheduleBalanceDue() {
    this.logger.debug('Enqueuing balance-due job');
    await this.balanceDueQueue.add('check', {}, { removeOnComplete: 100, removeOnFail: 50 });
  }

  /**
   * Mark payout eligibility every hour (check-in + 24h).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async schedulePayoutEligibility() {
    this.logger.debug('Enqueuing payout-eligibility job');
    await this.payoutEligibilityQueue.add(
      'mark',
      {},
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  }

  /**
   * Weekly payout batch — every Monday at 09:00 IST (03:30 UTC).
   */
  @Cron('30 3 * * 1')
  async scheduleWeeklyPayout() {
    this.logger.log('Enqueuing weekly-payout job');
    await this.weeklyPayoutQueue.add(
      'run',
      {},
      { removeOnComplete: 10, removeOnFail: 20 },
    );
  }
}
