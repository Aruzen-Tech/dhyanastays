import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationModule } from '../notification/notification.module';
import { ListingModule } from '../listing/listing.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [PricingModule, NotificationModule, ListingModule, ReferralModule],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
