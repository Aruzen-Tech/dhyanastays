import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminLevel, UserRole } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PayoutAccountService } from './payout-account.service';
import { RoutePayoutService } from './route-payout.service';
import {
  SetPayoutHoldDto,
  SubmitPayoutAccountDto,
  VerifyPayoutAccountDto,
} from './dto/payout-account.dto';

/**
 * Host payout account + KYC. Hosts submit and see their own (masked) account;
 * L2 staff review the queue, verify/reject, and place administrative holds.
 * No endpoint here ever returns a full account number or PAN.
 */
@Controller()
export class PayoutAccountController {
  constructor(
    private readonly accounts: PayoutAccountService,
    private readonly routePayout: RoutePayoutService,
  ) {}

  // ── Host ──
  /** Host: own payout account (masked) + why payouts are or aren't unlocked. */
  @Roles(UserRole.HOST)
  @Get('host/payouts/account')
  getMine(@CurrentUser() user: RequestUser) {
    return this.accounts.getMine(user.sub);
  }

  /** Host: submit or replace the payout destination (resets to SUBMITTED). */
  @Roles(UserRole.HOST)
  @Post('host/payouts/account')
  submit(@CurrentUser() user: RequestUser, @Body() dto: SubmitPayoutAccountDto) {
    return this.accounts.submit(user.sub, dto);
  }

  // ── Admin ──
  /** Admin: the KYC review queue (filter by status). */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/accounts')
  list(@Query('status') status?: string) {
    return this.accounts.adminList(status);
  }

  /** Admin: approve or reject a host's payout account. */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/accounts/:hostId/verify')
  verify(
    @Param('hostId') hostId: string,
    @Body() dto: VerifyPayoutAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accounts.adminVerify(hostId, dto, user.sub);
  }

  /** Admin: place (reason given) or lift (reason omitted) a payout hold. */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/hosts/:hostId/hold')
  setHold(
    @Param('hostId') hostId: string,
    @Body() dto: SetPayoutHoldDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accounts.adminSetHold(hostId, dto, user.sub);
  }

  /** Admin: readiness breakdown for one host. */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/hosts/:hostId/readiness')
  readiness(@Param('hostId') hostId: string) {
    return this.accounts.readiness(hostId);
  }

  /**
   * Admin: onboard a verified host onto Route (create their linked account).
   * Idempotent — returns the existing id if the host is already onboarded.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/hosts/:hostId/linked-account')
  async onboard(@Param('hostId') hostId: string) {
    const linkedAccountId = await this.routePayout.ensureLinkedAccount(hostId);
    return { hostId, linkedAccountId };
  }
}
