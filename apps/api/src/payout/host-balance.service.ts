import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostBalanceEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

/**
 * Per-host running balance, in paise.
 *
 * A Route transfer can only be reversed down to zero, so money can still be
 * owed to the platform after a refund — and on a pay-on-arrival booking the
 * host takes the guest's cash directly, commission included. Both leave a debt
 * that used to simply vanish. Recording it here lets the next payout net it off.
 *
 * The table is append-only: a correction is a new ADJUSTMENT row, never an edit,
 * so the history stays auditable. Sign convention throughout: **negative = the
 * host owes the platform**.
 */
@Injectable()
export class HostBalanceService {
  private readonly logger = new Logger(HostBalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Net balance in paise. Negative = the host owes us. */
  async balance(hostId: string): Promise<number> {
    const agg = await this.prisma.hostBalanceEntry.aggregate({
      where: { hostId },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  /** Outstanding debt as a positive number (0 when the host owes nothing). */
  async outstandingDebt(hostId: string): Promise<number> {
    return Math.max(-(await this.balance(hostId)), 0);
  }

  /**
   * Record money the host owes us. `amount` is passed positive and stored
   * negative, so callers never have to think about the sign.
   */
  async recordDebt(
    hostId: string,
    amount: number,
    reason: string,
    ctx: { bookingId?: string; payoutLineId?: string; tx?: TxClient } = {},
  ) {
    if (amount <= 0) return null;
    const client: TxClient = ctx.tx ?? this.prisma;
    const entry = await client.hostBalanceEntry.create({
      data: {
        hostId,
        type: HostBalanceEntryType.DEBT,
        amount: -amount,
        reason,
        bookingId: ctx.bookingId ?? null,
        payoutLineId: ctx.payoutLineId ?? null,
      },
    });
    this.logger.log(`Host ${hostId} debt +${amount} paise (${reason})`);
    return entry;
  }

  /**
   * Withhold from a payout to recover debt. Returns how much was actually
   * recovered, capped at both the outstanding debt and what's available.
   */
  async recoverFromPayout(
    hostId: string,
    available: number,
    ctx: { payoutLineId?: string; bookingId?: string; tx?: TxClient } = {},
  ): Promise<number> {
    if (available <= 0) return 0;

    // Read-then-write on a shared balance: two payouts for the same host
    // running concurrently would both read the same debt and both recover it,
    // over-collecting. Serialise per host by locking the Host row, so the
    // second reader sees the first recovery.
    const run = async (client: TxClient): Promise<number> => {
      await client.$queryRaw`SELECT id FROM "Host" WHERE id = ${hostId} FOR UPDATE`;
      const agg = await client.hostBalanceEntry.aggregate({
        where: { hostId },
        _sum: { amount: true },
      });
      const debt = Math.max(-(agg._sum.amount ?? 0), 0);
      const recovered = Math.min(debt, available);
      if (recovered <= 0) return 0;

      await client.hostBalanceEntry.create({
        data: {
          hostId,
          type: HostBalanceEntryType.RECOVERY,
          amount: recovered, // positive — reduces the debt
          reason: 'Withheld from payout to recover outstanding balance',
          bookingId: ctx.bookingId ?? null,
          payoutLineId: ctx.payoutLineId ?? null,
        },
      });
      this.logger.log(`Host ${hostId} recovered ${recovered} paise from a payout`);
      return recovered;
    };

    // Join the caller's transaction when there is one; otherwise open our own
    // so the lock and the write commit together.
    if (ctx.tx) return run(ctx.tx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any).$transaction((tx: TxClient) => run(tx));
  }

  /** Staff correction — write-off, goodwill credit, or fixing a mistake. */
  async adjust(hostId: string, amount: number, reason: string, actorId: string) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId }, select: { id: true } });
    if (!host) throw new NotFoundException('Host not found');

    const entry = await this.prisma.hostBalanceEntry.create({
      data: {
        hostId,
        type: HostBalanceEntryType.ADJUSTMENT,
        amount, // caller supplies the sign: negative adds debt, positive forgives
        reason,
        createdById: actorId,
      },
    });
    await this.audit.log(actorId, 'HOST_BALANCE_ADJUSTED', 'host', hostId, {
      amount,
      reason,
      entryId: entry.id,
    });
    return { entry, balance: await this.balance(hostId) };
  }

  /** Statement view: current balance + recent entries. */
  async statement(hostId: string, limit = 50) {
    const [balance, entries] = await Promise.all([
      this.balance(hostId),
      this.prisma.hostBalanceEntry.findMany({
        where: { hostId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);
    return { hostId, balance, outstandingDebt: Math.max(-balance, 0), entries };
  }
}
