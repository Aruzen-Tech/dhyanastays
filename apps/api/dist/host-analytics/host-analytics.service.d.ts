import { Prisma } from '@prisma/client';
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    createNotification(hostId: string, type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    }>;
    getNotifications(userId: string, unreadOnly: boolean): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    }[]>;
    markNotificationRead(userId: string, id: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        type: string;
        metadata: Prisma.JsonValue;
        hostId: string;
        title: string;
        isRead: boolean;
    } | null>;
    markAllNotificationsRead(userId: string): Promise<{
        count: number;
    }>;
}
