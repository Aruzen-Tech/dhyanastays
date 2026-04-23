import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ExperienceStatus, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ExperienceService } from './experience.service';
import { ModerateExperienceDto } from './dto/moderate-experience.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/experiences')
export class AdminExperienceController {
  constructor(private readonly service: ExperienceService) {}

  @Get()
  list(@Query('status') status?: ExperienceStatus) {
    return this.service.adminListExperiences(status);
  }

  @Patch(':id/moderate')
  moderate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ModerateExperienceDto,
  ) {
    return this.service.moderateExperience(user.sub, id, dto);
  }
}
