import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ExperienceService } from './experience.service';
import { BookExperienceDto } from './dto/book-experience.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

@Roles(UserRole.GUEST)
@FeatureGate('experiences')
@Controller('guest/experiences')
export class GuestExperienceController {
  constructor(private readonly service: ExperienceService) {}

  @Get('bookings')
  listBookings(@CurrentUser() user: RequestUser) {
    return this.service.listGuestBookings(user.sub);
  }

  @Post(':id/book')
  book(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: BookExperienceDto,
  ) {
    return this.service.bookExperience(user.sub, id, dto);
  }

  @Delete('bookings/:id')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.cancelGuestBooking(user.sub, id);
  }
}
