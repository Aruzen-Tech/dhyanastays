import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmTagsService } from './crm-tags.service';
import { CreateTagDto } from './dto/tag.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmTagsController {
  constructor(private readonly tags: CrmTagsService) {}

  @Get('tags')
  list() {
    return this.tags.list();
  }

  @Post('tags')
  create(@Body() dto: CreateTagDto) {
    return this.tags.create(dto);
  }

  @Post('contacts/:userId/tags/:tagId')
  assign(
    @Param('userId') userId: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tags.assign(userId, tagId, user.sub);
  }

  @Delete('contacts/:userId/tags/:tagId')
  remove(
    @Param('userId') userId: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tags.remove(userId, tagId, user.sub);
  }
}
