import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminNotificationService } from './admin-notification.service';
import { RateLimitService } from './rate-limit.service';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [forwardRef(() => BookingModule)],
  controllers: [AdminController],
  providers: [AdminService, AdminNotificationService, RateLimitService],
  exports: [AdminNotificationService, RateLimitService],
})
export class AdminModule {}
