import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminLevel, CrmStageKind } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmPipelineService } from './crm-pipeline.service';
import { CreateStageDto, MoveStageDto, UpdateStageDto } from './dto/stage.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmPipelineController {
  constructor(private readonly pipeline: CrmPipelineService) {}

  @Get('pipeline/stages')
  listStages(@Query('kind') kind?: CrmStageKind) {
    return this.pipeline.listStages(kind);
  }

  @Post('pipeline/stages')
  createStage(@Body() dto: CreateStageDto) {
    return this.pipeline.createStage(dto);
  }

  @Patch('pipeline/stages/:id')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.pipeline.updateStage(id, dto);
  }

  @Delete('pipeline/stages/:id')
  deleteStage(@Param('id') id: string) {
    return this.pipeline.deleteStage(id);
  }

  @Get('pipeline/board')
  board(@Query('kind') kind: CrmStageKind = CrmStageKind.GUEST) {
    return this.pipeline.board(kind);
  }

  @Post('contacts/:userId/stage')
  move(
    @Param('userId') userId: string,
    @Body() dto: MoveStageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pipeline.moveContact(userId, dto.stageId || null, user.sub);
  }
}
