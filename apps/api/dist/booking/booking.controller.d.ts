import { RequestUser } from '../common/decorators/current-user.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListingService } from '../listing/listing.service';
export declare class BookingController {
    private readonly bookingService;
    private readonly listingService;
    constructor(bookingService: BookingService, listingService: ListingService);
    create(user: RequestUser, dto: CreateBookingDto): Promise<any>;
    getMyBookings(user: RequestUser): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    getHostBookings(user: RequestUser): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
            country: string;
        };
        payments: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    getOne(user: RequestUser, id: string): Promise<{
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
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getPreparation(user: RequestUser, id: string): Promise<{
        bookingId: string;
        listingTitle: string;
        preparationGuide: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    cancel(user: RequestUser, id: string, dto: CancelBookingDto): Promise<any>;
    complete(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getAllBookings(page?: string, limit?: string, status?: string, search?: string): Promise<{
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
                type: import("@prisma/client").$Enums.PaymentPlan;
                id: string;
                status: import("@prisma/client").$Enums.PaymentStatus;
                amount: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            holdId: string;
            listingId: string;
            guestId: string;
            plan: import("@prisma/client").$Enums.PaymentPlan;
            startsAt: Date;
            endsAt: Date;
            priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
            guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
            checkInData: import("@prisma/client/runtime/library").JsonValue | null;
            checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
            balanceDueAt: Date | null;
            payLaterMonths: number | null;
            acceptedTermsAt: Date | null;
            statusHistory: import("@prisma/client/runtime/library").JsonValue;
            cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
}
