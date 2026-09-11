import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { FeatureFlagService } from '../feature/feature-flag.service';
import { RouteService, type RouteTransfer } from './route.service';
import { PayoutTaxService } from './payout-tax.service';
import { HostBalanceService } from './host-balance.service';
import { evaluatePayoutReadiness, HOST_PAYOUT_STATE_SELECT } from './payout-readiness';

/** PA statuses that need no further polling. */
const TERMINAL = new Set(['processed', 'failed', 'reversed']);
/** Sentinel written while we hold a claim on a line but have no transfer id yet. */
const CLAIMING = 'creating';

export const PAYOUT_ROUTE_FLAG = 'payout_route';

/**
 * Route settlement orchestration — the RBI-compliant payout rail.
 *
 * Guests' money sits in the payment aggregator's escrow; we instruct Razorpay
 * to split each captured payment to the host's KYC'd linked account, held until
 * the host has earned it (check-in + 24h). Razorpay releases and settles
 * automatically, so no money ever pools in the platform's own account and there
 * is no manual "mark paid" step.
 *
 * Two invariants matter most here:
 *
 * 1. **Never double-pay.** `PayoutLine.transferId` is UNIQUE, and a line is
 *    *claimed* with a conditional update before the network call — so a retried
 *    job or a second worker can't create a second transfer for the same line.
 * 2. **The PA is the source of truth.** Local status is only ever advanced from
 *    a transfer entity we received from Razorpay (webhook or reconciliation
 *    sweep), never from an admin asserting that money moved.
 */
@Injectable()
export class RoutePayoutService {
  private readonly logger = new Logger(RoutePayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly route: RouteService,
    private readonly features: FeatureFlagService,
    private readonly tax: PayoutTaxService,
    private readonly balance: HostBalanceService,
  ) {}

  isEnabled(): Promise<boolean> {
    return this.features.isEnabled(PAYOUT_ROUTE_FLAG);
  }

  // ── Linked accounts ──────────────────────────────────────────────────────
  /**
   * Idempotently create the host's Route linked account. Only a VERIFIED payout
   * account is eligible — Razorpay performs its own merchant KYC on top.
   *
   * NOTE: this creates the account entity. Attaching the settlement (bank)
   * details and activating the Route product is a further onboarding step in
   * Razorpay's product-configuration flow — confirm the exact calls for the API
   * version you are onboarded on before enabling `payout_route` in production.
   */
  async ensureLinkedAccount(hostId: string): Promise<string | null> {
    const account = await this.prisma.hostPayoutAccount.findUnique({
      where: { hostId },
      include: { host: { select: { user: { select: { email: true, phone: true } } } } },
    });
    if (!account) throw new NotFoundException('Payout account not found');
    if (account.linkedAccountId) return account.linkedAccountId;
    if (account.status !== 'VERIFIED') {
      throw new BadRequestException('Payout account must be verified before onboarding');
    }

    const created = await this.route.createLinkedAccount({
      email: account.host.user.email,
      phone: account.host.user.phone,
      legalName: account.legalName,
      referenceId: hostId,
    });

    await this.prisma.hostPayoutAccount.update({
      where: { hostId },
      data: { linkedAccountId: created.id, linkedAccountStatus: created.status ?? 'created' },
    });
    await this.audit.log(null, 'ROUTE_LINKED_ACCOUNT_CREATED', 'host_payout_account', account.id, {
      hostId,
      linkedAccountId: created.id,
    });
    this.logger.log(`Route linked account ${created.id} created for host ${hostId}`);
    return created.id;
  }

  // ── Transfers ────────────────────────────────────────────────────────────
  /**
   * Create Route transfers for payout lines that don't have one yet. Run from
   * the route-transfer cron; safe to run concurrently and to retry.
   */
  async createDueTransfers(limit = 50): Promise<{
    created: number;
    skipped: number;
    failed: number;
  }> {
    if (!(await this.isEnabled())) return { created: 0, skipped: 0, failed: 0 };

    const lines = await this.prisma.payoutLine.findMany({
      where: {
        transferId: null,
        transferStatus: null,
        status: { in: ['NOT_ELIGIBLE', 'ELIGIBLE'] },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        host: {
          select: {
            ...HOST_PAYOUT_STATE_SELECT,
            payoutAccount: { select: { status: true, linkedAccountId: true } },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const line of lines) {
      const readiness = evaluatePayoutReadiness({
        ...line.host,
        payoutAccount: line.host.payoutAccount,
      });
      const linkedAccountId = line.host.payoutAccount?.linkedAccountId;
      if (!readiness.ready || !linkedAccountId) {
        skipped++;
        continue;
      }

      const paymentRef = await this.capturedPaymentRef(line.bookingId);
      if (!paymentRef) {
        skipped++;
        continue;
      }

      // Claim the line BEFORE the network call. If another worker already holds
      // it, count is 0 and we skip — this is what prevents a double transfer.
      const claim = await this.prisma.payoutLine.updateMany({
        where: { id: line.id, transferId: null, transferStatus: null },
        data: { transferStatus: CLAIMING },
      });
      if (claim.count === 0) {
        skipped++;
        continue;
      }

      try {
        // ── Deductions from the gross share, in order ──
        // 1. Statutory withholding (we remit it, so it can never go to the host).
        const tax = await this.tax.compute(line.amount);
        // 2. Recover any outstanding debt from what's left.
        const afterTax = line.amount - tax.total;
        const netted = await this.balance.recoverFromPayout(line.hostId, afterTax, {
          payoutLineId: line.id,
          bookingId: line.bookingId,
        });
        const transferAmount = afterTax - netted;

        // Fully consumed by tax + debt recovery: nothing to send, but the line
        // is settled — record it rather than retrying forever.
        if (transferAmount <= 0) {
          await this.prisma.payoutLine.update({
            where: { id: line.id },
            data: {
              transferStatus: 'processed',
              status: 'PAID',
              settledAt: new Date(),
              tdsAmount: tax.tds,
              tcsAmount: tax.tcs,
              nettedAmount: netted,
              transferAmount: 0,
              holdReason: null,
            },
          });
          await this.audit.log(null, 'PAYOUT_FULLY_WITHHELD', 'payout_line', line.id, {
            gross: line.amount,
            tax: tax.total,
            netted,
          });
          created++;
          continue;
        }

        const transfer = await this.route.createTransfer(paymentRef, {
          linkedAccountId,
          amountPaise: transferAmount,
          // Hold in escrow until the host has earned it (check-in + 24h).
          onHoldUntil: Math.floor(line.eligibleAt.getTime() / 1000),
          notes: { payoutLineId: line.id, bookingId: line.bookingId },
        });

        await this.prisma.payoutLine.update({
          where: { id: line.id },
          data: {
            transferId: transfer.id,
            transferStatus: transfer.status,
            status: 'SCHEDULED',
            holdReason: null,
            tdsAmount: tax.tds,
            tcsAmount: tax.tcs,
            nettedAmount: netted,
            transferAmount,
          },
        });
        await this.ledger.record({
          type: 'PAYOUT_SCHEDULED',
          amount: transferAmount,
          bookingId: line.bookingId,
          payoutLineId: line.id,
          metadata: {
            transferId: transfer.id,
            linkedAccountId,
            rail: 'route',
            gross: line.amount,
            tds: tax.tds,
            tcs: tax.tcs,
            netted,
          },
        });
        created++;
      } catch (err) {
        // Release the claim so the next run retries. The transfer either was
        // never created, or will be picked up by reconciliation via notes.
        await this.prisma.payoutLine.updateMany({
          where: { id: line.id, transferStatus: CLAIMING },
          data: { transferStatus: null, transferFailure: String(err).slice(0, 300) },
        });
        failed++;
        this.logger.error(`Route transfer failed for payout line ${line.id}: ${String(err)}`);
      }
    }

    if (created || failed) {
      this.logger.log(`Route transfers: ${created} created, ${skipped} skipped, ${failed} failed`);
    }
    return { created, skipped, failed };
  }

  /**
   * Apply a transfer entity from Razorpay (webhook or reconciliation).
   * Idempotent: re-delivering the same terminal state is a no-op.
   */
  async applyTransferEvent(entity: RouteTransfer): Promise<void> {
    if (!entity?.id) return;
    const line = await this.prisma.payoutLine.findUnique({ where: { transferId: entity.id } });
    if (!line) {
      this.logger.warn(`Transfer ${entity.id} has no matching payout line`);
      return;
    }
    if (line.transferStatus === entity.status) return; // already applied

    const failure = entity.error?.description ?? entity.failure_reason ?? null;
    const data: Record<string, unknown> = { transferStatus: entity.status };

    if (entity.status === 'processed') {
      data.status = 'PAID';
      data.settledAt = new Date();
      data.transferFailure = null;
    } else if (entity.status === 'reversed') {
      data.status = 'REVERSED';
      data.transferFailure = failure;
    } else if (entity.status === 'failed') {
      // Leave the money owed: park it so an operator can investigate.
      data.status = 'ON_HOLD';
      data.holdReason = `Route transfer failed: ${failure ?? 'unknown'}`;
      data.transferFailure = failure;
    }

    await this.prisma.payoutLine.update({ where: { id: line.id }, data });

    // Ledger only on the real money-moved transition, once.
    if (entity.status === 'processed' && line.status !== 'PAID') {
      await this.ledger.record({
        type: 'PAYOUT_SENT',
        amount: line.amount,
        bookingId: line.bookingId,
        payoutLineId: line.id,
        metadata: {
          transferId: entity.id,
          rail: 'route',
          settlementId: entity.recipient_settlement_id ?? null,
        },
      });
    }
    await this.audit.log(null, 'ROUTE_TRANSFER_UPDATED', 'payout_line', line.id, {
      transferId: entity.id,
      status: entity.status,
      failure,
    });
  }

  /** Poll transfers we haven't seen reach a terminal state — missed webhooks. */
  async reconcileOpenTransfers(limit = 100): Promise<number> {
    if (!(await this.isEnabled())) return 0;

    const open = await this.prisma.payoutLine.findMany({
      where: {
        transferId: { not: null },
        transferStatus: { notIn: [...TERMINAL] },
      },
      take: limit,
      select: { id: true, transferId: true },
    });

    let reconciled = 0;
    for (const line of open) {
      try {
        const entity = await this.route.fetchTransfer(line.transferId!);
        await this.applyTransferEvent(entity);
        reconciled++;
      } catch (err) {
        this.logger.warn(`Reconcile failed for transfer ${line.transferId}: ${String(err)}`);
      }
    }
    return reconciled;
  }

  // ── Reversals ────────────────────────────────────────────────────────────
  /**
   * Claw money back from a host after a refund. Replaces the ledger-only
   * "carry forward" note, which recorded a debt but could never collect it.
   */
  async reverseForRefund(
    bookingId: string,
    refundAmount: number,
    actorId: string | null,
  ): Promise<{ reversed: number } | null> {
    if (!(await this.isEnabled())) return null;

    const line = await this.prisma.payoutLine.findFirst({
      where: { bookingId, transferId: { not: null }, status: { in: ['PAID', 'SCHEDULED'] } },
    });
    if (!line?.transferId) return null;

    // Never reverse more than we actually sent (post-deduction), and never
    // more than is still un-reversed.
    const transferred = line.transferAmount ?? line.amount;
    const remaining = transferred - line.reversedAmount;
    const amount = Math.min(refundAmount, Math.max(remaining, 0));

    // A refund can exceed what we transferred — the guest gets the full amount
    // back, so the difference is money the host now owes us. Record it as debt
    // so the next payout nets it off instead of it silently disappearing.
    const shortfall = refundAmount - amount;
    if (shortfall > 0) {
      await this.balance.recordDebt(
        line.hostId,
        shortfall,
        'Refund exceeded the amount transferred to the host',
        { bookingId, payoutLineId: line.id },
      );
    }

    if (amount <= 0) return { reversed: 0 };

    await this.route.createReversal(line.transferId, amount);
    await this.prisma.payoutLine.update({
      where: { id: line.id },
      data: {
        reversedAmount: { increment: amount },
        ...(amount >= remaining ? { status: 'REVERSED' as const } : {}),
      },
    });
    await this.ledger.record({
      type: 'BALANCE_CARRY_FORWARD',
      amount: -amount,
      bookingId,
      payoutLineId: line.id,
      metadata: { reason: 'refund_after_payout', rail: 'route', transferId: line.transferId },
    });
    await this.audit.log(actorId, 'ROUTE_TRANSFER_REVERSED', 'payout_line', line.id, {
      transferId: line.transferId,
      amount,
      refundAmount,
    });
    return { reversed: amount };
  }

  // ── Internals ────────────────────────────────────────────────────────────
  /** The Razorpay payment id a transfer must be split from. */
  private async capturedPaymentRef(bookingId: string): Promise<string | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'CAPTURED', gatewayPaymentRef: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { gatewayPaymentRef: true },
    });
    return payment?.gatewayPaymentRef ?? null;
  }
}
