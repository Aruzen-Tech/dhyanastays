import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { FeatureFlagService } from '../feature/feature-flag.service';
import { PAYOUT_ROUTE_FLAG } from './route-payout.service';
import {
  evaluatePayoutReadiness,
  HOST_PAYOUT_STATE_SELECT,
  type PayoutReadiness,
} from './payout-readiness';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly features: FeatureFlagService,
  ) {}

  /**
   * The manual rail (weekly batch + "mark paid") pools guest money in the
   * platform's own account, which RBI's PA/PG guidelines don't permit. Once
   * Route settlement is live, that rail must be closed — money moves only
   * through the aggregator's escrow.
   */
  private async assertManualRailAllowed(action: string): Promise<void> {
    if (await this.features.isEnabled(PAYOUT_ROUTE_FLAG)) {
      throw new BadRequestException(
        `${action} is disabled while Route settlement is on — payouts settle from the ` +
          `payment aggregator's escrow automatically and must not be moved manually.`,
      );
    }
  }

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
    withheld: { lineCount: number; totalAmount: number; hostCount: number };
  }> {
    await this.assertManualRailAllowed('Running a weekly payout batch');

    const eligibleLines = await this.prisma.payoutLine.findMany({
      where: { status: 'ELIGIBLE' },
      include: { host: { select: HOST_PAYOUT_STATE_SELECT } },
    });

    if (eligibleLines.length === 0) {
      throw new BadRequestException('No eligible payout lines found');
    }

    // ── Payout guard: never settle money to a host who isn't KYC-verified ──
    // RBI's PA/PG guidelines require merchant KYC before settlement, so lines
    // for un-verified / held hosts are parked ON_HOLD instead of being paid.
    const payable: typeof eligibleLines = [];
    const withheld: Array<{ id: string; amount: number; hostId: string; summary: string }> = [];
    const readinessCache = new Map<string, PayoutReadiness>();

    for (const line of eligibleLines) {
      let readiness = readinessCache.get(line.hostId);
      if (!readiness) {
        readiness = evaluatePayoutReadiness(line.host);
        readinessCache.set(line.hostId, readiness);
      }
      if (readiness.ready) payable.push(line);
      else
        withheld.push({
          id: line.id,
          amount: line.amount,
          hostId: line.hostId,
          summary: readiness.summary,
        });
    }

    // Park the withheld lines (grouped by reason to keep this a few queries).
    if (withheld.length > 0) {
      const byReason = new Map<string, string[]>();
      for (const w of withheld) {
        const ids = byReason.get(w.summary) ?? [];
        ids.push(w.id);
        byReason.set(w.summary, ids);
      }
      for (const [reason, ids] of byReason) {
        await this.prisma.payoutLine.updateMany({
          where: { id: { in: ids } },
          data: { status: 'ON_HOLD', holdReason: reason },
        });
      }
      await this.auditService.log(actorId, 'PAYOUT_LINES_WITHHELD', 'payout_line', 'batch', {
        lineCount: withheld.length,
        hostCount: new Set(withheld.map((w) => w.hostId)).size,
        reasons: [...byReason.keys()],
      });
    }

    const withheldSummary = {
      lineCount: withheld.length,
      totalAmount: withheld.reduce((s, w) => s + w.amount, 0),
      hostCount: new Set(withheld.map((w) => w.hostId)).size,
    };

    if (payable.length === 0) {
      throw new BadRequestException(
        `No payable lines — all ${withheld.length} eligible line(s) were withheld pending host KYC/holds`,
      );
    }

    const totalAmount = payable.reduce((sum, l) => sum + l.amount, 0);
    const hostIds = new Set(payable.map((l) => l.hostId));
    const payableIds = payable.map((l) => l.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = await (this.prisma as any).$transaction(async (tx: TxClient) => {
      const created = await tx.payoutBatch.create({
        data: {
          runDate: new Date(),
          status: 'SCHEDULED',
          totalAmount,
        },
      });

      // Link ONLY the payable lines to this batch (never a blanket status match).
      await tx.payoutLine.updateMany({
        where: { id: { in: payableIds } },
        data: {
          status: 'SCHEDULED',
          batchId: created.id,
          holdReason: null,
        },
      });

      // Record ledger events per line
      for (const line of payable) {
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
          lineCount: payable.length,
          hostCount: hostIds.size,
          withheld: withheldSummary,
        },
        tx,
      );

      return created;
    });

    return {
      batchId: batch.id,
      totalAmount,
      lineCount: payable.length,
      hostCount: hostIds.size,
      withheld: withheldSummary,
    };
  }

  /**
   * Mark a batch as PAID (after actual bank transfer confirmation).
   * Admin-only.
   */
  async markBatchPaid(batchId: string, actorId: string) {
    await this.assertManualRailAllowed('Marking a batch paid');

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

    // ── Payout guard (defence in depth) ──
    // A host can lose payout eligibility between scheduling and settlement
    // (KYC re-submitted, admin hold placed). Refuse to record money as paid to
    // anyone who is no longer verified — the batch can be re-run once cleared.
    const hostIds = [...new Set(batch.lines.map((l: { hostId: string }) => l.hostId))];
    const hosts = await this.prisma.host.findMany({
      where: { id: { in: hostIds as string[] } },
      select: { id: true, ...HOST_PAYOUT_STATE_SELECT },
    });
    const blocked = hosts
      .map((h) => ({ hostId: h.id, readiness: evaluatePayoutReadiness(h) }))
      .filter((h) => !h.readiness.ready);
    if (blocked.length > 0) {
      throw new BadRequestException(
        `Cannot mark paid — ${blocked.length} host(s) are no longer payout-eligible: ` +
          blocked.map((b) => `${b.hostId} (${b.readiness.summary})`).join('; '),
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
    blocked: {
      lineCount: number;
      totalAmount: number;
      hostCount: number;
      breakdown: Array<{
        hostId: string;
        hostName: string;
        hostEmail: string;
        lineCount: number;
        amount: number;
        reason: string;
      }>;
    };
  }> {
    const eligibleLines = await this.prisma.payoutLine.findMany({
      where: { status: 'ELIGIBLE' },
      include: {
        host: {
          select: {
            ...HOST_PAYOUT_STATE_SELECT,
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });

    const empty = { lineCount: 0, totalAmount: 0, hostCount: 0, breakdown: [] };
    if (eligibleLines.length === 0) {
      return { ...empty, blocked: { ...empty, breakdown: [] } };
    }

    // Same readiness split the real run applies, so the preview never promises
    // money the guard would withhold.
    type Row = {
      hostId: string;
      hostName: string;
      hostEmail: string;
      lineCount: number;
      amount: number;
      reason: string;
    };
    const payableByHost = new Map<string, Row>();
    const blockedByHost = new Map<string, Row>();
    const readinessCache = new Map<string, PayoutReadiness>();

    for (const line of eligibleLines) {
      let readiness = readinessCache.get(line.hostId);
      if (!readiness) {
        readiness = evaluatePayoutReadiness(line.host);
        readinessCache.set(line.hostId, readiness);
      }
      const target = readiness.ready ? payableByHost : blockedByHost;
      const existing = target.get(line.hostId);
      if (existing) {
        existing.lineCount++;
        existing.amount += line.amount;
      } else {
        target.set(line.hostId, {
          hostId: line.hostId,
          hostName: line.host.user.fullName ?? '',
          hostEmail: line.host.user.email,
          lineCount: 1,
          amount: line.amount,
          reason: readiness.summary,
        });
      }
    }

    const byAmount = (a: Row, b: Row) => b.amount - a.amount;
    const payable = [...payableByHost.values()].sort(byAmount);
    const blocked = [...blockedByHost.values()].sort(byAmount);
    const sum = (rows: Row[]) => rows.reduce((s, r) => s + r.amount, 0);
    const lines = (rows: Row[]) => rows.reduce((s, r) => s + r.lineCount, 0);

    return {
      lineCount: lines(payable),
      totalAmount: sum(payable),
      hostCount: payable.length,
      breakdown: payable.map(({ reason: _reason, ...rest }) => rest),
      blocked: {
        lineCount: lines(blocked),
        totalAmount: sum(blocked),
        hostCount: blocked.length,
        breakdown: blocked,
      },
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

  /** Resolve a host's id from their user id. */
  async hostIdForUser(hostUserId: string): Promise<string> {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      select: { id: true },
    });
    if (!host) throw new NotFoundException('Host profile not found');
    return host.id;
  }

  /**
   * Tax withheld across payouts in a period — the figures needed to remit TDS
   * (§194-O) and TCS (§52), and to reconcile them against the payout ledger.
   */
  async taxSummary(from?: string, to?: string) {
    const gte = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lte = to ? new Date(to) : new Date();

    const where = { createdAt: { gte, lte }, transferId: { not: null } };
    const [agg, byHost] = await Promise.all([
      this.prisma.payoutLine.aggregate({
        where,
        _sum: {
          amount: true,
          tdsAmount: true,
          tcsAmount: true,
          nettedAmount: true,
          transferAmount: true,
        },
        _count: true,
      }),
      this.prisma.payoutLine.groupBy({
        by: ['hostId'],
        where,
        _sum: { amount: true, tdsAmount: true, tcsAmount: true },
      }),
    ]);

    return {
      from: gte.toISOString(),
      to: lte.toISOString(),
      lineCount: agg._count,
      grossPaid: agg._sum.amount ?? 0,
      tdsWithheld: agg._sum.tdsAmount ?? 0,
      tcsWithheld: agg._sum.tcsAmount ?? 0,
      nettedForDebt: agg._sum.nettedAmount ?? 0,
      transferred: agg._sum.transferAmount ?? 0,
      byHost: byHost
        .map((h) => ({
          hostId: h.hostId,
          gross: h._sum.amount ?? 0,
          tds: h._sum.tdsAmount ?? 0,
          tcs: h._sum.tcsAmount ?? 0,
        }))
        .sort((a, b) => b.gross - a.gross),
    };
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
