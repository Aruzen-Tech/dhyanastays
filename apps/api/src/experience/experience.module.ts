import { Module } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { HostExperienceController } from './host-experience.controller';
import { PublicExperienceController } from './public-experience.controller';
import { GuestExperienceController } from './guest-experience.controller';
import { AdminExperienceController } from './admin-experience.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ExperienceService],
  controllers: [
    HostExperienceController,
    PublicExperienceController,
    GuestExperienceController,
    AdminExperienceController,
  ],
  exports: [ExperienceService],
})
export class ExperienceModule {}
