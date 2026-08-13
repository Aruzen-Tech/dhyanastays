import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmService } from './crm.service';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactProfileDto } from './dto/update-contact-profile.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('contacts')
  listContacts(@Query() query: ListContactsDto) {
    return this.crm.listContacts(query);
  }

  @Get('contacts/:userId')
  getContact(@Param('userId') userId: string) {
    return this.crm.getContact360(userId);
  }

  @Get('contacts/:userId/timeline')
  getTimeline(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.crm.getTimeline(userId, limit ? Number(limit) : undefined);
  }

  @Patch('contacts/:userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateContactProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.crm.updateProfile(userId, dto, user.sub);
  }
}
