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
const outbox_service_1 = require("../notification/outbox.service");
const referral_service_1 = require("../referral/referral.service");
const add_on_service_1 = require("../add-on/add-on.service");
const membership_service_1 = require("../membership/membership.service");
const pay_later_service_1 = require("../pay-later/pay-later.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const state_machine_1 = require("./state-machine");
const price_snapshot_signer_service_1 = require("../common/services/price-snapshot-signer.service");
const confirm_payment_exceptions_1 = require("./confirm-payment.exceptions");
const common_2 = require("@nestjs/common");
const BALANCE_DUE_HOURS_BEFORE_CHECKIN = 48;
let BookingService = class BookingService {
    constructor(prisma, pricingService, auditService, ledgerService, notificationService, outboxService, referralService, addOnService, membershipService, payLaterService, stateMachine, snapshotSigner) {
        this.prisma = prisma;
        this.pricingService = pricingService;
        this.auditService = auditService;
        this.ledgerService = ledgerService;
        this.notificationService = notificationService;
        this.outboxService = outboxService;
        this.referralService = referralService;
        this.addOnService = addOnService;
        this.membershipService = membershipService;
        this.payLaterService = payLaterService;
        this.stateMachine = stateMachine;
        this.snapshotSigner = snapshotSigner;
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
            if (dto.plan === create_booking_dto_1.PaymentPlanDto.PAY_LATER) {
                if (!dto.payLaterMonths) {
                    throw new common_1.BadRequestException('payLaterMonths is required for PAY_LATER plan');
                }
                const schedule = pay_later_service_1.PayLaterService.buildSchedule(snapshot.total, dto.payLaterMonths);
                pay_later_service_1.PayLaterService.assertScheduleFitsCheckIn(schedule, new Date(hold.startsAt));
            }
            const created = await tx.booking.create({
                data: {
                    listingId: hold.listingId,
                    guestId,
                    holdId: hold.id,
                    status: 'PAYMENT_PENDING',
                    plan: dto.plan,
                    startsAt: hold.startsAt,
                    endsAt: hold.endsAt,
                    priceSnapshot: snapshot,
                    guestDetails: dto.guestDetails,
                    balanceDueAt,
                    payLaterMonths: dto.plan === create_booking_dto_1.PaymentPlanDto.PAY_LATER
                        ? dto.payLaterMonths
                        : null,
                    acceptedTermsAt: new Date(dto.acceptedTermsAt),
                },
            });
            const snapshotAddOns = (snapshot.addOns ?? []);
            if (snapshotAddOns.length > 0) {
                await this.addOnService.createBookingAddOns(tx, created.id, snapshotAddOns, snapshot.hmac ?? '');
            }
            return created;
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
    async getHostBookings(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            throw new common_1.ForbiddenException('Host profile not found');
        return this.prisma.booking.findMany({
            where: {
                listing: { hostId: host.id },
            },
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
                    select: {
                        id: true, title: true, city: true, state: true, country: true,
                        host: { select: { userId: true, user: { select: { fullName: true } } } },
                    },
                },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (requesterRole === 'ADMIN')
            return booking;
        if (booking.guestId === requesterId)
            return booking;
        if (requesterRole === 'HOST') {
            const host = await this.prisma.host.findUnique({ where: { userId: requesterId } });
            if (host) {
                const listing = await this.prisma.listing.findFirst({
                    where: { id: booking.listingId, hostId: host.id },
                });
                if (listing)
                    return booking;
            }
        }
        throw new common_1.ForbiddenException('Access denied');
    }
    async getAllBookings(page = 1, limit = 50, status, search) {
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { listing: { title: { contains: search, mode: 'insensitive' } } },
                { guest: { fullName: { contains: search, mode: 'insensitive' } } },
                { guest: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const skip = (page - 1) * limit;
        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    listing: { select: { id: true, title: true, city: true, state: true } },
                    guest: { select: { fullName: true, email: true } },
                    payments: { select: { id: true, amount: true, status: true, type: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.booking.count({ where }),
        ]);
        return { bookings, total, page, limit };
    }
    async confirmPayment(tx, bookingId, paymentId, amountCaptured) {
        await tx.$queryRaw `SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const alreadyConfirmed = [
            'CONFIRMED_DEPOSIT',
            'CONFIRMED_PAID',
            'BALANCE_DUE',
            'COMPLETED',
        ];
        if (alreadyConfirmed.includes(booking.status)) {
            return { booking: booking, didConfirm: false };
        }
        if (booking.status !== 'PAYMENT_PENDING') {
            throw new common_2.ConflictException(`Cannot confirm booking in status ${booking.status}`);
        }
        const snapshot = booking.priceSnapshot;
        if (snapshot.hmac) {
            const { hmac, ...withoutHmac } = snapshot;
            if (!this.snapshotSigner.verify(withoutHmac, hmac)) {
                throw new confirm_payment_exceptions_1.TamperedSnapshotException(bookingId);
            }
        }
        const expected = this.computeExpectedFirstCapturePaise(booking, snapshot);
        if (expected !== null && amountCaptured !== expected) {
            throw new confirm_payment_exceptions_1.AmountMismatchException(amountCaptured, expected, bookingId, paymentId);
        }
        const conflicts = await tx.$queryRaw `
      SELECT id FROM "Booking"
      WHERE "listingId" = ${booking.listingId}
        AND id <> ${bookingId}
        AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
        AND tsrange("startsAt","endsAt",'[)') && tsrange(
              (${booking.startsAt}::timestamptz AT TIME ZONE 'UTC'),
              (${booking.endsAt}::timestamptz AT TIME ZONE 'UTC'),
              '[)')
    `;
        if (conflicts.length > 0) {
            throw new common_2.ConflictException('Dates no longer available');
        }
        if (booking.plan === 'PAY_LATER') {
            if (!booking.payLaterMonths) {
                throw new common_1.BadRequestException('PAY_LATER booking missing payLaterMonths');
            }
            await this.payLaterService.createPlanFromFirstCapture(tx, {
                id: booking.id,
                startsAt: booking.startsAt,
                priceSnapshot: booking.priceSnapshot,
            }, booking.payLaterMonths, snapshot.total, paymentId, amountCaptured);
        }
        const event = booking.plan === 'FULL'
            ? 'PAYMENT_CONFIRMED_FULL'
            : booking.plan === 'PAY_LATER'
                ? 'PAY_LATER_FIRST_CAPTURED'
                : 'PAYMENT_CONFIRMED_DEPOSIT';
        const updated = await this.stateMachine.transition(tx, booking, event, {
            actorId: 'system:razorpay',
            metadata: { paymentId, amountCapturedPaise: amountCaptured },
        });
        if (!booking.cancellationPolicySnapshot) {
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    cancellationPolicySnapshot: pricing_service_1.PricingService.buildPolicySnapshot(),
                },
            });
        }
        await this.ledgerService.record({
            type: 'PAYMENT_CAPTURED',
            amount: amountCaptured,
            bookingId,
            metadata: { paymentId, nextStatus: updated.status },
            tx,
        });
        await this.auditService.log(null, 'BOOKING_PAYMENT_CONFIRMED', 'booking', bookingId, { paymentId, amountCaptured, nextStatus: updated.status }, tx);
        const listing = await tx.listing.findUnique({
            where: { id: booking.listingId },
            select: { hostId: true },
        });
        if (listing) {
            const accommodationTotal = (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
            const hostShare = snapshot.total > 0
                ? Math.round((accommodationTotal * amountCaptured) / snapshot.total)
                : 0;
            if (hostShare > 0) {
                const eligibleAt = new Date(new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000);
                await tx.payoutLine.create({
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
        }
        return { booking: updated, didConfirm: true };
    }
    async settleBalance(tx, bookingId, paymentId, amountCaptured) {
        await tx.$queryRaw `SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const alreadySettled = ['CONFIRMED_PAID', 'COMPLETED', 'REFUNDED'];
        if (alreadySettled.includes(booking.status)) {
            return { booking: booking, didSettle: false };
        }
        if (!['CONFIRMED_DEPOSIT', 'BALANCE_DUE'].includes(booking.status)) {
            throw new common_2.ConflictException(`Cannot settle balance in status ${booking.status}`);
        }
        const snapshot = booking.priceSnapshot;
        if (snapshot.hmac) {
            const { hmac, ...withoutHmac } = snapshot;
            if (!this.snapshotSigner.verify(withoutHmac, hmac)) {
                throw new confirm_payment_exceptions_1.TamperedSnapshotException(bookingId);
            }
        }
        const expected = snapshot.balanceAmount;
        if (expected != null && amountCaptured !== expected) {
            throw new confirm_payment_exceptions_1.AmountMismatchException(amountCaptured, expected, bookingId, paymentId);
        }
        const updated = await this.stateMachine.transition(tx, booking, 'BALANCE_PAID', {
            actorId: 'system:razorpay',
            metadata: { paymentId, amountCapturedPaise: amountCaptured, kind: 'balance' },
        });
        await this.ledgerService.record({
            type: 'PAYMENT_CAPTURED',
            amount: amountCaptured,
            bookingId,
            metadata: { paymentId, nextStatus: updated.status, kind: 'balance' },
            tx,
        });
        await this.auditService.log(null, 'BOOKING_BALANCE_SETTLED', 'booking', bookingId, { paymentId, amountCaptured, nextStatus: updated.status }, tx);
        const listing = await tx.listing.findUnique({
            where: { id: booking.listingId },
            select: { hostId: true },
        });
        if (listing) {
            const accommodationTotal = (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
            const hostShare = snapshot.total > 0
                ? Math.round((accommodationTotal * amountCaptured) / snapshot.total)
                : 0;
            if (hostShare > 0) {
                const eligibleAt = new Date(new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000);
                await tx.payoutLine.create({
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
        }
        return { booking: updated, didSettle: true };
    }
    computeExpectedFirstCapturePaise(booking, snapshot) {
        if (booking.plan === 'FULL')
            return snapshot.total;
        if (booking.plan === 'DEPOSIT_50')
            return snapshot.depositAmount;
        if (booking.plan === 'PAY_LATER') {
            const months = booking.payLaterMonths;
            const first = snapshot.payLaterFirstInstalment?.find((i) => i.months === months);
            return first?.amountMinor ?? null;
        }
        return null;
    }
    async sendBookingConfirmedNotificationPublic(bookingId) {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                select: {
                    plan: true,
                    startsAt: true,
                    endsAt: true,
                    priceSnapshot: true,
                    listingId: true,
                    guestId: true,
                },
            });
            if (!booking)
                return;
            await this.sendBookingConfirmedNotification(bookingId, booking);
        }
        catch {
        }
    }
    async sendBookingConfirmedNotification(bookingId, booking) {
        try {
            const [guest, listing] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { id: booking.guestId },
                    select: { fullName: true, email: true, phone: true },
                }),
                this.prisma.listing.findUnique({
                    where: { id: booking.listingId },
                    select: { title: true, city: true, state: true, country: true, host: { select: { id: true, user: { select: { fullName: true, email: true } } } } },
                }),
            ]);
            if (!guest || !listing)
                return;
            const snapshot = booking.priceSnapshot;
            const checkIn = new Date(booking.startsAt).toLocaleDateString('en-IN');
            const checkOut = new Date(booking.endsAt).toLocaleDateString('en-IN');
            const locationDescription = [listing.city, listing.state, listing.country]
                .filter(Boolean)
                .join(', ');
            const guestPayload = {
                guestName: guest.fullName,
                guestEmail: guest.email,
                guestPhone: guest.phone ?? undefined,
                bookingId,
                listingTitle: listing.title,
                checkIn,
                checkOut,
                checkInISO: new Date(booking.startsAt).toISOString(),
                checkOutISO: new Date(booking.endsAt).toISOString(),
                locationDescription,
                totalAmount: snapshot.total,
                plan: booking.plan,
                depositAmount: snapshot.depositAmount,
            };
            const emailSlot = this.notificationService.buildBookingConfirmedEmail(guestPayload);
            await this.outboxService.enqueue({
                userId: booking.guestId,
                kind: 'booking.confirmed',
                channels: ['EMAIL'],
                payload: emailSlot,
            });
            const smsSlot = this.notificationService.buildBookingConfirmedSms(guestPayload);
            if (smsSlot) {
                await this.outboxService.enqueue({
                    userId: booking.guestId,
                    kind: 'booking.confirmed',
                    channels: ['SMS'],
                    payload: smsSlot,
                });
            }
            if (listing.host?.user) {
                await this.notificationService.sendHostNewBooking({
                    hostName: listing.host.user.fullName,
                    hostEmail: listing.host.user.email,
                    guestName: guest.fullName,
                    bookingId,
                    listingTitle: listing.title,
                    checkIn,
                    checkOut,
                    totalAmount: snapshot.total,
                    plan: booking.plan,
                });
            }
            const notifMeta = { bookingId, listingTitle: listing.title, checkIn, checkOut };
            await Promise.allSettled([
                this.prisma.guestNotification.create({
                    data: {
                        userId: booking.guestId,
                        type: 'BOOKING_CONFIRMED',
                        title: 'Booking confirmed',
                        message: `Your booking for ${listing.title} (${checkIn} – ${checkOut}) is confirmed.`,
                        metadata: notifMeta,
                    },
                }),
                listing.host ? this.prisma.hostNotification.create({
                    data: {
                        hostId: listing.host.id,
                        type: 'NEW_BOOKING',
                        title: 'New booking received',
                        message: `${guest.fullName} booked ${listing.title} (${checkIn} – ${checkOut}).`,
                        metadata: notifMeta,
                    },
                }) : Promise.resolve(),
                this.prisma.adminNotification.create({
                    data: {
                        type: 'NEW_BOOKING',
                        title: 'New booking',
                        message: `${guest.fullName} booked ${listing.title} for ${checkIn} – ${checkOut}. Total: ₹${(snapshot.total / 100).toLocaleString('en-IN')}.`,
                        metadata: notifMeta,
                    },
                }),
            ]);
        }
        catch {
        }
    }
    async transitionToBalanceDue() {
        const now = new Date();
        const due = await this.prisma.booking.findMany({
            where: {
                status: 'CONFIRMED_DEPOSIT',
                balanceDueAt: { lte: now },
            },
            select: { id: true },
            take: 200,
        });
        let count = 0;
        for (const { id } of due) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    const fresh = await tx.booking.findUnique({ where: { id } });
                    if (!fresh || fresh.status !== 'CONFIRMED_DEPOSIT')
                        return;
                    await this.stateMachine.transition(tx, fresh, 'BALANCE_DUE_TRIGGERED', { actorId: 'system:cron-balance-due' });
                    count++;
                });
            }
            catch (err) {
                console.warn(`Balance-due transition skipped for ${id}: ${err instanceof Error ? err.message : err}`);
            }
        }
        const result = { count };
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
            await this.cancelBookingInternal(booking.id, null, 'AUTO_CANCEL_UNPAID_BALANCE', 'Balance not paid within grace period', 'AUTO_CANCEL_UNPAID_BALANCE');
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
        const cancelEvent = requesterRole === 'ADMIN' ? 'ADMIN_CANCELLED' : 'GUEST_CANCELLED';
        const result = await this.cancelBookingInternal(bookingId, requesterId, 'BOOKING_CANCEL', dto.reason ?? 'Guest/Admin cancellation', cancelEvent);
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
                const listingTitle = booking.listing?.title ?? 'your stay';
                const balanceAmount = snapshot.balanceAmount ?? Math.ceil(snapshot.total / 2);
                const dueDate = booking.balanceDueAt
                    ? new Date(booking.balanceDueAt).toLocaleDateString('en-IN')
                    : 'soon';
                await this.notificationService.sendBalanceDueReminder({
                    guestName: guest.fullName,
                    guestEmail: guest.email,
                    bookingId: booking.id,
                    listingTitle,
                    balanceAmount,
                    dueDate,
                });
                await this.prisma.guestNotification.create({
                    data: {
                        userId: booking.guestId,
                        type: 'BALANCE_DUE',
                        title: 'Balance payment due',
                        message: `Your balance of ₹${(balanceAmount / 100).toLocaleString('en-IN')} for ${listingTitle} is due by ${dueDate}.`,
                        metadata: { bookingId: booking.id, listingTitle, balanceAmount, dueDate },
                    },
                }).catch(() => { });
            }
            catch {
            }
        }
    }
    async cancelDefaultedPayLater(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { status: true },
        });
        if (!booking)
            return;
        const cancellableStatuses = [
            'PAYMENT_PENDING',
            'CONFIRMED_DEPOSIT',
            'CONFIRMED_PAID',
            'BALANCE_DUE',
        ];
        if (!cancellableStatuses.includes(booking.status))
            return;
        await this.cancelBookingInternal(bookingId, null, 'AUTO_CANCEL_PAY_LATER_DEFAULT', 'Pay Later plan defaulted — grace period expired', 'AUTO_CANCEL_PAY_LATER_DEFAULT');
    }
    async cancelBookingInternal(bookingId, actorId, action, reason, smEvent) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payments: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const totalPaid = booking.payments
            .filter((p) => p.status === 'CAPTURED')
            .reduce((sum, p) => sum + p.amount, 0);
        const snapshot = booking.priceSnapshot;
        const addOnsTotal = snapshot.addOnsTotal ?? 0;
        const accommodationTotal = (snapshot.total ?? totalPaid) - addOnsTotal;
        const checkIn = new Date(booking.startsAt);
        const policySnapshot = booking
            .cancellationPolicySnapshot ?? null;
        const accommodationRefund = this.pricingService.computeRefundAmount(accommodationTotal, checkIn, new Date(), policySnapshot);
        const result = await this.prisma.$transaction(async (tx) => {
            if (booking.plan === 'PAY_LATER') {
                await this.payLaterService.cancelPlan(tx, bookingId);
            }
            const addOnRefund = await this.addOnService.cancelBookingAddOns(tx, bookingId, checkIn);
            const refundAmount = Math.min(accommodationRefund + addOnRefund, totalPaid);
            const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
            if (!fresh)
                throw new common_1.NotFoundException('Booking not found');
            const updated = await this.stateMachine.transition(tx, fresh, smEvent, {
                actorId,
                metadata: { reason, action, refundAmountPaise: refundAmount },
                refundAmountPaise: refundAmount,
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
                    metadata: { reason, action, accommodationRefund, addOnRefund },
                    tx,
                });
            }
            await this.auditService.log(actorId, action, 'booking', bookingId, { reason, refundAmount, accommodationRefund, addOnRefund, totalPaid }, tx);
            return { booking: updated, refundAmount };
        });
        void (async () => {
            try {
                const [guest, listing] = await Promise.all([
                    this.prisma.user.findUnique({
                        where: { id: booking.guestId },
                        select: { fullName: true, email: true },
                    }),
                    this.prisma.listing.findUnique({
                        where: { id: booking.listingId },
                        select: { title: true, host: { select: { id: true, user: { select: { fullName: true, email: true } } } } },
                    }),
                ]);
                const listingTitle = listing?.title ?? 'your stay';
                if (guest) {
                    await this.notificationService.sendBookingCancelled({
                        guestName: guest.fullName,
                        guestEmail: guest.email,
                        bookingId,
                        listingTitle,
                        refundAmount: result.refundAmount,
                    });
                }
                if (guest && listing?.host?.user) {
                    await this.notificationService.sendHostBookingCancelled({
                        hostName: listing.host.user.fullName,
                        hostEmail: listing.host.user.email,
                        guestName: guest.fullName,
                        bookingId,
                        listingTitle,
                        refundAmount: result.refundAmount,
                    });
                }
                const notifMeta = { bookingId, listingTitle, refundAmount: result.refundAmount };
                await Promise.allSettled([
                    this.prisma.guestNotification.create({
                        data: {
                            userId: booking.guestId,
                            type: 'BOOKING_CANCELLED',
                            title: 'Booking cancelled',
                            message: `Your booking for ${listingTitle} has been cancelled.${result.refundAmount > 0 ? ` Refund: ₹${(result.refundAmount / 100).toLocaleString('en-IN')}` : ''}`,
                            metadata: notifMeta,
                        },
                    }),
                    listing?.host ? this.prisma.hostNotification.create({
                        data: {
                            hostId: listing.host.id,
                            type: 'BOOKING_CANCELLED',
                            title: 'Booking cancelled',
                            message: `${guest?.fullName ?? 'A guest'}'s booking for ${listingTitle} has been cancelled.`,
                            metadata: notifMeta,
                        },
                    }) : Promise.resolve(),
                ]);
            }
            catch {
            }
        })();
        return result;
    }
    async autoCompleteCheckedOut() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const candidates = await this.prisma.booking.findMany({
            where: {
                status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'] },
                endsAt: { lt: cutoff },
            },
            select: { id: true },
            take: 100,
        });
        if (candidates.length === 0)
            return 0;
        let completed = 0;
        for (const b of candidates) {
            try {
                await this.completeBooking(b.id, 'SYSTEM_AUTO_COMPLETE');
                completed++;
            }
            catch (err) {
                console.warn(`Auto-complete skipped booking ${b.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (completed > 0) {
            await this.auditService.log(null, 'BOOKING_AUTO_COMPLETE_BATCH', 'booking', 'batch', { count: completed, examined: candidates.length, cutoff: cutoff.toISOString() });
        }
        return completed;
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
        const smEvent = actorId === 'SYSTEM_AUTO_COMPLETE' ? 'AUTO_COMPLETED' : 'STAY_COMPLETED';
        const updated = await this.prisma.$transaction(async (tx) => {
            const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
            if (!fresh)
                throw new common_1.NotFoundException('Booking not found');
            return this.stateMachine.transition(tx, fresh, smEvent, {
                actorId,
                metadata: { previousStatus: fresh.status },
            });
        });
        const isSystemActor = actorId === 'SYSTEM_AUTO_COMPLETE';
        await this.auditService.log(isSystemActor ? null : actorId, 'BOOKING_COMPLETE', 'booking', bookingId, {
            previousStatus: booking.status,
            ...(isSystemActor ? { systemActor: actorId } : {}),
        });
        const snapshot = booking.priceSnapshot;
        const accommodationPaise = (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
        const points = this.membershipService.pointsForPaise(accommodationPaise);
        if (points > 0) {
            await this.membershipService
                .awardPoints(booking.guestId, points)
                .catch(() => { });
        }
        void this.referralService.onReferredUserFirstBooking(booking.guestId).catch(() => { });
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
        notification_service_1.NotificationService,
        outbox_service_1.OutboxService,
        referral_service_1.ReferralService,
        add_on_service_1.AddOnService,
        membership_service_1.MembershipService,
        pay_later_service_1.PayLaterService,
        state_machine_1.BookingStateMachine,
        price_snapshot_signer_service_1.PriceSnapshotSignerService])
], BookingService);
//# sourceMappingURL=booking.service.js.map