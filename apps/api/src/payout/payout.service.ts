import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Mark payout lines as ELIGIBLE when check-in + 24h has passed.
   * Called by the payout_eligibility_marking job.
   */
  async markEligible(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.payoutLine.updateMany({
      where: {
        status: 'NOT_ELIGIBLE',
        eligibleAt: { lte: now },
      },
      data: { status: 'ELIGIBLE' },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} payout lines as ELIGIBLE`);
      await this.auditService.log(
        null,
        'PAYOUT_ELIGIBILITY_MARKED',
        'payout_line',
        'batch',
        { count: result.count, at: now.toISOString() },
      );
    }

    return result.count;
  }

  /**
   * Run the weekly payout batch.
   * Collects all ELIGIBLE lines, groups by host, creates a PayoutBatch,
   * and transitions lines to SCHEDULED.
   * Admin-only operation.
   */
  async runWeeklyBatch(actorId: string): Promise<{
    batchId: string;
    totalAmount: number;
    lineCount: number;
    hostCount: number;
  }> {
    const eligibleLines = await this.prisma.payoutLine.findMany({
      where: { status: 'ELIGIBLE' },
      include: { host: { include: { user: true } } },
    });

    if (eligibleLines.length === 0) {
      throw new BadRequestException('No eligible payout lines found');
    }

    const totalAmount = eligibleLines.reduce(
      (sum: number, l: { amount: number }) => sum + l.amount,
      0,
    );
    const hostIds = new Set(eligibleLines.map((l: { hostId: string }) => l.hostId));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = await (this.prisma as any).$transaction(async (tx: TxClient) => {
      const created = await tx.payoutBatch.create({
        data: {
          runDate: new Date(),
          status: 'SCHEDULED',
          totalAmount,
        },
      });

      // Link all eligible lines to this batch and mark SCHEDULED
      await tx.payoutLine.updateMany({
        where: { status: 'ELIGIBLE' },
        data: {
          status: 'SCHEDULED',
          batchId: created.id,
        },
      });

      // Record ledger events per line
      for (const line of eligibleLines) {
        await this.ledgerService.record({
          type: 'PAYOUT_SCHEDULED',
          amount: line.amount,
          bookingId: line.bookingId,
          payoutLineId: line.id,
          metadata: {
            batchId: created.id,
            hostId: line.hostId,
          },
          tx,
        });
      }

      await this.auditService.log(
        actorId,
        'PAYOUT_BATCH_CREATED',
        'payout_batch',
        created.id,
        {
          totalAmount,
          lineCount: eligibleLines.length,
          hostCount: hostIds.size,
        },
        tx,
      );

      return created;
    });

    return {
      batchId: batch.id,
      totalAmount,
      lineCount: eligibleLines.length,
      hostCount: hostIds.size,
    };
  }

  /**
   * Mark a batch as PAID (after actual bank transfer confirmation).
   * Admin-only.
   */
  async markBatchPaid(batchId: string, actorId: string) {
    const batch = await this.prisma.payoutBatch.findUnique({
      where: { id: batchId },
      include: { lines: true },
    });
    if (!batch) throw new NotFoundException('Payout batch not found');
    if (batch.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Batch is in status ${batch.status}, expected SCHEDULED`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).$transaction(async (tx: TxClient) => {
      await tx.payoutBatch.update({
        where: { id: batchId },
        data: { status: 'PAID' },
      });

      await tx.payoutLine.updateMany({
        where: { batchId },
        data: { status: 'PAID' },
      });

      for (const line of batch.lines) {
        await this.ledgerService.record({
          type: 'PAYOUT_SENT',
          amount: line.amount,
          bookingId: line.bookingId,
          payoutLineId: line.id,
          metadata: { batchId },
          tx,
        });
      }

      await this.auditService.log(
        actorId,
        'PAYOUT_BATCH_PAID',
        'payout_batch',
        batchId,
        { totalAmount: batch.totalAmount, lineCount: batch.lines.length },
        tx,
      );
    });

    return { batchId, status: 'PAID', totalAmount: batch.totalAmount };
  }

  /**
   * Dry-run: preview what a weekly batch would look like without executing.
   * Returns per-host breakdown of eligible lines.
   */
  async dryRunBatch(): Promise<{
    lineCount: number;
    totalAmount: number;
    hostCount: number;
    breakdown: Array<{
      hostId: string;
      hostName: string;
      hostEmail: string;
      lineCount: number;
      amount: number;
    }>;
  }> {
    const eligibleLines = await this.prisma.payoutLine.findMany({
      where: { status: 'ELIGIBLE' },
      include: {
        host: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });

    if (eligibleLines.length === 0) {
      return { lineCount: 0, totalAmount: 0, hostCount: 0, breakdown: [] };
    }

    const byHost = new Map<string, { hostId: string; hostName: string; hostEmail: string; lineCount: number; amount: number }>();
    for (const line of eligibleLines) {
      const existing = byHost.get(line.hostId);
      if (existing) {
        existing.lineCount++;
        existing.amount += line.amount;
      } else {
        const hostUser = (line.host as { user: { fullName: string | null; email: string } }).user;
        byHost.set(line.hostId, {
          hostId: line.hostId,
          hostName: hostUser.fullName ?? '',
          hostEmail: hostUser.email,
          lineCount: 1,
          amount: line.amount,
        });
      }
    }

    const breakdown = Array.from(byHost.values()).sort((a, b) => b.amount - a.amount);
    const totalAmount = eligibleLines.reduce((s, l) => s + l.amount, 0);

    return {
      lineCount: eligibleLines.length,
      totalAmount,
      hostCount: breakdown.length,
      breakdown,
    };
  }

  /**
   * Get all eligible payout lines (admin view).
   */
  async getEligibleLines() {
    return this.prisma.payoutLine.findMany({
      where: { status: 'ELIGIBLE' },
      include: {
        host: { include: { user: { select: { fullName: true, email: true } } } },
        listing: { select: { title: true } },
      },
      orderBy: { eligibleAt: 'asc' },
    });
  }

  /**
   * Get payout statements for a host.
   */
  async getHostStatements(hostUserId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });
    if (!host) throw new NotFoundException('Host profile not found');

    const lines = await this.prisma.payoutLine.findMany({
      where: { hostId: host.id },
      include: {
        listing: { select: { title: true } },
        batch: { select: { runDate: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarned = lines
      .filter((l: { status: string }) => l.status === 'PAID')
      .reduce((sum: number, l: { amount: number }) => sum + l.amount, 0);

    const totalPending = lines
      .filter((l: { status: string }) => ['ELIGIBLE', 'SCHEDULED', 'NOT_ELIGIBLE'].includes(l.status))
      .reduce((sum: number, l: { amount: number }) => sum + l.amount, 0);

    return {
      hostId: host.id,
      totalEarned,
      totalPending,
      lines,
    };
  }

  /**
   * Get all payout batches (admin view).
   */
  async getBatches() {
    return this.prisma.payoutBatch.findMany({
      orderBy: { runDate: 'desc' },
      include: {
        _count: { select: { lines: true } },
      },
    });
  }

  /**
   * Handle negative balance carry-forward when a refund is issued after payout.
   * Creates a negative ledger event to track the debt.
   */
  async handleRefundAfterPayout(
    bookingId: string,
    refundAmount: number,
    actorId: string | null,
  ) {
    // Find the paid payout line for this booking
    const payoutLine = await this.prisma.payoutLine.findFirst({
      where: { bookingId, status: 'PAID' },
    });

    if (!payoutLine) return; // No payout was made, nothing to carry forward

    const carryForward = Math.min(refundAmount, payoutLine.amount);

    await this.ledgerService.record({
      type: 'BALANCE_CARRY_FORWARD',
      amount: -carryForward, // negative = debt
      bookingId,
      payoutLineId: payoutLine.id,
      metadata: {
        reason: 'refund_after_payout',
        refundAmount,
        carryForward,
      },
    });

    await this.auditService.log(
      actorId,
      'PAYOUT_CARRY_FORWARD',
      'payout_line',
      payoutLine.id,
      { refundAmount, carryForward, bookingId },
    );
  }
}
