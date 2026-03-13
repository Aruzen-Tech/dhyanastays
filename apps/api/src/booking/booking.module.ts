import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PricingModule, NotificationModule],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
