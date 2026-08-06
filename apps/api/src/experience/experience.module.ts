import { Module } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { HostExperienceController } from './host-experience.controller';
import { PublicExperienceController } from './public-experience.controller';
import { GuestExperienceController } from './guest-experience.controller';
import { AdminExperienceController } from './admin-experience.controller';
import { NotificationModule } from '../notification/notification.module';
import { RazorpayService } from '../payment/razorpay.service';

@Module({
  imports: [NotificationModule],
  // RazorpayService is a standalone, stateless Razorpay REST wrapper (only
  // depends on the global ConfigService) — registering it here gives this
  // module its own instance, independent of PaymentModule's. This reuses the
  // existing class as-is; payment.module.ts / payment.service.ts are untouched.
  providers: [ExperienceService, RazorpayService],
  controllers: [
    HostExperienceController,
    PublicExperienceController,
    GuestExperienceController,
    AdminExperienceController,
  ],
  exports: [ExperienceService],
})
export class ExperienceModule {}
