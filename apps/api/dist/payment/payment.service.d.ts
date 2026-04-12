import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { AuditService } from '../common/services/audit.service';
import { RazorpayService } from './razorpay.service';
import { InitPaymentDto } from './dto/init-payment.dto';
export declare class PaymentService {
    private readonly prisma;
    private readonly bookingService;
    private readonly auditService;
    private readonly razorpay;
    private readonly logger;
    constructor(prisma: PrismaService, bookingService: BookingService, auditService: AuditService, razorpay: RazorpayService);
    initPayment(guestId: string, dto: InitPaymentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.PaymentPlan;
        status: import("@prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: number;
        gateway: string;
        gatewayPaymentRef: string | null;
        gatewayOrderRef: string | null;
        idempotencyKey: string;
    } | {
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    handleWebhook(rawBody: string, signature: string): Promise<{
        received: boolean;
    }>;
    private handlePaymentCaptured;
    private handlePaymentFailed;
    private handleRefundProcessed;
    payBalance(guestId: string, bookingId: string, idempotencyKey: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.PaymentPlan;
        status: import("@prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: number;
        gateway: string;
        gatewayPaymentRef: string | null;
        gatewayOrderRef: string | null;
        idempotencyKey: string;
    } | {
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    stubConfirm(paymentId: string): Promise<{
        payment: any;
        message: string;
    }>;
}
