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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const booking_service_1 = require("../booking/booking.service");
const audit_service_1 = require("../common/services/audit.service");
const razorpay_service_1 = require("./razorpay.service");
const init_payment_dto_1 = require("./dto/init-payment.dto");
let PaymentService = PaymentService_1 = class PaymentService {
    constructor(prisma, bookingService, auditService, razorpay) {
        this.prisma = prisma;
        this.bookingService = bookingService;
        this.auditService = auditService;
        this.razorpay = razorpay;
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
        let amountInr;
        if (dto.type === init_payment_dto_1.PaymentTypeDto.FULL) {
            if (booking.plan !== 'FULL') {
                throw new common_1.BadRequestException('Booking plan is DEPOSIT_50, not FULL');
            }
            amountInr = snapshot.total;
        }
        else if (dto.type === init_payment_dto_1.PaymentTypeDto.DEPOSIT) {
            if (booking.plan !== 'DEPOSIT_50') {
                throw new common_1.BadRequestException('Booking plan is FULL, not DEPOSIT_50');
            }
            amountInr = snapshot.depositAmount;
        }
        else {
            if (!['BALANCE_DUE', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
                throw new common_1.BadRequestException(`Cannot pay balance in booking status: ${booking.status}`);
            }
            amountInr = snapshot.balanceAmount;
        }
        const order = await this.razorpay.createOrder(amountInr * 100, `${dto.bookingId}_${dto.type}`);
        const payment = await this.prisma.payment.create({
            data: {
                bookingId: dto.bookingId,
                amount: amountInr,
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
            amount: amountInr,
            orderId: order.id,
        });
        return {
            paymentId: payment.id,
            razorpayOrderId: order.id,
            amount: amountInr,
            currency: 'INR',
            keyId: this.razorpay['keyId'],
        };
    }
    async handleWebhook(rawBody, signature) {
        const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
        if (!valid) {
            this.logger.warn('Webhook signature verification failed');
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const event = JSON.parse(rawBody);
        const eventType = event['event'];
        this.logger.log(`Razorpay webhook received: ${eventType}`);
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
        const amountInr = Math.round(amountPaise / 100);
        const payment = await this.prisma.payment.findFirst({
            where: { gatewayOrderRef: gatewayOrderId },
        });
        if (!payment) {
            this.logger.warn(`No payment found for order ${gatewayOrderId}`);
            return;
        }
        if (payment.status === 'CAPTURED') {
            this.logger.log(`Payment ${payment.id} already captured — skipping`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'CAPTURED',
                    gatewayPaymentRef: gatewayPaymentId,
                },
            });
            await this.bookingService.confirmPayment(payment.bookingId, payment.id, amountInr, tx);
            await this.auditService.log(null, 'PAYMENT_CAPTURED', 'payment', payment.id, {
                gatewayPaymentId,
                gatewayOrderId,
                amountInr,
            }, tx);
        });
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
    async stubConfirm(paymentId) {
        if (!this.razorpay.isStubMode()) {
            throw new common_1.BadRequestException('stub-confirm is only available in stub mode (local dev). ' +
                'Use the real Razorpay webhook in production.');
        }
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        if (payment.status === 'CAPTURED') {
            return { payment, message: 'Already captured (idempotent)' };
        }
        if (payment.status !== 'INITIATED') {
            throw new common_1.BadRequestException(`Cannot confirm payment in status: ${payment.status}`);
        }
        const updatedPayment = await this.prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'CAPTURED',
                    gatewayPaymentRef: `stub_pay_${paymentId}`,
                },
            });
            await this.bookingService.confirmPayment(payment.bookingId, paymentId, payment.amount, tx);
            await this.auditService.log(null, 'PAYMENT_STUB_CONFIRMED', 'payment', paymentId, { bookingId: payment.bookingId, amount: payment.amount }, tx);
            return p;
        });
        this.logger.log(`[STUB] Payment ${paymentId} confirmed for booking ${payment.bookingId}`);
        return { payment: updatedPayment, message: 'Stub payment confirmed' };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        booking_service_1.BookingService,
        audit_service_1.AuditService,
        razorpay_service_1.RazorpayService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map