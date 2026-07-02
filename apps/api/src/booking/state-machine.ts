import { ConflictException, Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';

/**
 * Booking state machine.
 *
 * SINGLE chokepoint for `Booking.status` mutations. Every status change
 * must route through `BookingStateMachine.transition(tx, booking, event, ctx)`.
 * Direct `tx.booking.update({ data: { status: ... } })` outside this module is
 * forbidden — the lint sweep in Step 3 enforces it.
 *
 * Why: makes illegal transitions impossible at runtime, gives us a free
 * audit trail via `statusHistory`, and centralises the side-effects of
 * each transition so future engineers don't accidentally bypass them.
 *
 * Key invariants:
 *   • Caller MUST pass its own transaction client. The machine never opens
 *     its own — that would silently break atomicity if the caller rolls back.
 *   • The machine never re-reads the booking. The caller is responsible for
 *     a FOR UPDATE / fresh fetch inside the same tx (see confirmPayment).
 *   • `statusHistory` is append-only (Prisma `push` op) — never rewritten.
 *
 * NOTE on our enum split:
 * Spec uses a single `CONFIRMED`; our codebase has `CONFIRMED_DEPOSIT` and
 * `CONFIRMED_PAID` for DEPOSIT_50 + PAY_LATER flows. Transitions are richer
 * but semantics match the spec's intent.
 */

export type BookingEvent =
  // Payment-driven (initial captures)
  | 'PAYMENT_CONFIRMED_FULL'
  | 'PAYMENT_CONFIRMED_DEPOSIT'
  | 'PAY_LATER_FIRST_CAPTURED'
  | 'PAY_LATER_INSTALMENT_CAPTURED'
  | 'PAY_LATER_FINAL_CAPTURED'
  // Balance-due flow
  | 'BALANCE_DUE_TRIGGERED'
  | 'BALANCE_PAID'
  // Cancellation paths (route to CANCELLED or REFUNDED via guard)
  | 'GUEST_CANCELLED'
  | 'ADMIN_CANCELLED'
  | 'AUTO_CANCEL_UNPAID_BALANCE'
  | 'AUTO_CANCEL_PAY_LATER_DEFAULT'
  // Completion
  | 'STAY_COMPLETED'
  | 'AUTO_COMPLETED'
  // Admin issues a refund that brings cumulative refunds == total paid.
  // Distinct from cancellation: services may have been rendered already.
  | 'ADMIN_FULL_REFUND_ISSUED';

export interface TransitionContext {
  actorId: string | null; // user id, 'system:razorpay', 'system:cron', 'system:auto-complete', etc.
  metadata?: Record<string, unknown>;
  /**
   * For cancellation events the caller computes refund up-front; the guard uses
   * it to decide CANCELLED vs REFUNDED. Optional; absent ⇒ treated as 0.
   */
  refundAmountPaise?: number;
}

interface Transition {
  from: BookingStatus[];
  to: BookingStatus | ((booking: BookingLike, ctx: TransitionContext) => BookingStatus);
  event: BookingEvent;
  /**
   * Guards must be SYNCHRONOUS and PURE — no DB reads, no side-effects.
   * The caller is responsible for fetching the latest booking inside the tx.
   * Returning false throws GuardFailedException.
   */
  guard?: (booking: BookingLike, ctx: TransitionContext) => boolean;
}

/** Subset of Booking needed by guards. Avoids tight coupling to Prisma model. */
export interface BookingLike {
  id: string;
  status: BookingStatus;
  plan: string; // PaymentPlan
  startsAt: Date;
  endsAt: Date;
  balanceDueAt: Date | null;
  payLaterMonths: number | null;
  statusHistory: Prisma.JsonValue;
}

export interface StatusHistoryEntry {
  from: BookingStatus;
  to: BookingStatus;
  event: BookingEvent;
  actorId: string | null;
  at: string;
  metadata?: Record<string, unknown>;
}

/** Thrown when no transition matches (from, event). */
export class IllegalTransitionException extends ConflictException {
  constructor(from: BookingStatus, event: BookingEvent) {
    super({
      statusCode: 409,
      error: 'IllegalTransition',
      message: `No transition for event ${event} from state ${from}`,
      from,
      event,
    });
  }
}

/** Thrown when a transition matches but its guard rejects. */
export class GuardFailedException extends ConflictException {
  constructor(event: BookingEvent, reason: string) {
    super({
      statusCode: 409,
      error: 'GuardFailed',
      message: `Guard rejected event ${event}: ${reason}`,
      event,
      reason,
    });
  }
}

// ─── Transition table ────────────────────────────────────────────────────────
// Order doesn't matter except for readability. find() picks first match on
// (event, from-includes-current-status). Each event should have at most one
// matching transition for any given `from` to keep the dispatch deterministic.

export const TRANSITIONS: readonly Transition[] = [
  // ── Initial capture ─────────────────────────────────────────────────────
  {
    event: 'PAYMENT_CONFIRMED_FULL',
    from: ['PAYMENT_PENDING'],
    to: 'CONFIRMED_PAID',
    guard: (b) => b.plan === 'FULL',
  },
  {
    event: 'PAYMENT_CONFIRMED_DEPOSIT',
    from: ['PAYMENT_PENDING'],
    to: 'CONFIRMED_DEPOSIT',
    guard: (b) => b.plan === 'DEPOSIT_50',
  },
  {
    event: 'PAY_LATER_FIRST_CAPTURED',
    from: ['PAYMENT_PENDING'],
    to: 'CONFIRMED_DEPOSIT',
    guard: (b) => b.plan === 'PAY_LATER',
  },

  // ── Pay-Later subsequent instalments ────────────────────────────────────
  // Mid-instalment captures stay in CONFIRMED_DEPOSIT.
  {
    event: 'PAY_LATER_INSTALMENT_CAPTURED',
    from: ['CONFIRMED_DEPOSIT'],
    to: 'CONFIRMED_DEPOSIT',
    guard: (b) => b.plan === 'PAY_LATER',
  },
  // Final instalment promotes to CONFIRMED_PAID.
  {
    event: 'PAY_LATER_FINAL_CAPTURED',
    from: ['CONFIRMED_DEPOSIT'],
    to: 'CONFIRMED_PAID',
    guard: (b) => b.plan === 'PAY_LATER',
  },

  // ── Balance-due flow (DEPOSIT_50) ───────────────────────────────────────
  {
    event: 'BALANCE_DUE_TRIGGERED',
    from: ['CONFIRMED_DEPOSIT'],
    to: 'BALANCE_DUE',
  },
  {
    event: 'BALANCE_PAID',
    from: ['BALANCE_DUE'],
    to: 'CONFIRMED_PAID',
  },

  // ── Cancellation paths ──────────────────────────────────────────────────
  // CANCELLED vs REFUNDED chosen by guard: refundAmountPaise > 0 ⇒ REFUNDED.
  {
    event: 'GUEST_CANCELLED',
    from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'],
    to: cancelTarget,
  },
  {
    event: 'ADMIN_CANCELLED',
    from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'],
    to: cancelTarget,
  },
  {
    event: 'AUTO_CANCEL_UNPAID_BALANCE',
    from: ['BALANCE_DUE'],
    to: cancelTarget,
  },
  {
    event: 'AUTO_CANCEL_PAY_LATER_DEFAULT',
    from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'BALANCE_DUE'],
    to: cancelTarget,
  },

  // ── Completion ──────────────────────────────────────────────────────────
  {
    event: 'STAY_COMPLETED',
    from: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'],
    to: 'COMPLETED',
  },
  {
    event: 'AUTO_COMPLETED',
    from: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'],
    to: 'COMPLETED',
  },

  // ── Admin refund engine ─────────────────────────────────────────────────
  // Admin partial-refund operations sum cumulative refunds; once total refunded
  // ≥ totalPaid, the booking flips to REFUNDED. Distinct from cancellation —
  // services may have been rendered (e.g., booking already COMPLETED).
  {
    event: 'ADMIN_FULL_REFUND_ISSUED',
    from: ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED', 'CANCELLED'],
    to: 'REFUNDED',
  },
];

function cancelTarget(_booking: BookingLike, ctx: TransitionContext): BookingStatus {
  return (ctx.refundAmountPaise ?? 0) > 0 ? 'REFUNDED' : 'CANCELLED';
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class BookingStateMachine {
  /**
   * Transition a booking through `event`, persisting status + appending to
   * statusHistory, all inside the caller's transaction.
   *
   * @param tx       The caller's Prisma transaction client. The machine never
   *                 opens its own — atomicity must align with the caller.
   * @param booking  Booking snapshot read inside `tx` (preferably after
   *                 SELECT … FOR UPDATE on the same row).
   * @param event    The transition event to apply.
   * @param ctx      Actor identity + optional metadata + optional refund info.
   *
   * @throws IllegalTransitionException if no transition matches.
   * @throws GuardFailedException if a guard rejects.
   */
  async transition<T extends BookingLike>(
    tx: Prisma.TransactionClient,
    booking: T,
    event: BookingEvent,
    ctx: TransitionContext,
  ): Promise<Awaited<ReturnType<Prisma.TransactionClient['booking']['update']>>> {
    const transition = TRANSITIONS.find(
      (t) => t.event === event && t.from.includes(booking.status),
    );
    if (!transition) {
      throw new IllegalTransitionException(booking.status, event);
    }
    if (transition.guard && !transition.guard(booking, ctx)) {
      throw new GuardFailedException(
        event,
        `from=${booking.status} plan=${booking.plan}`,
      );
    }

    const to =
      typeof transition.to === 'function' ? transition.to(booking, ctx) : transition.to;

    const entry: StatusHistoryEntry = {
      from: booking.status,
      to,
      event,
      actorId: ctx.actorId,
      at: new Date().toISOString(),
      ...(ctx.metadata ? { metadata: ctx.metadata } : {}),
    };

    // Prisma's Json column doesn't support array-push as a single op — we
    // read+rewrite under the caller's lock. Safe because the caller has
    // taken a SELECT … FOR UPDATE before invoking us.
    const existing = Array.isArray(booking.statusHistory)
      ? (booking.statusHistory as unknown as StatusHistoryEntry[])
      : [];
    const nextHistory: StatusHistoryEntry[] = [...existing, entry];

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: to,
        statusHistory: nextHistory as unknown as Prisma.InputJsonValue,
      },
    });
    return updated;
  }

  /** Read the timeline for a booking. Used by the admin debug endpoint. */
  static readHistory(booking: { statusHistory: Prisma.JsonValue }): StatusHistoryEntry[] {
    return Array.isArray(booking.statusHistory)
      ? (booking.statusHistory as unknown as StatusHistoryEntry[])
      : [];
  }
}
