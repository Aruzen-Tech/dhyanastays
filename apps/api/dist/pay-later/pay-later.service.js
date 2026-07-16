"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PayLaterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayLaterService = exports.PAY_LATER_GRACE_HOURS = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const ledger_service_1 = require("../common/services/ledger.service");
const notification_service_1 = require("../notification/notification.service");
const create_plan_dto_1 = require("./dto/create-plan.dto");
exports.PAY_LATER_GRACE_HOURS = 7 * 24;
const PAY_LATER_BUFFER_HOURS = 24;
let PayLaterService = PayLaterService_1 = class PayLaterService {
    constructor(prisma, auditService, ledgerService, notificationService) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.ledgerService = ledgerService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(PayLaterService_1.name);
    }
    static splitAmount(totalMinor, months) {
        if (totalMinor <= 0)
            throw new Error('totalMinor must be positive');
        if (months <= 0)
            throw new Error('months must be positive');
        const base = Math.floor(totalMinor / months);
        const remainder = totalMinor - base * months;
        const parts = [];
        for (let i = 0; i < months; i++) {
            parts.push(base + (i < remainder ? 1 : 0));
        }
        return parts;
    }
    static buildSchedule(totalMinor, months, startFrom = new Date()) {
        const amounts = PayLaterService_1.splitAmount(totalMinor, months);
        return amounts.map((amountMinor, i) => {
            const dueAt = new Date(startFrom);
            dueAt.setUTCMonth(dueAt.getUTCMonth() + i);
            return { seq: i + 1, amountMinor, dueAt };
        });
    }
    static assertScheduleFitsCheckIn(schedule, checkInAt) {
        const last = schedule[schedule.length - 1];
        const cutoff = new Date(last.dueAt.getTime() + PAY_LATER_BUFFER_HOURS * 60 * 60 * 1000);
        if (checkInAt < cutoff) {
            throw new common_1.BadRequestException('Check-in must be after the final instalment due date plus 24h buffer');
        }
    }
    async createPlanFromFirstCapture(tx, booking, months, totalMinor, firstPaymentId, firstAmountMinor) {
        if (!create_plan_dto_1.PAY_LATER_MONTH_OPTIONS.includes(months)) {
            throw new common_1.BadRequestException('Invalid Pay Later months');
        }
        const schedule = PayLaterService_1.buildSchedule(totalMinor, months);
        PayLaterService_1.assertScheduleFitsCheckIn(schedule, booking.startsAt);
        if (schedule[0].amountMinor !== firstAmountMinor) {
            throw new common_1.BadRequestException(`First instalment amount mismatch: expected ${schedule[0].amountMinor}, got ${firstAmountMinor}`);
        }
        const plan = await tx.payLaterPlan.create({
            data: {
                bookingId: booking.id,
                months,
                totalMinor,
                status: client_1.PayLaterStatus.SCHEDULED,
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
        await this.auditService.log(null, 'PAY_LATER_PLAN_CREATED', 'pay_later_plan', plan.id, { bookingId: booking.id, months, totalMinor, firstPaymentId }, tx);
    }
    async getPlanForBooking(bookingId, guestId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { guestId: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== guestId)
            throw new common_1.ForbiddenException('Access denied');
        const plan = await this.prisma.payLaterPlan.findUnique({
            where: { bookingId },
            include: {
                instalments: { orderBy: { seq: 'asc' } },
            },
        });
        if (!plan)
            throw new common_1.NotFoundException('No Pay Later plan for booking');
        return plan;
    }
    async getNextDueInstalment(bookingId) {
        const plan = await this.prisma.payLaterPlan.findUnique({
            where: { bookingId },
            select: { id: true },
        });
        if (!plan)
            return null;
        return this.prisma.payLaterInstalment.findFirst({
            where: { planId: plan.id, paidAt: null },
            orderBy: { seq: 'asc' },
        });
    }
    async recordInstalmentCapture(tx, bookingId, seq, paymentId, amountMinor) {
        const plan = await tx.payLaterPlan.findUnique({
            where: { bookingId },
            include: { instalments: true },
        });
        if (!plan)
            throw new common_1.NotFoundException('Pay Later plan not found');
        const instalment = plan.instalments.find((i) => i.seq === seq);
        if (!instalment) {
            throw new common_1.BadRequestException(`Instalment seq ${seq} not found`);
        }
        if (instalment.paidAt) {
            this.logger.log(`Instalment ${plan.id}:${seq} already paid — skipping replay`);
            return { completed: plan.status === client_1.PayLaterStatus.COMPLETED };
        }
        if (instalment.amountMinor !== amountMinor) {
            throw new common_1.BadRequestException(`Instalment amount mismatch: expected ${instalment.amountMinor}, got ${amountMinor}`);
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
        const allPaid = plan.instalments.every((i) => i.id === instalment.id || i.paidAt !== null);
        let completed = false;
        if (allPaid) {
            await tx.payLaterPlan.update({
                where: { id: plan.id },
                data: { status: client_1.PayLaterStatus.COMPLETED },
            });
            completed = true;
        }
        else if (plan.status === client_1.PayLaterStatus.OVERDUE) {
            const stillOverdue = plan.instalments.some((i) => i.id !== instalment.id &&
                i.paidAt === null &&
                new Date(i.dueAt) < new Date());
            if (!stillOverdue) {
                await tx.payLaterPlan.update({
                    where: { id: plan.id },
                    data: { status: client_1.PayLaterStatus.SCHEDULED },
                });
            }
        }
        await this.auditService.log(null, 'PAY_LATER_INSTALMENT_CAPTURED', 'pay_later_instalment', instalment.id, {
            bookingId,
            planId: plan.id,
            seq,
            paymentId,
            amountMinor,
            planCompleted: completed,
        }, tx);
        return { completed };
    }
    async processOverdue(now = new Date()) {
        const graceCutoff = new Date(now.getTime() - exports.PAY_LATER_GRACE_HOURS * 60 * 60 * 1000);
        const scheduledPlans = await this.prisma.payLaterPlan.findMany({
            where: {
                status: client_1.PayLaterStatus.SCHEDULED,
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
                where: { id: { in: scheduledPlans.map((p) => p.id) } },
                data: { status: client_1.PayLaterStatus.OVERDUE },
            });
            await Promise.allSettled(scheduledPlans.map((p) => this.auditService.log(null, 'PAY_LATER_PLAN_OVERDUE', 'pay_later_plan', p.id, { bookingId: p.bookingId })));
        }
        const defaultCandidates = await this.prisma.payLaterPlan.findMany({
            where: {
                status: client_1.PayLaterStatus.OVERDUE,
                instalments: {
                    some: {
                        paidAt: null,
                        dueAt: { lt: graceCutoff },
                    },
                },
            },
            select: { id: true, bookingId: true },
        });
        const defaulted = [];
        for (const p of defaultCandidates) {
            await this.prisma.payLaterPlan.update({
                where: { id: p.id },
                data: { status: client_1.PayLaterStatus.DEFAULTED },
            });
            await this.auditService.log(null, 'PAY_LATER_PLAN_DEFAULTED', 'pay_later_plan', p.id, { bookingId: p.bookingId, graceCutoff: graceCutoff.toISOString() });
            defaulted.push({ planId: p.id, bookingId: p.bookingId });
        }
        return { markedOverdue: scheduledPlans.length, defaulted };
    }
    async sendDueReminders(now = new Date()) {
        const windowStart72 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const windowEnd72 = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        const windowStart24 = new Date(now.getTime());
        const windowEnd24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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
                plan: { status: { in: [client_1.PayLaterStatus.SCHEDULED, client_1.PayLaterStatus.OVERDUE] } },
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
                const hoursUntilDue = (new Date(inst.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60);
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
                    .catch(() => { });
                await this.prisma.payLaterInstalment.update({
                    where: { id: inst.id },
                    data: {
                        remindersSent: nextReminder,
                        lastReminderAt: now,
                    },
                });
                sent++;
            }
            catch (err) {
                this.logger.warn(`Failed to send reminder for instalment ${inst.id}: ${String(err)}`);
            }
        }
        return sent;
    }
    async cancelPlan(tx, bookingId) {
        const plan = await tx.payLaterPlan.findUnique({
            where: { bookingId },
            select: { id: true, status: true },
        });
        if (!plan)
            return;
        if (plan.status === client_1.PayLaterStatus.COMPLETED ||
            plan.status === client_1.PayLaterStatus.CANCELLED) {
            return;
        }
        await tx.payLaterPlan.update({
            where: { id: plan.id },
            data: { status: client_1.PayLaterStatus.CANCELLED },
        });
        await this.auditService.log(null, 'PAY_LATER_PLAN_CANCELLED', 'pay_later_plan', plan.id, { bookingId }, tx);
    }
};
exports.PayLaterService = PayLaterService;
exports.PayLaterService = PayLaterService = PayLaterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        ledger_service_1.LedgerService,
        notification_service_1.NotificationService])
], PayLaterService);
//# sourceMappingURL=pay-later.service.js.map