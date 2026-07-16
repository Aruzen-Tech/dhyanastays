import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';

@Controller('holds')
@Roles(UserRole.GUEST)
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHoldDto) {
    return this.holdService.createHold(user.sub, dto);
  }

  /**
   * Hold status for a listing + date range. Used by other guests' UI to show
   * "on hold — MM:SS remaining". Declared before the param route so 'status'
   * isn't captured as an :id.
   */
  @Get('status')
  status(
    @CurrentUser() user: RequestUser,
    @Query('listingId') listingId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.holdService.getHoldStatus(user.sub, listingId, checkIn, checkOut);
  }

  /** Release a hold early when the guest abandons the booking flow. */
  @Delete(':id')
  release(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.holdService.releaseHold(user.sub, id);
  }
}
