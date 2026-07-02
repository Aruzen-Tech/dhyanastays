import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { MembershipService } from './membership.service';
import { SipService } from './sip.service';
import { StartSipDto } from './dto/start-sip.dto';
import { ContributeSipDto } from './dto/contribute-sip.dto';
import { SipStatusDto } from './dto/sip-status.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

@FeatureGate('membership')
@Controller('me')
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly sipService: SipService,
  ) {}

  // ── Membership tier ───────────────────────────────────────────────────────
  @Get('membership')
  getMembership(@CurrentUser() user: RequestUser) {
    return this.membershipService.getMembership(user.sub);
  }

  @Get('perks')
  getPerks(@CurrentUser() user: RequestUser) {
    return this.membershipService.getPerksForUser(user.sub);
  }

  // ── SIP CRUD ──────────────────────────────────────────────────────────────
  @Get('sip')
  listSips(@CurrentUser() user: RequestUser) {
    return this.sipService.listSips(user.sub);
  }

  @Post('sip')
  startSip(@CurrentUser() user: RequestUser, @Body() dto: StartSipDto) {
    return this.sipService.startSip(user.sub, dto);
  }

  @Get('sip/:id')
  getSip(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sipService.getSip(user.sub, id);
  }

  @Get('sip/:id/balance')
  async getSipBalance(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const balance = await this.sipService.getSipBalance(user.sub, id);
    return { balance };
  }

  @Patch('sip/:id/status')
  setStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SipStatusDto,
  ) {
    return this.sipService.setStatus(user.sub, id, dto.status);
  }

  @Post('sip/:id/contributions')
  contribute(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ContributeSipDto,
  ) {
    return this.sipService.recordContribution(user.sub, id, dto);
  }
}
