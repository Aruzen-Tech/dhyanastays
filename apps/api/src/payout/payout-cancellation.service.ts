import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { HostBalanceService } from './host-balance.service';
import { RoutePayoutService } from './route-payout.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

/** A transfer that has to be clawed back once the cancellation has committed. */
export interface PendingReversal {
  lineId: string;
  transferId: string;
  hostId: string;
  bookingId: string;
  amount: number;
}

export interface CancellationAdjustment {
  /** Lines reduced to zero — nothing is owed to the host. */
  voided: number;
  /** Lines reduced to a partial entitlement. */
  reduced: number;
  /** Paise recorded as host debt because the money had already been sent. */
  debtRecorded: number;
  /** Transfers to reverse after the transaction commits. */
  reversals: PendingReversal[];
}

/**
 * Keeps the host's payout in step with a cancellation.
 *
 * Cancelling a booking used to leave its payout line untouched, so a guest could
 * be refunded in full while the host was still paid in full and the platform
 * absorbed the difference. Nothing downstream filtered on booking status, so the
 * eligibility cron promoted the line and the batch paid it out as normal.
 *
 * The rule is proportional to what the platform actually kept:
 *
 *     retained = (accommodationTotal - accommodationRefund) / accommodationTotal
 *     entitlement = round(line.amount * retained)
 *
 * which handles every tier from one formula — a 100% refund voids the line, a
 * 0% refund (the guest cancelled too late and forfeits) leaves the host's share
 * intact, and a 50% refund halves it. **Accommodation** figures are used, not
 * booking totals: the payout line is the host's share of accommodation, and
 * add-on refunds settle against providers, not the host.
 *
 * Network calls are deliberately excluded from the caller's transaction — the
 * DB work commits first and reversals are settled afterwards.
 */
@Injectable()
export class PayoutCancellationService {
  private readonly logger = new Logger(PayoutCancellationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly balance: HostBalanceService,
    private readonly route: RoutePayoutService,
  ) {}

  /**
   * Bring every payout line for a cancelled booking back in line with the
   * refund. Runs inside the caller's transaction; returns the reversals that
   * must be settled once it commits.
   */
  async adjustForCancellation(
    tx: TxClient,
    input: {
      bookingId: string;
      accommodationTotal: number;
      accommodationRefund: number;
      actorId: string | null;
    },
  ): Promise<CancellationAdjustment> {
    const { bookingId, accommodationTotal, accommodationRefund, actorId } = input;
    const result: CancellationAdjustment = {
      voided: 0,
      reduced: 0,
      debtRecorded: 0,
      reversals: [],
    };

    const lines = await tx.payoutLine.findMany({ where: { bookingId } });
    if (lines.length === 0) return result;

    const retained = retainedRatio(accommodationTotal, accommodationRefund);

    for (const line of lines) {
      // Already fully reversed — nothing left to take back.
      if (line.status === 'REVERSED' && line.reversedAmount >= line.amount) continue;

      const entitlement = Math.round(line.amount * retained);
      const excess = line.amount - entitlement - line.reversedAmount;
      if (excess <= 0) continue;

      if (line.transferId) {
        // Money is committed at the payment aggregator. Reverse it for real,
        // after the cancellation commits.
        result.reversals.push({
          lineId: line.id,
          transferId: line.transferId,
          hostId: line.hostId,
          bookingId,
          amount: excess,
        });
      } else if (line.status === 'PAID') {
        // The manual rail already sent this by bank transfer, so there is
        // nothing to reverse — it becomes debt the next payout nets off.
        await this.balance.recordDebt(
          line.hostId,
          excess,
          'Booking cancelled after payout',
          { bookingId, payoutLineId: line.id, tx },
        );
        result.debtRecorded += excess;
      } else {
        // Nothing has moved yet: reduce the line in place. Zeroing it also
        // parks the status so no rail can pick it up again.
        await tx.payoutLine.update({
          where: { id: line.id },
          data: {
            amount: entitlement,
            ...(entitlement === 0
              ? {
                  status: 'REVERSED' as const,
                  holdReason: 'Booking cancelled — no payout due',
                }
              : {}),
          },
        });
        if (entitlement === 0) result.voided += 1;
        else result.reduced += 1;
      }

      await this.ledger.record({
        type: 'BALANCE_CARRY_FORWARD',
        amount: -excess,
        bookingId,
        payoutLineId: line.id,
        metadata: {
          reason: 'booking_cancelled',
          retainedRatio: retained,
          originalAmount: line.amount,
          entitlement,
        },
        tx,
      });
    }

    if (result.voided || result.reduced || result.debtRecorded || result.reversals.length) {
      await this.audit.log(actorId, 'PAYOUT_CANCELLED_ADJUSTED', 'booking', bookingId, {
        retainedRatio: retained,
        voided: result.voided,
        reduced: result.reduced,
        debtRecorded: result.debtRecorded,
        pendingReversals: result.reversals.length,
      });
    }

    return result;
  }

  /**
   * Claw back transfers for a cancelled booking. Called after the cancellation
   * transaction commits, because reversing is a network call.
   *
   * Best-effort by design: a failure must not undo the cancellation, so the
   * amount is recorded as host debt instead and nets off the next payout.
   */
  async settleReversals(reversals: PendingReversal[]): Promise<void> {
    for (const r of reversals) {
      try {
        const done = await this.route.reverseLine(
          r.lineId,
          r.amount,
          'booking_cancelled',
        );
        if (done) continue;
        // No transfer to reverse after all — fall through to debt.
        throw new Error('transfer not reversible');
      } catch (err) {
        this.logger.error(
          `Reversal failed for payout line ${r.lineId} (${r.amount} paise): ${String(err)} — recording as host debt`,
        );
        await this.balance
          .recordDebt(r.hostId, r.amount, 'Booking cancelled — reversal failed', {
            bookingId: r.bookingId,
            payoutLineId: r.lineId,
          })
          .catch((e) =>
            this.logger.error(`Could not record debt for line ${r.lineId}: ${String(e)}`),
          );
      }
    }
  }
}

/**
 * Share of accommodation the platform kept, clamped to 0–1.
 *
 * A zero or missing accommodation total can't be apportioned, so a refund
 * voids the line outright and no refund leaves it alone.
 */
export function retainedRatio(
  accommodationTotal: number,
  accommodationRefund: number,
): number {
  if (accommodationTotal <= 0) return accommodationRefund > 0 ? 0 : 1;
  const kept = (accommodationTotal - accommodationRefund) / accommodationTotal;
  return Math.min(Math.max(kept, 0), 1);
}
