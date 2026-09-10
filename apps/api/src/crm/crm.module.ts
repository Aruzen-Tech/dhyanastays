import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { CrmController } from './crm.controller';
import { CrmTagsController } from './crm-tags.controller';
import { CrmNotesController } from './crm-notes.controller';
import { CrmTasksController } from './crm-tasks.controller';
import { CrmPipelineController } from './crm-pipeline.controller';
import { CrmSegmentsController } from './crm-segments.controller';
import { CrmBulkController } from './crm-bulk.controller';
import { CrmOutreachController } from './crm-outreach.controller';
import { CrmAnalyticsController } from './crm-analytics.controller';
import { CrmAutomationController } from './crm-automation.controller';
import { CrmService } from './crm.service';
import { CrmTagsService } from './crm-tags.service';
import { CrmNotesService } from './crm-notes.service';
import { CrmTasksService } from './crm-tasks.service';
import { CrmPipelineService } from './crm-pipeline.service';
import { CrmSegmentsService } from './crm-segments.service';
import { CrmBulkService } from './crm-bulk.service';
import { CrmOutreachService } from './crm-outreach.service';
import { CrmAnalyticsService } from './crm-analytics.service';
import { CrmAutomationService } from './crm-automation.service';

/**
 * Admin CRM. Read/aggregation over `User` + CRM overlay tables (Phase 1) plus
 * workflow: tasks + lifecycle pipeline (Phase 2). PrismaService (global
 * PrismaModule) and FeatureFlagService (global FeatureModule) are injected
 * implicitly. All routes are gated by `@AdminLevelGuard(L2)` +
 * `@FeatureGate('crm')` at the controller level.
 */
@Module({
  imports: [NotificationModule],
  controllers: [
    CrmController,
    CrmTagsController,
    CrmNotesController,
    CrmTasksController,
    CrmPipelineController,
    CrmSegmentsController,
    CrmBulkController,
    CrmOutreachController,
    CrmAnalyticsController,
    CrmAutomationController,
  ],
  providers: [
    CrmService,
    CrmTagsService,
    CrmNotesService,
    CrmTasksService,
    CrmPipelineService,
    CrmSegmentsService,
    CrmBulkService,
    CrmOutreachService,
    CrmAnalyticsService,
    CrmAutomationService,
  ],
  exports: [CrmService],
})
export class CrmModule {}
