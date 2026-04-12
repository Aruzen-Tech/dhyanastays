import { RequestUser } from '../common/decorators/current-user.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingController {
    private readonly bookingService;
    constructor(bookingService: BookingService);
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
    getOne(user: RequestUser, id: string): Promise<{
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
    cancel(user: RequestUser, id: string, dto: CancelBookingDto): Promise<any>;
    complete(user: RequestUser, id: string): Promise<{
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
    getAllBookings(page?: string, limit?: string): Promise<{
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
}
