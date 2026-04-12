import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuestAssistanceService } from './guest-assistance.service';
import { GuestAssistanceController } from './guest-assistance.controller';
import { HostIssuesController } from './host-issues.controller';
import { AdminIssuesController } from './admin-issues.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GuestAssistanceController, HostIssuesController, AdminIssuesController],
  providers: [GuestAssistanceService],
  exports: [GuestAssistanceService],
})
export class GuestAssistanceModule {}
