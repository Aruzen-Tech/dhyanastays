import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminLevel, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { PayoutService } from './payout.service';
import { HostBalanceService } from './host-balance.service';
import { AdjustHostBalanceDto } from './dto/host-balance.dto';

@Controller()
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly hostBalance: HostBalanceService,
  ) {}

  /**
   * Admin: get all eligible payout lines.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/eligible')
  getEligible() {
    return this.payoutService.getEligibleLines();
  }

  /**
   * Admin: dry-run — preview batch without executing (per-host breakdown).
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/dry-run')
  dryRun() {
    return this.payoutService.dryRunBatch();
  }

  /**
   * Admin: run the weekly payout batch.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/run-weekly')
  runWeekly(@CurrentUser() user: RequestUser) {
    return this.payoutService.runWeeklyBatch(user.sub);
  }

  /**
   * Admin: mark a batch as PAID after bank transfer.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/batches/:id/mark-paid')
  markPaid(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.payoutService.markBatchPaid(id, user.sub);
  }

  /**
   * Admin: list all payout batches.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/batches')
  getBatches() {
    return this.payoutService.getBatches();
  }

  /**
   * Host: get own payout statements.
   */
  @Roles(UserRole.HOST)
  @Get('host/payouts/statements')
  getStatements(@CurrentUser() user: RequestUser) {
    return this.payoutService.getHostStatements(user.sub);
  }

  /**
   * Host: own balance ledger — what they owe (or are owed) and why.
   */
  @Roles(UserRole.HOST)
  @Get('host/payouts/balance')
  async getMyBalance(@CurrentUser() user: RequestUser) {
    const hostId = await this.payoutService.hostIdForUser(user.sub);
    return this.hostBalance.statement(hostId);
  }

  /** Admin: a host's balance ledger. */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/hosts/:hostId/balance')
  getHostBalance(@Param('hostId') hostId: string) {
    return this.hostBalance.statement(hostId);
  }

  /**
   * Admin: manual balance correction (write-off, goodwill, error fix).
   * Positive forgives debt, negative adds it.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/payouts/hosts/:hostId/balance/adjust')
  adjustHostBalance(
    @Param('hostId') hostId: string,
    @Body() dto: AdjustHostBalanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hostBalance.adjust(hostId, dto.amount, dto.reason, user.sub);
  }

  /**
   * Admin: tax withheld in a period — the figures needed to remit TDS (§194-O)
   * and TCS (§52) and to reconcile them against the payout ledger.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/tax-summary')
  taxSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.payoutService.taxSummary(from, to);
  }

  /**
   * Admin: payout rail health — money that is stuck rather than in flight
   * (held lines, failed transfers, orphaned claims, KYC-blocked balances,
   * hosts in debt). Every figure is one an operator must act on.
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/payouts/health')
  health() {
    return this.payoutService.health();
  }
}
