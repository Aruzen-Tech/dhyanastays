import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { SpotlightService } from './spotlight.service';
import { AddSpotlightDto, ReorderSpotlightDto, UpdateSpotlightDto } from './dto/spotlight.dto';

/** Admin management of the homepage Stay Spotlight (L2+). */
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/spotlight')
export class SpotlightAdminController {
  constructor(private readonly spotlight: SpotlightService) {}

  @Get()
  list() {
    return this.spotlight.listAll();
  }

  @Post()
  add(@Body() dto: AddSpotlightDto, @CurrentUser() user: RequestUser) {
    return this.spotlight.add(dto, user.sub);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderSpotlightDto) {
    return this.spotlight.reorder(dto.ids);
  }

  @Post(':id/media')
  addMedia(
    @Param('id') id: string,
    @Body() dto: { url: string; mediaType: string; sortOrder?: number },
  ) {
    return this.spotlight.addMedia(id, dto);
  }

  @Delete(':id/media/:mediaId')
  deleteMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.spotlight.deleteMedia(id, mediaId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSpotlightDto) {
    return this.spotlight.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spotlight.remove(id);
  }
}
