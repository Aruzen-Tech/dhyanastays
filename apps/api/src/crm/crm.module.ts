import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmTagsController } from './crm-tags.controller';
import { CrmNotesController } from './crm-notes.controller';
import { CrmService } from './crm.service';
import { CrmTagsService } from './crm-tags.service';
import { CrmNotesService } from './crm-notes.service';

/**
 * Admin CRM (Phase 1). Read/aggregation over `User` + CRM overlay tables.
 * PrismaService (global PrismaModule) and FeatureFlagService (global
 * FeatureModule) are injected implicitly. All routes are gated by
 * `@AdminLevelGuard(L2)` + `@FeatureGate('crm')` at the controller level.
 */
@Module({
  controllers: [CrmController, CrmTagsController, CrmNotesController],
  providers: [CrmService, CrmTagsService, CrmNotesService],
  exports: [CrmService],
})
export class CrmModule {}
