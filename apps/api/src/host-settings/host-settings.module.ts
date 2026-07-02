import { Module } from '@nestjs/common';
import { HostSettingsController } from './host-settings.controller';
import { HostSettingsService } from './host-settings.service';

/**
 * Host control-panel settings. FeatureFlagService (global) is injected for the
 * read-only feature-availability view. PrismaService comes from the global
 * PrismaModule. Exported so messaging/concierge can enforce host toggles.
 */
@Module({
  controllers: [HostSettingsController],
  providers: [HostSettingsService],
  exports: [HostSettingsService],
})
export class HostSettingsModule {}
