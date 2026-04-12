import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
type TxClient = any;
export declare class BookingService {
    private readonly prisma;
    private readonly pricingService;
    private readonly auditService;
    private readonly ledgerService;
    private readonly notificationService;
    constructor(prisma: PrismaService, pricingService: PricingService, auditService: AuditService, ledgerService: LedgerService, notificationService: NotificationService);
    createBooking(guestId: string, dto: CreateBookingDto): Promise<any>;
    getMyBookings(guestId: string): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        holdId: string;
        listingId: string;
        guestId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        balanceDueAt: Date | null;
    })[]>;
    getBookingById(bookingId: string, requesterId: string, requesterRole: string): Promise<{
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
        refunds: {
            id: string;
            createdAt: Date;
            bookingId: string;
            amount: number;
            paymentId: string | null;
            reason: string;
            gatewayRefundRef: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        holdId: string;
        listingId: string;
        guestId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        balanceDueAt: Date | null;
    }>;
    getAllBookings(page?: number, limit?: number): Promise<{
        bookings: ({
            listing: {
                id: string;
                title: string;
                city: string;
                state: string;
            };
            payments: {
                id: string;
                type: import("@prisma/client").$Enums.PaymentPlan;
                status: import("@prisma/client").$Enums.PaymentStatus;
                amount: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            holdId: string;
            listingId: string;
            guestId: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            plan: import("@prisma/client").$Enums.PaymentPlan;
            startsAt: Date;
            endsAt: Date;
            priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
            balanceDueAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    confirmPayment(bookingId: string, paymentId: string, amountCaptured: number, tx?: TxClient): Promise<any>;
    private sendBookingConfirmedNotification;
    transitionToBalanceDue(): Promise<number>;
    autoCancelUnpaidBalance(): Promise<number>;
    cancelBooking(bookingId: string, requesterId: string, requesterRole: string, dto: CancelBookingDto): Promise<any>;
    sendBalanceDueReminders(): Promise<void>;
    private cancelBookingInternal;
    completeBooking(bookingId: string, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        holdId: string;
        listingId: string;
        guestId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        balanceDueAt: Date | null;
    }>;
}
export {};
