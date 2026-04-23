import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { HoldExpiryProcessor } from './hold-expiry.processor';
import { BalanceDueProcessor } from './balance-due.processor';
import { PayoutEligibilityProcessor } from './payout-eligibility.processor';
import { WeeklyPayoutProcessor } from './weekly-payout.processor';
import { PayLaterDunningProcessor } from './pay-later-dunning.processor';
import { NotificationOutboxProcessor } from './notification-outbox.processor';
import { SosBroadcastProcessor } from './sos-broadcast.processor';
import { ConciergeSlaProcessor } from './concierge-sla.processor';
import { InvestorDistributionProcessor } from './investor-distribution.processor';
import { JobsScheduler } from './jobs.scheduler';
import { HoldModule } from '../hold/hold.module';
import { BookingModule } from '../booking/booking.module';
import { PayoutModule } from '../payout/payout.module';
import { PayLaterModule } from '../pay-later/pay-later.module';
import { NotificationModule } from '../notification/notification.module';
import { SosModule } from '../sos/sos.module';
import { MessagingModule } from '../messaging/messaging.module';
import { InvestorModule } from '../investor/investor.module';
import {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
  QUEUE_PAY_LATER_DUNNING,
  QUEUE_NOTIFICATION_OUTBOX,
  QUEUE_SOS_BROADCAST,
  QUEUE_CONCIERGE_SLA,
  QUEUE_INVESTOR_DISTRIBUTION,
} from './jobs.constants';

export {
  QUEUE_HOLD_EXPIRY,
  QUEUE_BALANCE_DUE,
  QUEUE_PAYOUT_ELIGIBILITY,
  QUEUE_WEEKLY_PAYOUT,
  QUEUE_PAY_LATER_DUNNING,
  QUEUE_NOTIFICATION_OUTBOX,
  QUEUE_SOS_BROADCAST,
  QUEUE_CONCIERGE_SLA,
  QUEUE_INVESTOR_DISTRIBUTION,
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
      { name: QUEUE_SOS_BROADCAST },
      { name: QUEUE_CONCIERGE_SLA },
      { name: QUEUE_INVESTOR_DISTRIBUTION },
    ),
    HoldModule,
    BookingModule,
    PayoutModule,
    PayLaterModule,
    NotificationModule,
    SosModule,
    MessagingModule,
    InvestorModule,
  ],
  providers: [
    HoldExpiryProcessor,
    BalanceDueProcessor,
    PayoutEligibilityProcessor,
    WeeklyPayoutProcessor,
    PayLaterDunningProcessor,
    NotificationOutboxProcessor,
    SosBroadcastProcessor,
    ConciergeSlaProcessor,
    InvestorDistributionProcessor,
    JobsScheduler,
  ],
})
export class JobsModule {}
