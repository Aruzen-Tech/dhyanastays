import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { InitPaymentDto } from './dto/init-payment.dto';
import { PaymentService } from './payment.service';
declare class PayBalanceDto {
    idempotencyKey: string;
}
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    init(user: RequestUser, dto: InitPaymentDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.PaymentPlan;
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
    webhook(req: RawBodyRequest<Request>, signature: string, eventId: string | undefined): Promise<{
        received: boolean;
        deduped: boolean;
    } | {
        received: boolean;
        deduped?: undefined;
    }>;
    payBalance(user: RequestUser, bookingId: string, dto: PayBalanceDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.PaymentPlan;
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
}
export {};
