import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmSegmentsService } from './crm-segments.service';
import { SaveSegmentDto, UpdateSegmentDto } from './dto/segment.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmSegmentsController {
  constructor(private readonly segments: CrmSegmentsService) {}

  @Get('segments')
  list() {
    return this.segments.list();
  }

  @Post('segments')
  create(@Body() dto: SaveSegmentDto, @CurrentUser() user: RequestUser) {
    return this.segments.create(dto, user.sub);
  }

  @Patch('segments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSegmentDto) {
    return this.segments.update(id, dto);
  }

  @Delete('segments/:id')
  remove(@Param('id') id: string) {
    return this.segments.remove(id);
  }
}
