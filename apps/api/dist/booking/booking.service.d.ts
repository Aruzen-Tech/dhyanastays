import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { OutboxService } from '../notification/outbox.service';
import { ReferralService } from '../referral/referral.service';
import { AddOnService } from '../add-on/add-on.service';
import { MembershipService } from '../membership/membership.service';
import { PayLaterService } from '../pay-later/pay-later.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingStateMachine, BookingLike } from './state-machine';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
type TxClient = any;
export declare class BookingService {
    private readonly prisma;
    private readonly pricingService;
    private readonly auditService;
    private readonly ledgerService;
    private readonly notificationService;
    private readonly outboxService;
    private readonly referralService;
    private readonly addOnService;
    private readonly membershipService;
    private readonly payLaterService;
    private readonly stateMachine;
    private readonly snapshotSigner;
    constructor(prisma: PrismaService, pricingService: PricingService, auditService: AuditService, ledgerService: LedgerService, notificationService: NotificationService, outboxService: OutboxService, referralService: ReferralService, addOnService: AddOnService, membershipService: MembershipService, payLaterService: PayLaterService, stateMachine: BookingStateMachine, snapshotSigner: PriceSnapshotSignerService);
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        holdId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        priceSnapshot: Prisma.JsonValue;
        guestDetails: Prisma.JsonValue | null;
        checkInData: Prisma.JsonValue | null;
        checkOutData: Prisma.JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: Prisma.JsonValue;
        cancellationPolicySnapshot: Prisma.JsonValue | null;
    })[]>;
    getHostBookings(userId: string): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        holdId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        priceSnapshot: Prisma.JsonValue;
        guestDetails: Prisma.JsonValue | null;
        checkInData: Prisma.JsonValue | null;
        checkOutData: Prisma.JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: Prisma.JsonValue;
        cancellationPolicySnapshot: Prisma.JsonValue | null;
    })[]>;
    getBookingById(bookingId: string, requesterId: string, requesterRole: string): Promise<{
        listing: {
            host: {
                user: {
                    fullName: string;
                };
                userId: string;
            };
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
        refunds: {
            id: string;
            createdAt: Date;
            amount: number;
            reason: string;
            bookingId: string;
            paymentId: string | null;
            gatewayRefundRef: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        holdId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        priceSnapshot: Prisma.JsonValue;
        guestDetails: Prisma.JsonValue | null;
        checkInData: Prisma.JsonValue | null;
        checkOutData: Prisma.JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: Prisma.JsonValue;
        cancellationPolicySnapshot: Prisma.JsonValue | null;
    }>;
    getAllBookings(page?: number, limit?: number, status?: string, search?: string): Promise<{
        bookings: ({
            listing: {
                id: string;
                title: string;
                city: string;
                state: string;
            };
            guest: {
                email: string;
                fullName: string;
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
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
            listingId: string;
            holdId: string;
            guestId: string;
            plan: import("@prisma/client").$Enums.PaymentPlan;
            priceSnapshot: Prisma.JsonValue;
            guestDetails: Prisma.JsonValue | null;
            checkInData: Prisma.JsonValue | null;
            checkOutData: Prisma.JsonValue | null;
            balanceDueAt: Date | null;
            payLaterMonths: number | null;
            acceptedTermsAt: Date | null;
            statusHistory: Prisma.JsonValue;
            cancellationPolicySnapshot: Prisma.JsonValue | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    confirmPayment(tx: TxClient, bookingId: string, paymentId: string, amountCaptured: number): Promise<{
        booking: BookingLike & {
            status: string;
        };
        didConfirm: boolean;
    }>;
    settleBalance(tx: TxClient, bookingId: string, paymentId: string, amountCaptured: number): Promise<{
        booking: BookingLike & {
            status: string;
        };
        didSettle: boolean;
    }>;
    private computeExpectedFirstCapturePaise;
    sendBookingConfirmedNotificationPublic(bookingId: string): Promise<void>;
    private sendBookingConfirmedNotification;
    transitionToBalanceDue(): Promise<number>;
    autoCancelUnpaidBalance(): Promise<number>;
    cancelBooking(bookingId: string, requesterId: string, requesterRole: string, dto: CancelBookingDto): Promise<any>;
    sendBalanceDueReminders(): Promise<void>;
    cancelDefaultedPayLater(bookingId: string): Promise<void>;
    private cancelBookingInternal;
    autoCompleteCheckedOut(): Promise<number>;
    completeBooking(bookingId: string, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        holdId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        priceSnapshot: Prisma.JsonValue;
        guestDetails: Prisma.JsonValue | null;
        checkInData: Prisma.JsonValue | null;
        checkOutData: Prisma.JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: Prisma.JsonValue;
        cancellationPolicySnapshot: Prisma.JsonValue | null;
    }>;
}
export {};
