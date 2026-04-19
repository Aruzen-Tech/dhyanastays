import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { HoldExpiryProcessor } from './hold-expiry.processor';
import { BalanceDueProcessor } from './balance-due.processor';
import { PayoutEligibilityProcessor } from './payout-eligibility.processor';
import { WeeklyPayoutProcessor } from './weekly-payout.processor';
import { PayLaterDunningProcessor } from './pay-later-dunning.processor';
import { NotificationOutboxProcessor } from './notification-outbox.processor';
import { JobsScheduler } from './jobs.scheduler';
import { HoldModule } from '../hold/hold.module';
import { BookingModule } from '../booking/booking.module';
import { PayoutModule } from '../payout/payout.module';
import { PayLaterModule } from '../pay-later/pay-later.module';
import { NotificationModule } from '../notification/notification.module';
import {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
  QUEUE_PAY_LATER_DUNNING,
  QUEUE_NOTIFICATION_OUTBOX,
} from './jobs.constants';

export {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
  QUEUE_PAY_LATER_DUNNING,
  QUEUE_NOTIFICATION_OUTBOX,
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUE_HOLD_EXPIRY },
      { name: QUEUE_BALANCE_DUE },
      { name: QUEUE_PAYOUT_ELIGIBILITY },
      { name: QUEUE_WEEKLY_PAYOUT },
      { name: QUEUE_PAY_LATER_DUNNING },
      { name: QUEUE_NOTIFICATION_OUTBOX },
    ),
    HoldModule,
    BookingModule,
    PayoutModule,
    PayLaterModule,
    NotificationModule,
  ],
  providers: [
    HoldExpiryProcessor,
    BalanceDueProcessor,
    PayoutEligibilityProcessor,
    WeeklyPayoutProcessor,
    PayLaterDunningProcessor,
    NotificationOutboxProcessor,
    JobsScheduler,
  ],
})
export class JobsModule {}
