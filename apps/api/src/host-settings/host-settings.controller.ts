import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsOptional } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { HostSettingsService } from './host-settings.service';

class UpdateHostSettingsDto {
  @IsOptional() @IsBoolean() instantBook?: boolean;
  @IsOptional() @IsBoolean() allowGuestMessages?: boolean;
  @IsOptional() @IsBoolean() allowConciergeChat?: boolean;
  @IsOptional() @IsBoolean() emailOnNewBooking?: boolean;
  @IsOptional() @IsBoolean() smsOnNewBooking?: boolean;
}

@Roles(UserRole.HOST)
@Controller('host/settings')
export class HostSettingsController {
  constructor(private readonly hostSettings: HostSettingsService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.hostSettings.getForHost(user.sub);
  }

  @Patch()
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateHostSettingsDto) {
    return this.hostSettings.update(user.sub, dto);
  }
}
