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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const booking_service_1 = require("../booking/booking.service");
const audit_service_1 = require("../common/services/audit.service");
const price_snapshot_signer_service_1 = require("../common/services/price-snapshot-signer.service");
const razorpay_service_1 = require("./razorpay.service");
const init_payment_dto_1 = require("./dto/init-payment.dto");
const pay_later_service_1 = require("../pay-later/pay-later.service");
const state_machine_1 = require("../booking/state-machine");
const serializable_retry_1 = require("../common/services/serializable-retry");
let PaymentService = PaymentService_1 = class PaymentService {
    constructor(prisma, bookingService, auditService, razorpay, snapshotSigner, payLaterService, stateMachine) {
        this.prisma = prisma;
        this.bookingService = bookingService;
        this.auditService = auditService;
        this.razorpay = razorpay;
        this.snapshotSigner = snapshotSigner;
        this.payLaterService = payLaterService;
        this.stateMachine = stateMachine;
        this.logger = new common_1.Logger(PaymentService_1.name);
    }
    async initPayment(guestId, dto) {
        const existing = await this.prisma.payment.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
            if (existing.bookingId !== dto.bookingId) {
                throw new common_1.BadRequestException('Idempotency key already used for a different booking');
            }
            return existing;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== guestId)
            throw new common_1.ForbiddenException('Access denied');
        const snapshot = booking.priceSnapshot;
        if (snapshot.hmac) {
            const { hmac, ...snapshotWithoutHmac } = snapshot;
            if (!this.snapshotSigner.verify(snapshotWithoutHmac, hmac)) {
                throw new common_1.BadRequestException('Price snapshot tampered — payment rejected');
            }
        }
        if (dto.type !== init_payment_dto_1.PaymentTypeDto.BALANCE &&
            snapshot.expiresAt &&
            new Date(snapshot.expiresAt).getTime() < Date.now()) {
            throw new common_1.GoneException('Price quote has expired. Please get a fresh quote and try again.');
        }
        let amountPaise;
        if (dto.type === init_payment_dto_1.PaymentTypeDto.FULL) {
            if (booking.plan !== 'FULL') {
                throw new common_1.BadRequestException('Booking plan is DEPOSIT_50, not FULL');
            }
            amountPaise = snapshot.total;
        }
        else if (dto.type === init_payment_dto_1.PaymentTypeDto.DEPOSIT) {
            if (booking.plan !== 'DEPOSIT_50') {
                throw new common_1.BadRequestException('Booking plan is FULL, not DEPOSIT_50');
            }
            amountPaise = snapshot.depositAmount;
        }
        else {
            if (!['BALANCE_DUE', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
                throw new common_1.BadRequestException(`Cannot pay balance in booking status: ${booking.status}`);
            }
            amountPaise = snapshot.balanceAmount;
        }
        const order = await this.razorpay.createOrder(amountPaise, `${dto.bookingId}_${dto.type}`);
        const payment = await this.prisma.payment.create({
            data: {
                bookingId: dto.bookingId,
                amount: amountPaise,
                type: dto.type === init_payment_dto_1.PaymentTypeDto.FULL ? 'FULL' : dto.type === init_payment_dto_1.PaymentTypeDto.DEPOSIT ? 'DEPOSIT_50' : 'FULL',
                status: 'INITIATED',
                gateway: 'razorpay',
                gatewayOrderRef: order.id,
                idempotencyKey: dto.idempotencyKey,
            },
        });
        await this.auditService.log(guestId, 'PAYMENT_INIT', 'payment', payment.id, {
            bookingId: dto.bookingId,
            type: dto.type,
            amountPaise,
            orderId: order.id,
        });
        return {
            paymentId: payment.id,
            razorpayOrderId: order.id,
            amount: amountPaise,
            currency: 'INR',
            keyId: this.razorpay['keyId'],
        };
    }
    async handleWebhook(rawBody, signature, eventId) {
        const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
        if (!valid) {
            this.logger.warn('Webhook signature verification failed');
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const event = JSON.parse(rawBody);
        const eventType = event['event'];
        if (eventId) {
            try {
                await this.prisma.processedRazorpayEvent.create({
                    data: { eventId, eventType },
                });
            }
            catch (err) {
                const code = err?.code;
                if (code === 'P2002') {
                    this.logger.log(`Razorpay webhook dedup hit: ${eventId} (${eventType})`);
                    return { received: true, deduped: true };
                }
                throw err;
            }
        }
        this.logger.log(`Razorpay webhook received: ${eventType} (id=${eventId ?? 'unknown'})`);
        if (eventType === 'payment.captured') {
            await this.handlePaymentCaptured(event);
        }
        else if (eventType === 'payment.failed') {
            await this.handlePaymentFailed(event);
        }
        else if (eventType === 'refund.processed') {
            await this.handleRefundProcessed(event);
        }
        else {
            this.logger.log(`Unhandled webhook event: ${eventType}`);
        }
        return { received: true };
    }
    async handlePaymentCaptured(event) {
        const paymentEntity = event['payload']?.['payment']?.['entity'];
        const gatewayPaymentId = paymentEntity?.['id'];
        const gatewayOrderId = paymentEntity?.['order_id'];
        const amountPaise = paymentEntity?.['amount'];
        if (!gatewayPaymentId || !gatewayOrderId) {
            this.logger.error('Malformed payment.captured event', event);
            return;
        }
        const paymentRow = await this.prisma.payment.findFirst({
            where: { gatewayOrderRef: gatewayOrderId },
            select: { id: true },
        });
        if (!paymentRow) {
            this.logger.warn(`No payment found for order ${gatewayOrderId}`);
            return;
        }
        const paymentId = paymentRow.id;
        let didConfirm = false;
        let confirmedBookingId = null;
        await (0, serializable_retry_1.withSerializableRetry)(this.prisma, async (tx) => {
            const payment = await tx.payment.findUnique({ where: { id: paymentId } });
            if (!payment)
                return;
            if (payment.status === 'CAPTURED') {
                this.logger.log(`Payment ${payment.id} already captured - skipping`);
                return;
            }
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'CAPTURED', gatewayPaymentRef: gatewayPaymentId },
            });
            if (payment.type === 'PAY_LATER' &&
                payment.payLaterSeq &&
                payment.payLaterSeq > 1) {
                const result = await this.payLaterService.recordInstalmentCapture(tx, payment.bookingId, payment.payLaterSeq, payment.id, amountPaise);
                const fresh = await tx.booking.findUnique({
                    where: { id: payment.bookingId },
                });
                if (fresh) {
                    await this.stateMachine.transition(tx, fresh, result.completed
                        ? 'PAY_LATER_FINAL_CAPTURED'
                        : 'PAY_LATER_INSTALMENT_CAPTURED', {
                        actorId: 'system:razorpay',
                        metadata: { paymentId: payment.id, seq: payment.payLaterSeq, amountPaise },
                    });
                }
            }
            else {
                const res = await this.bookingService.confirmPayment(tx, payment.bookingId, payment.id, amountPaise);
                didConfirm = res.didConfirm;
                confirmedBookingId = payment.bookingId;
            }
            await this.auditService.log(null, 'PAYMENT_CAPTURED', 'payment', payment.id, {
                gatewayPaymentId,
                gatewayOrderId,
                amountPaise,
                payLaterSeq: payment.payLaterSeq ?? undefined,
            }, tx);
        }, { path: 'handlePaymentCaptured' });
        if (didConfirm && confirmedBookingId) {
            void this.bookingService.sendBookingConfirmedNotificationPublic(confirmedBookingId);
        }
    }
    async handlePaymentFailed(event) {
        const paymentEntity = event['payload']?.['payment']?.['entity'];
        const gatewayOrderId = paymentEntity?.['order_id'];
        const payment = await this.prisma.payment.findFirst({
            where: { gatewayOrderRef: gatewayOrderId },
        });
        if (!payment)
            return;
        if (payment.status === 'FAILED')
            return;
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
        });
        await this.auditService.log(null, 'PAYMENT_FAILED', 'payment', payment.id, {
            gatewayOrderId,
        });
    }
    async handleRefundProcessed(event) {
        const refundEntity = event['payload']?.['refund']?.['entity'];
        const gatewayRefundId = refundEntity?.['id'];
        const gatewayPaymentId = refundEntity?.['payment_id'];
        const amountPaise = refundEntity?.['amount'];
        if (!gatewayRefundId || !gatewayPaymentId)
            return;
        const payment = await this.prisma.payment.findFirst({
            where: { gatewayPaymentRef: gatewayPaymentId },
        });
        if (!payment)
            return;
        await this.prisma.refund.updateMany({
            where: {
                bookingId: payment.bookingId,
                gatewayRefundRef: null,
            },
            data: { gatewayRefundRef: gatewayRefundId },
        });
        await this.auditService.log(null, 'REFUND_PROCESSED', 'payment', payment.id, {
            gatewayRefundId,
            gatewayPaymentId,
            amountInr: Math.round(amountPaise / 100),
        });
    }
    async payBalance(guestId, bookingId, idempotencyKey) {
        return this.initPayment(guestId, {
            bookingId,
            type: init_payment_dto_1.PaymentTypeDto.BALANCE,
            idempotencyKey,
        });
    }
    async reconcileStalePayments(olderThanMinutes = 30) {
        if (this.razorpay.isStubMode()) {
            return { examined: 0, captured: 0, failed: 0, stillPending: 0, errors: 0 };
        }
        const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
        const stalePayments = await this.prisma.payment.findMany({
            where: {
                status: 'INITIATED',
                createdAt: { lt: cutoff },
                gatewayOrderRef: { not: null },
            },
            take: 100,
            orderBy: { createdAt: 'asc' },
        });
        if (stalePayments.length === 0) {
            return { examined: 0, captured: 0, failed: 0, stillPending: 0, errors: 0 };
        }
        let captured = 0;
        let failed = 0;
        let stillPending = 0;
        let errors = 0;
        for (const payment of stalePayments) {
            if (!payment.gatewayOrderRef)
                continue;
            try {
                const gatewayPayments = await this.razorpay.getPaymentsForOrder(payment.gatewayOrderRef);
                const capturedAttempt = gatewayPayments.find((p) => p.status === 'captured');
                const failedAttempt = gatewayPayments.find((p) => p.status === 'failed');
                if (capturedAttempt) {
                    await this.handlePaymentCaptured({
                        payload: {
                            payment: {
                                entity: {
                                    id: capturedAttempt.id,
                                    order_id: capturedAttempt.order_id,
                                    amount: capturedAttempt.amount,
                                },
                            },
                        },
                    });
                    captured++;
                }
                else if (failedAttempt && gatewayPayments.every((p) => p.status === 'failed')) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'FAILED' },
                    });
                    await this.auditService.log(null, 'PAYMENT_RECON_MARK_FAILED', 'payment', payment.id, { gatewayOrderRef: payment.gatewayOrderRef });
                    failed++;
                }
                else {
                    stillPending++;
                }
            }
            catch (err) {
                errors++;
                this.logger.error(`Recon failed for payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        this.logger.log(`Payment recon: examined=${stalePayments.length} captured=${captured} failed=${failed} stillPending=${stillPending} errors=${errors}`);
        return {
            examined: stalePayments.length,
            captured,
            failed,
            stillPending,
            errors,
        };
    }
    async initPayLaterInstalmentPayment(guestId, bookingId, seq, idempotencyKey) {
        const existing = await this.prisma.payment.findUnique({
            where: { idempotencyKey },
        });
        if (existing) {
            if (existing.bookingId !== bookingId || existing.payLaterSeq !== seq) {
                throw new common_1.BadRequestException('Idempotency key already used for a different instalment');
            }
            return existing;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payLaterPlan: { include: { instalments: true } } },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== guestId)
            throw new common_1.ForbiddenException('Access denied');
        if (booking.plan !== 'PAY_LATER' || !booking.payLaterPlan) {
            throw new common_1.BadRequestException('Booking is not on a Pay Later plan');
        }
        if (booking.payLaterPlan.status === 'DEFAULTED' ||
            booking.payLaterPlan.status === 'CANCELLED' ||
            booking.payLaterPlan.status === 'COMPLETED') {
            throw new common_1.BadRequestException(`Plan is ${booking.payLaterPlan.status}; no further instalments accepted`);
        }
        const instalment = booking.payLaterPlan.instalments.find((i) => i.seq === seq);
        if (!instalment) {
            throw new common_1.NotFoundException(`Instalment seq ${seq} not found`);
        }
        if (instalment.paidAt) {
            throw new common_1.BadRequestException(`Instalment ${seq} is already paid`);
        }
        const earliestUnpaid = booking.payLaterPlan.instalments
            .filter((i) => !i.paidAt)
            .sort((a, b) => a.seq - b.seq)[0];
        if (earliestUnpaid && earliestUnpaid.seq < seq) {
            throw new common_1.BadRequestException(`Pay instalment ${earliestUnpaid.seq} first`);
        }
        const amountPaise = instalment.amountMinor;
        const order = await this.razorpay.createOrder(amountPaise, `${bookingId}_PL_${seq}`);
        const payment = await this.prisma.payment.create({
            data: {
                bookingId,
                amount: amountPaise,
                type: 'PAY_LATER',
                status: 'INITIATED',
                gateway: 'razorpay',
                gatewayOrderRef: order.id,
                idempotencyKey,
                payLaterSeq: seq,
            },
        });
        await this.auditService.log(guestId, 'PAY_LATER_INSTALMENT_INIT', 'payment', payment.id, { bookingId, seq, amountPaise, orderId: order.id });
        return {
            paymentId: payment.id,
            razorpayOrderId: order.id,
            amount: amountPaise,
            currency: 'INR',
            keyId: this.razorpay['keyId'],
            seq,
        };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => booking_service_1.BookingService))),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => pay_later_service_1.PayLaterService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        booking_service_1.BookingService,
        audit_service_1.AuditService,
        razorpay_service_1.RazorpayService,
        price_snapshot_signer_service_1.PriceSnapshotSignerService,
        pay_later_service_1.PayLaterService,
        state_machine_1.BookingStateMachine])
], PaymentService);
//# sourceMappingURL=payment.service.js.map