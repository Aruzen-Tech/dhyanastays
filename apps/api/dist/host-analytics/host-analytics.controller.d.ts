import { RequestUser } from '../common/decorators/current-user.decorator';
import { HostAnalyticsService } from './host-analytics.service';
export declare class HostAnalyticsController {
    private readonly hostAnalytics;
    constructor(hostAnalytics: HostAnalyticsService);
    getStats(user: RequestUser): Promise<{
        totalListings: number;
        activeListings: number;
        totalBookings: number;
        totalRevenue: number;
        totalEarned: number;
        occupancyRate: number;
        upcomingCheckins: number;
    } | null>;
    getRevenue(user: RequestUser, from: string, to: string, groupBy?: 'day' | 'week' | 'month'): Promise<{
        period: string;
        revenue: number;
        bookings: number;
    }[]>;
    getListingPerformance(user: RequestUser): Promise<{
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
    getForecast(user: RequestUser): Promise<{
        label: string;
        days: number;
        revenue: number;
        bookings: number;
    }[]>;
    getCalendarBookings(user: RequestUser, month: string, listingId?: string): Promise<({
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
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        holdId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
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
    getBookings(user: RequestUser, page?: string, limit?: string, status?: string): Promise<{
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
    getNotifications(user: RequestUser, unreadOnly?: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    }[]>;
    markNotificationRead(user: RequestUser, id: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    } | null>;
    markAllNotificationsRead(user: RequestUser): Promise<{
        count: number;
    }>;
}
