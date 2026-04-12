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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_service_1 = require("../pricing/pricing.service");
const audit_service_1 = require("../common/services/audit.service");
const ledger_service_1 = require("../common/services/ledger.service");
const notification_service_1 = require("../notification/notification.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const BALANCE_DUE_HOURS_BEFORE_CHECKIN = 48;
let BookingService = class BookingService {
    constructor(prisma, pricingService, auditService, ledgerService, notificationService) {
        this.prisma = prisma;
        this.pricingService = pricingService;
        this.auditService = auditService;
        this.ledgerService = ledgerService;
        this.notificationService = notificationService;
    }
    async createBooking(guestId, dto) {
        const existingByHold = await this.prisma.booking.findUnique({
            where: { holdId: dto.holdId },
        });
        if (existingByHold) {
            if (existingByHold.guestId !== guestId) {
                throw new common_1.ForbiddenException('Hold belongs to another user');
            }
            return existingByHold;
        }
        const booking = await this.prisma.$transaction(async (tx) => {
            const hold = await tx.hold.findUnique({
                where: { id: dto.holdId },
            });
            if (!hold) {
                throw new common_1.NotFoundException('Hold not found');
            }
            if (hold.guestId !== guestId) {
                throw new common_1.ForbiddenException('Hold belongs to another user');
            }
            if (new Date(hold.expiresAt) < new Date()) {
                throw new common_1.BadRequestException('Hold has expired. Please create a new hold.');
            }
            const snapshot = hold.priceSnapshot;
            const balanceDueAt = dto.plan === create_booking_dto_1.PaymentPlanDto.DEPOSIT_50
                ? new Date(new Date(hold.startsAt).getTime() -
                    BALANCE_DUE_HOURS_BEFORE_CHECKIN * 60 * 60 * 1000)
                : null;
            return tx.booking.create({
                data: {
                    listingId: hold.listingId,
                    guestId,
                    holdId: hold.id,
                    status: 'PAYMENT_PENDING',
                    plan: dto.plan,
                    startsAt: hold.startsAt,
                    endsAt: hold.endsAt,
                    priceSnapshot: snapshot,
                    balanceDueAt,
                },
            });
        });
        await this.auditService.log(guestId, 'BOOKING_CREATE', 'booking', booking.id, {
            holdId: dto.holdId,
            plan: dto.plan,
            status: 'PAYMENT_PENDING',
        });
        return booking;
    }
    async getMyBookings(guestId) {
        return this.prisma.booking.findMany({
            where: { guestId },
            include: {
                payments: true,
                listing: {
                    select: { id: true, title: true, city: true, state: true, country: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getBookingById(bookingId, requesterId, requesterRole) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                payments: true,
                refunds: true,
                listing: {
                    select: { id: true, title: true, city: true, state: true, country: true },
                },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (requesterRole !== 'ADMIN' && booking.guestId !== requesterId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return booking;
    }
    async getAllBookings(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                skip,
                take: limit,
                include: {
                    listing: { select: { id: true, title: true, city: true, state: true } },
                    payments: { select: { id: true, amount: true, status: true, type: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.booking.count(),
        ]);
        return { bookings, total, page, limit };
    }
    async confirmPayment(bookingId, paymentId, amountCaptured, tx) {
        const client = tx ?? this.prisma;
        const booking = await client.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const snapshot = booking.priceSnapshot;
        let nextStatus;
        if (booking.plan === 'FULL') {
            nextStatus = 'CONFIRMED_PAID';
        }
        else {
            if (amountCaptured >= snapshot.total) {
                nextStatus = 'CONFIRMED_PAID';
            }
            else {
                nextStatus = 'CONFIRMED_DEPOSIT';
            }
        }
        const updated = await client.booking.update({
            where: { id: bookingId },
            data: { status: nextStatus },
        });
        await this.ledgerService.record({
            type: 'PAYMENT_CAPTURED',
            amount: amountCaptured,
            bookingId,
            metadata: { paymentId, nextStatus },
            tx: client,
        });
        await this.auditService.log(null, 'BOOKING_PAYMENT_CONFIRMED', 'booking', bookingId, { paymentId, amountCaptured, nextStatus }, client);
        const eligibleAt = new Date(new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000);
        const listing = await client.listing.findUnique({
            where: { id: booking.listingId },
            select: { hostId: true },
        });
        if (listing) {
            const hostShare = Math.round(amountCaptured * 0.9);
            await client.payoutLine.create({
                data: {
                    hostId: listing.hostId,
                    listingId: booking.listingId,
                    bookingId,
                    amount: hostShare,
                    eligibleAt,
                    status: 'NOT_ELIGIBLE',
                },
            });
        }
        void this.sendBookingConfirmedNotification(bookingId, updated);
        return updated;
    }
    async sendBookingConfirmedNotification(bookingId, booking) {
        try {
            const [guest, listing] = await Promise.all([
                this.prisma.user.findUnique({ where: { id: booking.guestId }, select: { fullName: true, email: true } }),
                this.prisma.listing.findUnique({ where: { id: booking.listingId }, select: { title: true } }),
            ]);
            if (!guest || !listing)
                return;
            const snapshot = booking.priceSnapshot;
            await this.notificationService.sendBookingConfirmed({
                guestName: guest.fullName,
                guestEmail: guest.email,
                bookingId,
                listingTitle: listing.title,
                checkIn: new Date(booking.startsAt).toLocaleDateString('en-IN'),
                checkOut: new Date(booking.endsAt).toLocaleDateString('en-IN'),
                totalAmount: snapshot.total,
                plan: booking.plan,
                depositAmount: snapshot.depositAmount,
            });
        }
        catch {
        }
    }
    async transitionToBalanceDue() {
        const now = new Date();
        const result = await this.prisma.booking.updateMany({
            where: {
                status: 'CONFIRMED_DEPOSIT',
                balanceDueAt: { lte: now },
            },
            data: { status: 'BALANCE_DUE' },
        });
        if (result.count > 0) {
            await this.auditService.log(null, 'BOOKING_BALANCE_DUE_TRANSITION', 'booking', 'batch', { count: result.count, at: now.toISOString() });
        }
        return result.count;
    }
    async autoCancelUnpaidBalance() {
        const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const overdue = await this.prisma.booking.findMany({
            where: {
                status: 'BALANCE_DUE',
                balanceDueAt: { lt: graceCutoff },
            },
            include: { payments: true },
        });
        let cancelled = 0;
        for (const booking of overdue) {
            await this.cancelBookingInternal(booking.id, null, 'AUTO_CANCEL_UNPAID_BALANCE', 'Balance not paid within grace period');
            cancelled++;
        }
        return cancelled;
    }
    async cancelBooking(bookingId, requesterId, requesterRole, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payments: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (requesterRole !== 'ADMIN' && booking.guestId !== requesterId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const cancellableStatuses = [
            'PAYMENT_PENDING',
            'CONFIRMED_DEPOSIT',
            'CONFIRMED_PAID',
            'BALANCE_DUE',
        ];
        if (!cancellableStatuses.includes(booking.status)) {
            throw new common_1.BadRequestException(`Cannot cancel booking in status: ${booking.status}`);
        }
        const result = await this.cancelBookingInternal(bookingId, requesterId, 'BOOKING_CANCEL', dto.reason ?? 'Guest/Admin cancellation');
        return result.booking;
    }
    async sendBalanceDueReminders() {
        const bookings = await this.prisma.booking.findMany({
            where: { status: 'BALANCE_DUE' },
            include: { listing: { select: { title: true } } },
        });
        for (const booking of bookings) {
            try {
                const guest = await this.prisma.user.findUnique({
                    where: { id: booking.guestId },
                    select: { fullName: true, email: true },
                });
                if (!guest)
                    continue;
                const snapshot = booking.priceSnapshot;
                await this.notificationService.sendBalanceDueReminder({
                    guestName: guest.fullName,
                    guestEmail: guest.email,
                    bookingId: booking.id,
                    listingTitle: booking.listing?.title ?? 'your stay',
                    balanceAmount: snapshot.balanceAmount ?? Math.ceil(snapshot.total / 2),
                    dueDate: booking.balanceDueAt
                        ? new Date(booking.balanceDueAt).toLocaleDateString('en-IN')
                        : 'soon',
                });
            }
            catch {
            }
        }
    }
    async cancelBookingInternal(bookingId, actorId, action, reason) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payments: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const totalPaid = booking.payments
            .filter((p) => p.status === 'CAPTURED')
            .reduce((sum, p) => sum + p.amount, 0);
        const refundAmount = this.pricingService.computeRefundAmount(totalPaid, new Date(booking.startsAt));
        const result = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: { status: refundAmount > 0 ? 'REFUNDED' : 'CANCELLED' },
            });
            if (refundAmount > 0) {
                await tx.refund.create({
                    data: {
                        bookingId,
                        amount: refundAmount,
                        reason,
                    },
                });
                await this.ledgerService.record({
                    type: 'REFUND_ISSUED',
                    amount: refundAmount,
                    bookingId,
                    metadata: { reason, action },
                    tx,
                });
            }
            await this.auditService.log(actorId, action, 'booking', bookingId, { reason, refundAmount, totalPaid }, tx);
            return { booking: updated, refundAmount };
        });
        void (async () => {
            try {
                const guest = await this.prisma.user.findUnique({
                    where: { id: booking.guestId },
                    select: { fullName: true, email: true },
                });
                if (guest) {
                    await this.notificationService.sendBookingCancelled({
                        guestName: guest.fullName,
                        guestEmail: guest.email,
                        bookingId,
                        listingTitle: booking.listing?.title ?? 'your stay',
                        refundAmount: result.refundAmount,
                    });
                }
            }
            catch {
            }
        })();
        return result;
    }
    async completeBooking(bookingId, actorId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (!['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
            throw new common_1.BadRequestException(`Cannot complete booking in status: ${booking.status}`);
        }
        const updated = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'COMPLETED' },
        });
        await this.auditService.log(actorId, 'BOOKING_COMPLETE', 'booking', bookingId, {
            previousStatus: booking.status,
        });
        return updated;
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricing_service_1.PricingService,
        audit_service_1.AuditService,
        ledger_service_1.LedgerService,
        notification_service_1.NotificationService])
], BookingService);
//# sourceMappingURL=booking.service.js.map