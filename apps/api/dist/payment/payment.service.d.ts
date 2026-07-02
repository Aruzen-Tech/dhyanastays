import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { AuditService } from '../common/services/audit.service';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import { RazorpayService } from './razorpay.service';
import { InitPaymentDto } from './dto/init-payment.dto';
import { PayLaterService } from '../pay-later/pay-later.service';
import { BookingStateMachine } from '../booking/state-machine';
export declare class PaymentService {
    private readonly prisma;
    private readonly bookingService;
    private readonly auditService;
    private readonly razorpay;
    private readonly snapshotSigner;
    private readonly payLaterService;
    private readonly stateMachine;
    private readonly logger;
    constructor(prisma: PrismaService, bookingService: BookingService, auditService: AuditService, razorpay: RazorpayService, snapshotSigner: PriceSnapshotSignerService, payLaterService: PayLaterService, stateMachine: BookingStateMachine);
    initPayment(guestId: string, dto: InitPaymentDto): Promise<{
        type: import("@prisma/client").$Enums.PaymentPlan;
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: number;
        bookingId: string;
        gateway: string;
        gatewayPaymentRef: string | null;
        gatewayOrderRef: string | null;
        payLaterSeq: number | null;
    } | {
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    handleWebhook(rawBody: string, signature: string, eventId?: string): Promise<{
        received: boolean;
        deduped: boolean;
    } | {
        received: boolean;
        deduped?: undefined;
    }>;
    private handlePaymentCaptured;
    private handlePaymentFailed;
    private handleRefundProcessed;
    payBalance(guestId: string, bookingId: string, idempotencyKey: string): Promise<{
        type: import("@prisma/client").$Enums.PaymentPlan;
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: number;
        bookingId: string;
        gateway: string;
        gatewayPaymentRef: string | null;
        gatewayOrderRef: string | null;
        payLaterSeq: number | null;
    } | {
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }>;
    reconcileStalePayments(olderThanMinutes?: number): Promise<{
        examined: number;
        captured: number;
        failed: number;
        stillPending: number;
        errors: number;
    }>;
    initPayLaterInstalmentPayment(guestId: string, bookingId: string, seq: number, idempotencyKey: string): Promise<{
        type: import("@prisma/client").$Enums.PaymentPlan;
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: number;
        bookingId: string;
        gateway: string;
        gatewayPaymentRef: string | null;
        gatewayOrderRef: string | null;
        payLaterSeq: number | null;
    } | {
        paymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        seq: number;
    }>;
}
