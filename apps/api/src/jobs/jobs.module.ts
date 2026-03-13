import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { HoldExpiryProcessor } from './hold-expiry.processor';
import { BalanceDueProcessor } from './balance-due.processor';
import { PayoutEligibilityProcessor } from './payout-eligibility.processor';
import { WeeklyPayoutProcessor } from './weekly-payout.processor';
import { JobsScheduler } from './jobs.scheduler';
import { HoldModule } from '../hold/hold.module';
import { BookingModule } from '../booking/booking.module';
import { PayoutModule } from '../payout/payout.module';
import {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
} from './jobs.constants';

export {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUE_HOLD_EXPIRY },
      { name: QUEUE_BALANCE_DUE },
      { name: QUEUE_PAYOUT_ELIGIBILITY },
      { name: QUEUE_WEEKLY_PAYOUT },
    ),
    HoldModule,
    BookingModule,
    PayoutModule,
  ],
  providers: [
    HoldExpiryProcessor,
    BalanceDueProcessor,
    PayoutEligibilityProcessor,
    WeeklyPayoutProcessor,
    JobsScheduler,
  ],
})
export class JobsModule {}
