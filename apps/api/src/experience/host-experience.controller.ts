import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ExperienceService } from './experience.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

@Roles(UserRole.HOST)
@FeatureGate('experiences')
@Controller('host/experiences')
export class HostExperienceController {
  constructor(private readonly service: ExperienceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.listHostExperiences(user.sub);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExperienceDto) {
    return this.service.createHostExperience(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.service.updateHostExperience(user.sub, id, dto);
  }

  @Delete(':id')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.closeHostExperience(user.sub, id);
  }

  @Get(':id/bookings')
  bookings(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getHostExperienceBookings(user.sub, id);
  }
}
