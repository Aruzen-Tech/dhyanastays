import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import {
  AdminFeatureFlagController,
  PublicFeatureFlagController,
} from './feature-flag.controller';

/**
 * Global so the FeatureFlagService can be injected by the app-wide FeatureGuard
 * (registered in AuthModule alongside the other APP_GUARDs). PrismaService +
 * AuditService come from the global PrismaModule / CommonModule.
 */
@Global()
@Module({
  controllers: [AdminFeatureFlagController, PublicFeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureModule {}
