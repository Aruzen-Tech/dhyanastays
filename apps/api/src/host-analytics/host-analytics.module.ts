import { Module } from '@nestjs/common';
import { HostAnalyticsController } from './host-analytics.controller';
import { HostAnalyticsService } from './host-analytics.service';

@Module({
  providers: [HostAnalyticsService],
  controllers: [HostAnalyticsController],
  exports: [HostAnalyticsService],
})
export class HostAnalyticsModule {}
