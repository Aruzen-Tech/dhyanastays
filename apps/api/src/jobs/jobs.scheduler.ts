import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  QUEUE_BALANCE_DUE,
  QUEUE_CONCIERGE_SLA,
  QUEUE_HOLD_EXPIRY,
  QUEUE_INVESTOR_DISTRIBUTION,
  QUEUE_NOTIFICATION_OUTBOX,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_PAY_LATER_DUNNING,
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
    @InjectQueue(QUEUE_PAY_LATER_DUNNING)
    private readonly payLaterDunningQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION_OUTBOX)
    private readonly notificationOutboxQueue: Queue,
    @InjectQueue(QUEUE_CONCIERGE_SLA)
    private readonly conciergeSlaQueue: Queue,
    @InjectQueue(QUEUE_INVESTOR_DISTRIBUTION)
    private readonly investorDistributionQueue: Queue,
  ) {}

  /**
   * Expire stale holds every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleHoldExpiry() {
    this.logger.debug('Enqueuing hold-expiry job');
    await this.holdExpiryQueue.add('expire', {}, { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  }

  /**
   * Check balance-due transitions every 15 minutes.
   */
  @Cron('0 */15 * * * *')
  async scheduleBalanceDue() {
    this.logger.debug('Enqueuing balance-due job');
    await this.balanceDueQueue.add('check', {}, { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
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
      { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
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
      { removeOnComplete: 10, removeOnFail: 20, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  /**
   * Pay Later overdue sweep: hourly. Flips SCHEDULED→OVERDUE when an
   * instalment is past due, and OVERDUE→DEFAULTED once the grace window
   * elapses (plus auto-cancels the booking).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async schedulePayLaterOverdueSweep() {
    this.logger.debug('Enqueuing pay-later overdue sweep');
    await this.payLaterDunningQueue.add(
      'overdue',
      { mode: 'overdue' },
      { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  /**
   * Pay Later reminders: every 6 hours. Fires the 72h and 24h reminder
   * windows; the service dedupes via remindersSent counter.
   */
  @Cron('0 0 */6 * * *')
  async schedulePayLaterReminders() {
    this.logger.debug('Enqueuing pay-later reminders');
    await this.payLaterDunningQueue.add(
      'reminders',
      { mode: 'reminders' },
      { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  /**
   * Notification outbox sweep: every 30 seconds. The worker claims up to
   * 50 PENDING rows whose nextAttemptAt is due and dispatches them through
   * the channel adapters. Failed rows are re-scheduled with exponential
   * backoff until MAX_ATTEMPTS is reached.
   */
  @Cron('*/30 * * * * *')
  async scheduleNotificationOutbox() {
    await this.notificationOutboxQueue.add(
      'dispatch',
      {},
      { removeOnComplete: 100, removeOnFail: 50, attempts: 1 },
    );
  }

  /**
   * Concierge SLA sweep: every hour. Flags OPEN concierge threads whose
   * host-reply deadline has lapsed (creates an admin alert exactly once
   * per thread), and closes threads whose booking checked out 7+ days ago.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleConciergeSlaSweep() {
    await this.conciergeSlaQueue.add(
      'sweep',
      {},
      { removeOnComplete: 100, removeOnFail: 50, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  /**
   * Monthly investor distribution close — runs 1st of each month at 02:00 UTC.
   * Computes Distribution rows for every investor for the previous calendar
   * month. Idempotent via the (investorUserId, period) unique index.
   */
  @Cron('0 0 2 1 * *')
  async scheduleInvestorMonthlyClose() {
    this.logger.log('Enqueuing investor monthly distribution close');
    await this.investorDistributionQueue.add(
      'monthly-close',
      {},
      { removeOnComplete: 24, removeOnFail: 24, attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }
}
