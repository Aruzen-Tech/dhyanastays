import { Controller, Get } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmAnalyticsService } from './crm-analytics.service';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmAnalyticsController {
  constructor(private readonly analytics: CrmAnalyticsService) {}

  @Get('analytics')
  overview() {
    return this.analytics.overview();
  }
}
