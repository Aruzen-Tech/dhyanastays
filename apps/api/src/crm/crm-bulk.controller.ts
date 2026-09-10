import { Body, Controller, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmBulkService } from './crm-bulk.service';
import { BulkOwnerDto, BulkStageDto, BulkTagDto } from './dto/bulk.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm/bulk')
export class CrmBulkController {
  constructor(private readonly bulk: CrmBulkService) {}

  @Post('tag')
  tag(@Body() dto: BulkTagDto, @CurrentUser() user: RequestUser) {
    return this.bulk.addTag(dto.userIds, dto.tagId, user.sub);
  }

  @Post('owner')
  owner(@Body() dto: BulkOwnerDto, @CurrentUser() user: RequestUser) {
    return this.bulk.assignOwner(dto.userIds, dto.ownerId?.trim() || null, user.sub);
  }

  @Post('stage')
  stage(@Body() dto: BulkStageDto, @CurrentUser() user: RequestUser) {
    return this.bulk.moveStage(dto.userIds, dto.stageId?.trim() || null, user.sub);
  }
}
