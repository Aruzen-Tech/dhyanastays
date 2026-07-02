import { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { PayLaterService } from './pay-later.service';
import { PayInstalmentDto } from './dto/pay-instalment.dto';
export declare class PayLaterController {
    private readonly prisma;
    private readonly payLater;
    private readonly paymentService;
    constructor(prisma: PrismaService, payLater: PayLaterService, paymentService: PaymentService);
    getPlan(user: RequestUser, bookingId: string): Promise<{
        instalments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paymentId: string | null;
            amountMinor: number;
            paidAt: Date | null;
            dueAt: Date;
            planId: string;
            seq: number;
            remindersSent: number;
            lastReminderAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PayLaterStatus;
        bookingId: string;
        currency: string;
        totalMinor: number;
        months: number;
    }>;
    payInstalment(user: RequestUser, bookingId: string, seq: number, dto: PayInstalmentDto): Promise<{
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
