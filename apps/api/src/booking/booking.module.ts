import { forwardRef, Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingStateMachine } from './state-machine';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationModule } from '../notification/notification.module';
import { ListingModule } from '../listing/listing.module';
import { ReferralModule } from '../referral/referral.module';
import { AddOnModule } from '../add-on/add-on.module';
import { MembershipModule } from '../membership/membership.module';
import { PayLaterModule } from '../pay-later/pay-later.module';

@Module({
  imports: [
    PricingModule,
    NotificationModule,
    ListingModule,
    ReferralModule,
    AddOnModule,
    MembershipModule,
    forwardRef(() => PayLaterModule),
  ],
  providers: [BookingService, BookingStateMachine],
  controllers: [BookingController],
  exports: [BookingService, BookingStateMachine],
})
export class BookingModule {}
