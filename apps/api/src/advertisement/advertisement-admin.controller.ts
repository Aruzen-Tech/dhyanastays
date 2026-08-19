import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { AdvertisementService } from './advertisement.service';
import { CreateAdvertisementDto, UpdateAdvertisementDto } from './dto/advertisement.dto';

/** Admin Advertisement Centre — full control over every ad (L2+). */
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/advertisements')
export class AdvertisementAdminController {
  constructor(private readonly ads: AdvertisementService) {}

  @Get()
  list() {
    return this.ads.listAll();
  }

  @Post()
  create(@Body() dto: CreateAdvertisementDto, @CurrentUser() user: RequestUser) {
    return this.ads.create(dto, user.sub);
  }

  @Post(':id/media')
  addMedia(
    @Param('id') id: string,
    @Body() dto: { url: string; mediaType: string; sortOrder?: number },
  ) {
    return this.ads.addMedia(id, dto);
  }

  @Delete(':id/media/:mediaId')
  deleteMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.ads.deleteMedia(id, mediaId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvertisementDto) {
    return this.ads.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ads.remove(id);
  }
}
