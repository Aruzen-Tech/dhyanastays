import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { IsString, MaxLength } from 'class-validator';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { FeatureGate } from '../../common/decorators/feature-gate.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CheckinService } from './checkin.service';

class ScanDto {
  @IsString()
  @MaxLength(2048)
  token!: string;
}

/**
 * Host/admin check-in endpoints (spec §5.2/§5.3). Tightly rate-limited —
 * a scanner should never need more than a handful of attempts per minute.
 * Ownership is enforced in CheckinService (hosts scan only their own listings).
 */
@FeatureGate('stay_pass')
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('scan')
  scan(@CurrentUser() user: RequestUser, @Body() dto: ScanDto) {
    return this.checkin.scan({ sub: user.sub, role: user.role as UserRole }, dto.token);
  }

  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirm')
  confirm(@CurrentUser() user: RequestUser, @Body() dto: ScanDto) {
    return this.checkin.confirm({ sub: user.sub, role: user.role as UserRole }, dto.token);
  }
}
