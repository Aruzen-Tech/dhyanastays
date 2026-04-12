import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PayoutService } from './payout.service';
import { IsString } from 'class-validator';

class MarkBatchPaidDto {
  @IsString()
  batchId!: string;
}

@Controller()
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  /**
   * Admin: get all eligible payout lines.
   */
  @Roles(UserRole.ADMIN)
  @Get('admin/payouts/eligible')
  getEligible() {
    return this.payoutService.getEligibleLines();
  }

  /**
   * Admin: dry-run — preview batch without executing (per-host breakdown).
   */
  @Roles(UserRole.ADMIN)
  @Get('admin/payouts/dry-run')
  dryRun() {
    return this.payoutService.dryRunBatch();
  }

  /**
   * Admin: run the weekly payout batch.
   */
  @Roles(UserRole.ADMIN)
  @Post('admin/payouts/run-weekly')
  runWeekly(@CurrentUser() user: RequestUser) {
    return this.payoutService.runWeeklyBatch(user.sub);
  }

  /**
   * Admin: mark a batch as PAID after bank transfer.
   */
  @Roles(UserRole.ADMIN)
  @Post('admin/payouts/batches/:id/mark-paid')
  markPaid(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.payoutService.markBatchPaid(id, user.sub);
  }

  /**
   * Admin: list all payout batches.
   */
  @Roles(UserRole.ADMIN)
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
