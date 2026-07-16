import { Controller, Get, Param, Post } from '@nestjs/common';
import { AdminLevel, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { PayoutService } from './payout.service';

@Controller()
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

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
}
