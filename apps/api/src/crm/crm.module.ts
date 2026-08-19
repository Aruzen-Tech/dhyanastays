import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmTagsController } from './crm-tags.controller';
import { CrmNotesController } from './crm-notes.controller';
import { CrmTasksController } from './crm-tasks.controller';
import { CrmPipelineController } from './crm-pipeline.controller';
import { CrmService } from './crm.service';
import { CrmTagsService } from './crm-tags.service';
import { CrmNotesService } from './crm-notes.service';
import { CrmTasksService } from './crm-tasks.service';
import { CrmPipelineService } from './crm-pipeline.service';

/**
 * Admin CRM. Read/aggregation over `User` + CRM overlay tables (Phase 1) plus
 * workflow: tasks + lifecycle pipeline (Phase 2). PrismaService (global
 * PrismaModule) and FeatureFlagService (global FeatureModule) are injected
 * implicitly. All routes are gated by `@AdminLevelGuard(L2)` +
 * `@FeatureGate('crm')` at the controller level.
 */
@Module({
  controllers: [
    CrmController,
    CrmTagsController,
    CrmNotesController,
    CrmTasksController,
    CrmPipelineController,
  ],
  providers: [CrmService, CrmTagsService, CrmNotesService, CrmTasksService, CrmPipelineService],
  exports: [CrmService],
})
export class CrmModule {}
