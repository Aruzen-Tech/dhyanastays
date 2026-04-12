import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GuestAssistanceService } from './guest-assistance.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Roles(UserRole.GUEST)
@Controller('bookings')
export class GuestAssistanceController {
  constructor(private readonly assistanceService: GuestAssistanceService) {}

  @Get(':id/directions')
  getDirections(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistanceService.getDirectionsForBooking(user.sub, id);
  }

  @Get(':id/manual')
  getManual(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistanceService.getManualForBooking(user.sub, id);
  }

  @Post(':id/issues')
  createIssue(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.assistanceService.createIssue(user.sub, id, dto);
  }

  @Get(':id/issues')
  getIssues(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistanceService.getIssuesForBooking(user.sub, id);
  }

  @Post(':id/check-in')
  checkIn(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ) {
    return this.assistanceService.checkIn(user.sub, id, dto);
  }

  @Post(':id/check-out')
  checkOut(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.assistanceService.checkOut(user.sub, id, dto);
  }

  @Get(':id/check-in-status')
  getCheckInOutStatus(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistanceService.getCheckInOutStatus(user.sub, id);
  }
}
