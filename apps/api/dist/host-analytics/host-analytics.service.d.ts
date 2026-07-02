import { PrismaService } from '../prisma/prisma.service';
export declare class HostAnalyticsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getStats(userId: string): Promise<{
        totalListings: number;
        activeListings: number;
        totalBookings: number;
        totalRevenue: number;
        totalEarned: number;
        occupancyRate: number;
        upcomingCheckins: number;
    } | null>;
    getRevenue(userId: string, from: string, to: string, groupBy: 'day' | 'week' | 'month'): Promise<{
        period: string;
        revenue: number;
        bookings: number;
    }[]>;
    getListingPerformance(userId: string): Promise<{
        listingId: string;
        title: string;
        city: string;
        state: string;
        status: import("@prisma/client").$Enums.ListingStatus;
        baseRate: number;
        totalBookings: number;
        totalRevenue: number;
        occupancyRate: number;
        bookedDays30: number;
    }[]>;
    getForecast(userId: string): Promise<{
        label: string;
        days: number;
        revenue: number;
        bookings: number;
    }[]>;
    getCalendarBookings(userId: string, month: string, listingId?: string): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
        };
        guest: {
            email: string;
            fullName: string;
        };
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
    getBookings(userId: string, page: number, limit: number, status?: string): Promise<{
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    createNotification(hostId: string, type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    }>;
    getNotifications(userId: string, unreadOnly: boolean): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    }[]>;
    markNotificationRead(userId: string, id: string): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    } | null>;
    markAllNotificationsRead(userId: string): Promise<{
        count: number;
    }>;
}
