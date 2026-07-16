import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ReferralService } from './referral.service';
import { ApplyReferralDto } from './dto/apply-referral.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

@FeatureGate('referrals')
@Controller('guest')
@Roles(UserRole.GUEST)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // GET /guest/referral — get code + stats
  @Get('referral')
  getReferralInfo(@CurrentUser() user: RequestUser) {
    return this.referralService.getReferralInfo(user.sub);
  }

  // POST /guest/referral/apply — apply a code (at registration or profile)
  @Post('referral/apply')
  applyReferralCode(
    @CurrentUser() user: RequestUser,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralService.applyReferralCode(user.sub, dto.referralCode);
  }

  // GET /guest/credits — balance + ledger
  @Get('credits')
  getCreditLedger(@CurrentUser() user: RequestUser) {
    return this.referralService.getCreditLedger(user.sub);
  }
}
