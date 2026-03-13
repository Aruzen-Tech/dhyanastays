import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';

@Controller('holds')
@Roles(UserRole.GUEST)
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHoldDto) {
    return this.holdService.createHold(user.sub, dto);
  }
}
