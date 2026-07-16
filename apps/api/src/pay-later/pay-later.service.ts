import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PayLaterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { NotificationService } from '../notification/notification.service';
import {
  PAY_LATER_MONTH_OPTIONS,
  PayLaterMonths,
} from './dto/create-plan.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

/** Grace period after which an OVERDUE plan becomes DEFAULTED (spec §5.6). */
export const PAY_LATER_GRACE_HOURS = 7 * 24;

/** Minimum buffer between last instalment due date and check-in. */
const PAY_LATER_BUFFER_HOURS = 24;

export interface InstalmentSchedule {
  seq: number;
  amountMinor: number;
  dueAt: Date;
}

/**
 * PayLaterService: creates plans, schedules instalments, records payments,
 * and drives status transitions (SCHEDULED → OVERDUE → DEFAULTED / COMPLETED).
 *
 * Ledger events: a single LedgerEvent of type PAYMENT_CAPTURED is written per
 * instalment capture so the credit ledger remains the source of truth.
 */
@Injectable()
export class PayLaterService {
  private readonly logger = new Logger(PayLaterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Split a total into N equal instalments (in paise), distributing the
   * rounding remainder to the earliest instalments so the sum is exact.
   */
  static splitAmount(totalMinor: number, months: number): number[] {
    if (totalMinor <= 0) throw new Error('totalMinor must be positive');
    if (months <= 0) throw new Error('months must be positive');

    const base = Math.floor(totalMinor / months);
    const remainder = totalMinor - base * months;
    const parts: number[] = [];
    for (let i = 0; i < months; i++) {
      parts.push(base + (i < remainder ? 1 : 0));
    }
    return parts;
  }

  /**
   * Build a schedule of N instalments. The first instalment is due immediately
   * (paid at booking time), subsequent ones at +30d, +60d, etc.
   */
  static buildSchedule(
    totalMinor: number,
    months: PayLaterMonths,
    startFrom: Date = new Date(),
  ): InstalmentSchedule[] {
    const amounts = PayLaterService.splitAmount(totalMinor, months);
    return amounts.map((amountMinor, i) => {
      const dueAt = new Date(startFrom);
      dueAt.setUTCMonth(dueAt.getUTCMonth() + i);
      return { seq: i + 1, amountMinor, dueAt };
    });
  }

  /**
   * Assert a Pay Later plan is feasible: check-in must be after the final
   * instalment due date plus a safety buffer. Prevents booking a retreat
   * before it's paid off.
   */
  static assertScheduleFitsCheckIn(
    schedule: InstalmentSchedule[],
    checkInAt: Date,
  ): void {
    const last = schedule[schedule.length - 1];
    const cutoff = new Date(
      last.dueAt.getTime() + PAY_LATER_BUFFER_HOURS * 60 * 60 * 1000,
    );
    if (checkInAt < cutoff) {
      throw new BadRequestException(
        'Check-in must be after the final instalment due date plus 24h buffer',
      );
    }
  }

  /**
   * Create a PayLaterPlan + instalments within the caller's transaction.
   * Called from BookingService when the first instalment captures for a
   * booking whose plan is PAY_LATER.
   *
   * The first instalment is marked paid and linked to the capturing payment.
   */
  async createPlanFromFirstCapture(
    tx: TxClient,
    booking: {
      id: string;
      startsAt: Date;
      priceSnapshot: unknown;
    },
    months: PayLaterMonths,
    totalMinor: number,
    firstPaymentId: string,
    firstAmountMinor: number,
  ): Promise<void> {
    if (!PAY_LATER_MONTH_OPTIONS.includes(months)) {
      throw new BadRequestException('Invalid Pay Later months');
    }

    const schedule = PayLaterService.buildSchedule(totalMinor, months);
    PayLaterService.assertScheduleFitsCheckIn(schedule, booking.startsAt);

    if (schedule[0].amountMinor !== firstAmountMinor) {
      // Guard: if the snapshot's first instalment doesn't match what was
      // captured, refuse to create the plan. This prevents under/over-payment.
      throw new BadRequestException(
        `First instalment amount mismatch: expected ${schedule[0].amountMinor}, got ${firstAmountMinor}`,
      );
    }

    const plan = await tx.payLaterPlan.create({
      data: {
        bookingId: booking.id,
        months,
        totalMinor,
        status: PayLaterStatus.SCHEDULED,
      },
    });

    await tx.payLaterInstalment.createMany({
      data: schedule.map((s) => ({
        planId: plan.id,
        seq: s.seq,
        amountMinor: s.amountMinor,
        dueAt: s.dueAt,
        paidAt: s.seq === 1 ? new Date() : null,
        paymentId: s.seq === 1 ? firstPaymentId : null,
      })),
    });

    await this.auditService.log(
      null,
      'PAY_LATER_PLAN_CREATED',
      'pay_later_plan',
      plan.id,
      { bookingId: booking.id, months, totalMinor, firstPaymentId },
      tx,
    );
  }

  /** Guest-facing schedule view for a booking. */
  async getPlanForBooking(bookingId: string, guestId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { guestId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId) throw new ForbiddenException('Access denied');

    const plan = await this.prisma.payLaterPlan.findUnique({
      where: { bookingId },
      include: {
        instalments: { orderBy: { seq: 'asc' } },
      },
    });
    if (!plan) throw new NotFoundException('No Pay Later plan for booking');

    return plan;
  }

  /**
   * Look up the next unpaid instalment for a booking. Returns null if fully
   * paid. Used by the client to know which seq to pay next.
   */
  async getNextDueInstalment(bookingId: string) {
    const plan = await this.prisma.payLaterPlan.findUnique({
      where: { bookingId },
      select: { id: true },
    });
    if (!plan) return null;

    return this.prisma.payLaterInstalment.findFirst({
      where: { planId: plan.id, paidAt: null },
      orderBy: { seq: 'asc' },
    });
  }

  /**
   * Record an instalment capture. Called from the Payment webhook after the
   * gateway confirms capture. Marks the instalment paid; if it was the last
   * one, marks the plan COMPLETED and the booking CONFIRMED_PAID.
   *
   * Idempotent: replaying the same paymentId is a no-op.
   */
  async recordInstalmentCapture(
    tx: TxClient,
    bookingId: string,
    seq: number,
    paymentId: string,
    amountMinor: number,
  ): Promise<{ completed: boolean }> {
    const plan = await tx.payLaterPlan.findUnique({
      where: { bookingId },
      include: { instalments: true },
    });
    if (!plan) throw new NotFoundException('Pay Later plan not found');

    const instalment = plan.instalments.find(
      (i: { seq: number }) => i.seq === seq,
    );
    if (!instalment) {
      throw new BadRequestException(`Instalment seq ${seq} not found`);
    }

    if (instalment.paidAt) {
      // Idempotent replay
      this.logger.log(
        `Instalment ${plan.id}:${seq} already paid — skipping replay`,
      );
      return { completed: plan.status === PayLaterStatus.COMPLETED };
    }

    if (instalment.amountMinor !== amountMinor) {
      throw new BadRequestException(
        `Instalment amount mismatch: expected ${instalment.amountMinor}, got ${amountMinor}`,
      );
    }

    await tx.payLaterInstalment.update({
      where: { id: instalment.id },
      data: { paidAt: new Date(), paymentId },
    });

    await this.ledgerService.record({
      type: 'PAYMENT_CAPTURED',
      amount: amountMinor,
      bookingId,
      metadata: {
        paymentId,
        source: 'pay_later_instalment',
        planId: plan.id,
        seq,
      },
      tx,
    });

    // Check if all instalments are now paid
    const allPaid = plan.instalments.every(
      (i: { id: string; paidAt: Date | null }) =>
        i.id === instalment.id || i.paidAt !== null,
    );

    let completed = false;
    if (allPaid) {
      await tx.payLaterPlan.update({
        where: { id: plan.id },
        data: { status: PayLaterStatus.COMPLETED },
      });
      completed = true;
    } else if (plan.status === PayLaterStatus.OVERDUE) {
      // If the plan was OVERDUE and this payment clears any overdue instalments,
      // reset to SCHEDULED when no instalments remain overdue.
      const stillOverdue = plan.instalments.some(
        (i: { id: string; paidAt: Date | null; dueAt: Date }) =>
          i.id !== instalment.id &&
          i.paidAt === null &&
          new Date(i.dueAt) < new Date(),
      );
      if (!stillOverdue) {
        await tx.payLaterPlan.update({
          where: { id: plan.id },
          data: { status: PayLaterStatus.SCHEDULED },
        });
      }
    }

    await this.auditService.log(
      null,
      'PAY_LATER_INSTALMENT_CAPTURED',
      'pay_later_instalment',
      instalment.id,
      {
        bookingId,
        planId: plan.id,
        seq,
        paymentId,
        amountMinor,
        planCompleted: completed,
      },
      tx,
    );

    return { completed };
  }

  /**
   * Hourly dunning sweep.
   *
   * 1. SCHEDULED plans with a past-due unpaid instalment → OVERDUE.
   * 2. OVERDUE plans whose earliest unpaid dueAt is older than the grace
   *    period → DEFAULTED (booking cancellation is the caller's job).
   *
   * Returns { markedOverdue, defaulted[] } for the caller/logs.
   */
  async processOverdue(now: Date = new Date()): Promise<{
    markedOverdue: number;
    defaulted: { planId: string; bookingId: string }[];
  }> {
    const graceCutoff = new Date(
      now.getTime() - PAY_LATER_GRACE_HOURS * 60 * 60 * 1000,
    );

    // --- 1. Mark SCHEDULED plans OVERDUE when any instalment is past due ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheduledPlans = await (this.prisma as any).payLaterPlan.findMany({
      where: {
        status: PayLaterStatus.SCHEDULED,
        instalments: {
          some: {
            paidAt: null,
            dueAt: { lt: now },
          },
        },
      },
      select: { id: true, bookingId: true },
    });

    if (scheduledPlans.length > 0) {
      await this.prisma.payLaterPlan.updateMany({
        where: { id: { in: scheduledPlans.map((p: { id: string }) => p.id) } },
        data: { status: PayLaterStatus.OVERDUE },
      });
      await Promise.allSettled(
        scheduledPlans.map((p: { id: string; bookingId: string }) =>
          this.auditService.log(
            null,
            'PAY_LATER_PLAN_OVERDUE',
            'pay_later_plan',
            p.id,
            { bookingId: p.bookingId },
          ),
        ),
      );
    }

    // --- 2. Mark OVERDUE plans DEFAULTED if past grace period ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultCandidates = await (this.prisma as any).payLaterPlan.findMany({
      where: {
        status: PayLaterStatus.OVERDUE,
        instalments: {
          some: {
            paidAt: null,
            dueAt: { lt: graceCutoff },
          },
        },
      },
      select: { id: true, bookingId: true },
    });

    const defaulted: { planId: string; bookingId: string }[] = [];
    for (const p of defaultCandidates) {
      await this.prisma.payLaterPlan.update({
        where: { id: p.id },
        data: { status: PayLaterStatus.DEFAULTED },
      });
      await this.auditService.log(
        null,
        'PAY_LATER_PLAN_DEFAULTED',
        'pay_later_plan',
        p.id,
        { bookingId: p.bookingId, graceCutoff: graceCutoff.toISOString() },
      );
      defaulted.push({ planId: p.id, bookingId: p.bookingId });
    }

    return { markedOverdue: scheduledPlans.length, defaulted };
  }

  /**
   * Send reminder emails for instalments due in 72h or 24h. Dedupes via
   * remindersSent counter so each threshold fires at most once per instalment.
   */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const windowStart72 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const windowEnd72 = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const windowStart24 = new Date(now.getTime());
    const windowEnd24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find unpaid instalments whose dueAt falls in either window and haven't
    // already received the corresponding reminder.
    const candidates = await this.prisma.payLaterInstalment.findMany({
      where: {
        paidAt: null,
        OR: [
          {
            dueAt: { gte: windowStart72, lte: windowEnd72 },
            remindersSent: { lt: 1 },
          },
          {
            dueAt: { gte: windowStart24, lte: windowEnd24 },
            remindersSent: { lt: 2 },
          },
        ],
        plan: { status: { in: [PayLaterStatus.SCHEDULED, PayLaterStatus.OVERDUE] } },
      },
      include: {
        plan: {
          include: {
            booking: {
              select: {
                id: true,
                guestId: true,
                listing: { select: { title: true } },
                guest: { select: { email: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    let sent = 0;
    for (const inst of candidates) {
      const nextReminder = inst.remindersSent + 1;
      try {
        const booking = inst.plan.booking;
        const listingTitle = booking.listing?.title ?? 'your stay';
        const hoursUntilDue =
          (new Date(inst.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60);
        await this.notificationService.sendPayLaterReminder({
          guestName: booking.guest.fullName,
          guestEmail: booking.guest.email,
          bookingId: booking.id,
          listingTitle,
          seq: inst.seq,
          amountMinor: inst.amountMinor,
          dueAt: new Date(inst.dueAt).toLocaleDateString('en-IN'),
          hoursUntilDue: Math.round(hoursUntilDue),
        });
        await this.prisma.guestNotification
          .create({
            data: {
              userId: booking.guestId,
              type: 'PAY_LATER_DUE',
              title: `Instalment due in ~${Math.round(hoursUntilDue)}h`,
              message: `Instalment ${inst.seq} for ${listingTitle} (₹${(inst.amountMinor / 100).toLocaleString('en-IN')}) is due soon.`,
              metadata: {
                bookingId: booking.id,
                seq: inst.seq,
                amountMinor: inst.amountMinor,
              },
            },
          })
          .catch(() => {});

        await this.prisma.payLaterInstalment.update({
          where: { id: inst.id },
          data: {
            remindersSent: nextReminder,
            lastReminderAt: now,
          },
        });
        sent++;
      } catch (err) {
        this.logger.warn(
          `Failed to send reminder for instalment ${inst.id}: ${String(err)}`,
        );
      }
    }
    return sent;
  }

  /**
   * Cancel an active plan (called when its booking is cancelled). Leaves
   * already-paid instalments untouched — refunds are driven by the existing
   * cancellation engine via PricingService.computeRefundAmount.
   */
  async cancelPlan(tx: TxClient, bookingId: string): Promise<void> {
    const plan = await tx.payLaterPlan.findUnique({
      where: { bookingId },
      select: { id: true, status: true },
    });
    if (!plan) return;
    if (
      plan.status === PayLaterStatus.COMPLETED ||
      plan.status === PayLaterStatus.CANCELLED
    ) {
      return;
    }
    await tx.payLaterPlan.update({
      where: { id: plan.id },
      data: { status: PayLaterStatus.CANCELLED },
    });
    await this.auditService.log(
      null,
      'PAY_LATER_PLAN_CANCELLED',
      'pay_later_plan',
      plan.id,
      { bookingId },
      tx,
    );
  }
}
