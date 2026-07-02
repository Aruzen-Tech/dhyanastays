import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  QUEUE_AUTO_COMPLETE,
  QUEUE_BALANCE_DUE,
  QUEUE_CONCIERGE_SLA,
  QUEUE_HOLD_EXPIRY,
  QUEUE_INVESTOR_DISTRIBUTION,
  QUEUE_NOTIFICATION_OUTBOX,
  QUEUE_PAYMENT_RECON,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_PAY_LATER_DUNNING,
  QUEUE_WEEKLY_PAYOUT,
} from './jobs.constants';

/**
 * Build a deterministic job ID that buckets all scheduler ticks within
 * a single interval window. Two scheduler instances firing at the same
 * minute generate the same ID, so BullMQ dedupes — only one job runs.
 *
 * This is the "distributed lock" for cron jobs in a multi-instance API.
 */
function bucketJobId(name: string, intervalMs: number): string {
  return `${name}:${Math.floor(Date.now() / intervalMs)}`;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
    @InjectQueue(QUEUE_PAYMENT_RECON)
    private readonly paymentReconQueue: Queue,
    @InjectQueue(QUEUE_AUTO_COMPLETE)
    private readonly autoCompleteQueue: Queue,
  ) {}

  /**
   * Expire stale holds every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleHoldExpiry() {
    await this.holdExpiryQueue.add('expire', {}, {
      jobId: bucketJobId('hold-expiry', MINUTE),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Check balance-due transitions every 15 minutes.
   */
  @Cron('0 */15 * * * *')
  async scheduleBalanceDue() {
    await this.balanceDueQueue.add('check', {}, {
      jobId: bucketJobId('balance-due', 15 * MINUTE),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Mark payout eligibility every hour (check-in + 24h).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async schedulePayoutEligibility() {
    await this.payoutEligibilityQueue.add('mark', {}, {
      jobId: bucketJobId('payout-eligibility', HOUR),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Weekly payout batch — every Monday at 09:00 IST (03:30 UTC).
   */
  @Cron('30 3 * * 1')
  async scheduleWeeklyPayout() {
    this.logger.log('Enqueuing weekly-payout job');
    await this.weeklyPayoutQueue.add('run', {}, {
      jobId: bucketJobId('weekly-payout', 7 * DAY),
      removeOnComplete: 10, removeOnFail: 20, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Pay Later overdue sweep: hourly. Flips SCHEDULED→OVERDUE when an
   * instalment is past due, and OVERDUE→DEFAULTED once the grace window
   * elapses (plus auto-cancels the booking).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async schedulePayLaterOverdueSweep() {
    await this.payLaterDunningQueue.add('overdue', { mode: 'overdue' }, {
      jobId: bucketJobId('pay-later-overdue', HOUR),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Pay Later reminders: every 6 hours. Fires the 72h and 24h reminder
   * windows; the service dedupes via remindersSent counter.
   */
  @Cron('0 0 */6 * * *')
  async schedulePayLaterReminders() {
    await this.payLaterDunningQueue.add('reminders', { mode: 'reminders' }, {
      jobId: bucketJobId('pay-later-reminders', 6 * HOUR),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Notification outbox sweep: every 30 seconds. The worker claims up to
   * 50 PENDING rows whose nextAttemptAt is due and dispatches them through
   * the channel adapters. Failed rows are re-scheduled with exponential
   * backoff until MAX_ATTEMPTS is reached.
   */
  @Cron('*/30 * * * * *')
  async scheduleNotificationOutbox() {
    await this.notificationOutboxQueue.add('dispatch', {}, {
      jobId: bucketJobId('notification-outbox', 30 * 1000),
      removeOnComplete: 100, removeOnFail: 50, attempts: 1,
    });
  }

  /**
   * Concierge SLA sweep: every hour. Flags OPEN concierge threads whose
   * host-reply deadline has lapsed (creates an admin alert exactly once
   * per thread), and closes threads whose booking checked out 7+ days ago.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleConciergeSlaSweep() {
    await this.conciergeSlaQueue.add('sweep', {}, {
      jobId: bucketJobId('concierge-sla', HOUR),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Monthly investor distribution close — runs 1st of each month at 02:00 UTC.
   * Computes Distribution rows for every investor for the previous calendar
   * month. Idempotent via the (investorUserId, period) unique index.
   */
  @Cron('0 0 2 1 * *')
  async scheduleInvestorMonthlyClose() {
    this.logger.log('Enqueuing investor monthly distribution close');
    await this.investorDistributionQueue.add('monthly-close', {}, {
      jobId: bucketJobId('investor-distribution', 30 * DAY),
      removeOnComplete: 24, removeOnFail: 24, attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    });
  }

  /**
   * Payment reconciliation — every 15 minutes. Recovers from missed Razorpay
   * webhooks by querying the gateway for INITIATED payments older than 30 min
   * and replaying capture/failure events. Idempotent.
   */
  @Cron('0 */15 * * * *')
  async schedulePaymentRecon() {
    await this.paymentReconQueue.add('reconcile', {}, {
      jobId: bucketJobId('payment-recon', 15 * MINUTE),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  /**
   * Auto-complete after checkout — every hour. Flips bookings whose stay
   * ended 24h+ ago from CONFIRMED_PAID/DEPOSIT to COMPLETED, awarding loyalty
   * points and triggering referral credit.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleAutoComplete() {
    await this.autoCompleteQueue.add('complete', {}, {
      jobId: bucketJobId('auto-complete', HOUR),
      removeOnComplete: 100, removeOnFail: 50, attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
