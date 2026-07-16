import { RequestUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminNotificationService } from './admin-notification.service';
import { RateLimitService } from './rate-limit.service';
import { CreateAdminRefundDto } from './dto/create-admin-refund.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BulkIdsDto } from './dto/bulk-ids.dto';
import { ApplyStaffDto } from './dto/apply-staff.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { ChangeUserKindDto } from './dto/change-user-kind.dto';
export declare class AdminController {
    private readonly adminService;
    private readonly notificationService;
    private readonly rateLimitService;
    constructor(adminService: AdminService, notificationService: AdminNotificationService, rateLimitService: RateLimitService);
    getStats(): Promise<{
        users: {
            total: number;
            guests: number;
            hosts: number;
            admins: number;
            pendingHosts: number;
        };
        listings: {
            total: number;
            approved: number;
            pending: number;
            rejected: number;
        };
        bookings: {
            total: number;
            confirmed: number;
            completed: number;
            cancelled: number;
            pendingPayment: number;
        };
        revenue: {
            totalCollected: number;
            platformFees: number;
        };
        payouts: {
            eligibleAmount: number;
            paidAmount: number;
        };
        recentBookings: ({
            listing: {
                title: string;
                city: string;
                state: string;
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
        })[];
        recentAudit: ({
            actor: {
                email: string;
                fullName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            action: string;
            resourceType: string;
            resourceId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            actorUserId: string | null;
        })[];
    }>;
    getUsers(page?: string, limit?: string, role?: string, search?: string): Promise<{
        users: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            email: string;
            fullName: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            hostProfile: {
                id: string;
                verificationStatus: import("@prisma/client").$Enums.HostVerificationStatus;
                payoutEnabled: boolean;
            } | null;
            _count: {
                bookings: number;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    changeUserKind(actor: RequestUser, id: string, dto: ChangeUserKindDto): Promise<{
        userId: string;
        kind: import("@prisma/client").$Enums.UserKind;
        role: "GUEST" | "HOST" | "ADMIN";
        staffLevel: import("@prisma/client").$Enums.AdminLevel | null;
    }>;
    getUserRoleHistory(id: string): Promise<{
        user: {
            role: import("@prisma/client").$Enums.UserRole;
            staffRole: {
                level: import("@prisma/client").$Enums.AdminLevel;
                revokedAt: Date | null;
            } | null;
            id: string;
            email: string;
            fullName: string;
            kind: import("@prisma/client").$Enums.UserKind | null;
            createdAt: Date;
        };
        history: {
            id: string;
            actor: {
                id: string;
                email: string;
                fullName: string;
            } | {
                id: string;
                email: null;
                fullName: null;
            };
            before: import("@prisma/client/runtime/library").JsonValue;
            after: import("@prisma/client/runtime/library").JsonValue;
            reason: string;
            createdAt: Date;
        }[];
    }>;
    deactivateUser(actor: RequestUser, id: string): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        passwordHash: string | null;
        fullName: string;
        kind: import("@prisma/client").$Enums.UserKind | null;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        avatarUrl: string | null;
        referralCode: string | null;
    }>;
    activateUser(actor: RequestUser, id: string): Promise<{
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        email: string;
        passwordHash: string | null;
        fullName: string;
        kind: import("@prisma/client").$Enums.UserKind | null;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        avatarUrl: string | null;
        referralCode: string | null;
    }>;
    getAuditLog(page?: string, limit?: string, action?: string, resourceType?: string): Promise<{
        entries: ({
            actor: {
                email: string;
                fullName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            action: string;
            resourceType: string;
            resourceId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            actorUserId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getRevenue(from: string, to: string, groupBy: string): Promise<{
        period: string;
        totalCollected: number;
        platformFees: number;
        hostShare: number;
        bookingCount: number;
    }[]>;
    getListingDetail(id: string): Promise<{
        totalRevenue: number;
        bookingCount: number;
        host: {
            user: {
                email: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            verificationStatus: import("@prisma/client").$Enums.HostVerificationStatus;
            payoutAccountRef: string | null;
            payoutEnabled: boolean;
        };
        bookings: ({
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
        media: {
            url: string;
            id: string;
            createdAt: Date;
            listingId: string;
            sortOrder: number;
            mediaType: string;
        }[];
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            cleaningFee: number;
            minNights: number;
            maxGuests: number;
        }[];
        seasonalRates: {
            id: string;
            createdAt: Date;
            listingId: string;
            startsAt: Date;
            endsAt: Date;
            nightlyRate: number;
        }[];
        availabilityBlocks: {
            id: string;
            createdAt: Date;
            reason: string;
            listingId: string;
            startsAt: Date;
            endsAt: Date;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ListingStatus;
        hostId: string;
        createdById: string;
        title: string;
        description: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        timezone: string;
        preparationGuide: import("@prisma/client/runtime/library").JsonValue | null;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue | null;
        propertyManual: import("@prisma/client/runtime/library").JsonValue | null;
        experienceTags: string[];
        propertyType: string | null;
        dietaryOptions: string[];
        needsReapproval: boolean;
    }>;
    validateRefundBooking(bookingId: string): Promise<{
        bookingId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        listingTitle: string;
        guestName: string;
        guestEmail: string;
        totalPaid: number;
        totalRefunded: number;
        maxRefundable: number;
    }>;
    getRefunds(page?: string, limit?: string): Promise<{
        refunds: ({
            booking: {
                listing: {
                    title: string;
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
            };
        } & {
            id: string;
            createdAt: Date;
            amount: number;
            reason: string;
            bookingId: string;
            paymentId: string | null;
            gatewayRefundRef: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    createRefund(actor: RequestUser, dto: CreateAdminRefundDto): Promise<{
        id: string;
        createdAt: Date;
        amount: number;
        reason: string;
        bookingId: string;
        paymentId: string | null;
        gatewayRefundRef: string | null;
    }>;
    getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        updatedBy: string | null;
    }[]>;
    updateSettings(actor: RequestUser, dto: UpdateSettingsDto): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        updatedBy: string | null;
    }[]>;
    getCalendarBookings(month: string, listingId?: string): Promise<{
        id: string;
        listingId: string;
        listingTitle: string;
        guestName: string;
        startsAt: string;
        endsAt: string;
        status: import("@prisma/client").$Enums.BookingStatus;
    }[]>;
    getHostPerformance(): Promise<{
        hostId: string;
        hostName: string;
        hostEmail: string;
        totalListings: number;
        approvedListings: number;
        totalBookings: number;
        completedBookings: number;
        occupancyRate: number;
        totalRevenue: number;
        avgBookingValue: number;
    }[]>;
    getNotifications(unreadOnly?: string): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }[]>;
    markNotificationRead(id: string): Promise<{
        type: string;
        message: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }>;
    markAllNotificationsRead(): Promise<{
        count: number;
    }>;
    bulkApproveListings(actor: RequestUser, dto: BulkIdsDto): Promise<{
        count: number;
    }>;
    bulkDeactivateUsers(actor: RequestUser, dto: BulkIdsDto): Promise<{
        count: number;
    }>;
    bulkCompleteBookings(actor: RequestUser, dto: BulkIdsDto): Promise<{
        count: number;
    }>;
    globalSearch(q: string): Promise<{
        users: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            email: string;
            fullName: string;
        }[];
        bookings: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            startsAt: Date;
            endsAt: Date;
            listingTitle: string;
        }[];
        listings: {
            id: string;
            status: import("@prisma/client").$Enums.ListingStatus;
            title: string;
            city: string;
        }[];
        hosts: {
            id: string;
            userId: string;
            fullName: string;
            email: string;
            verificationStatus: import("@prisma/client").$Enums.HostVerificationStatus;
        }[];
    }>;
    getAdminActivity(page?: string, limit?: string, adminId?: string): Promise<{
        entries: ({
            actor: {
                email: string;
                fullName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            action: string;
            resourceType: string;
            resourceId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            actorUserId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getRateLimitStats(): {
        totalBlocked: number;
        topBlockedIPs: {
            ip: string;
            count: number;
        }[];
        recentBlocked: import("./rate-limit.service").BlockedEntry[];
    };
    getForecast(): Promise<{
        period: string;
        confirmedRevenue: number;
        expectedDeposits: number;
        expectedBalance: number;
        bookingCount: number;
    }[]>;
    submitStaffApplication(dto: ApplyStaffDto, actor?: RequestUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        propertyId: string | null;
        status: import("@prisma/client").$Enums.ApplicationStatus;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        applicantId: string | null;
        requestedLevel: import("@prisma/client").$Enums.AdminLevel;
        requestedService: import("@prisma/client").$Enums.ServiceType | null;
        justification: string;
    }>;
    getApplications(status?: string, page?: string, limit?: string): Promise<{
        applications: {
            id: string;
            email: string;
            fullName: string;
            createdAt: Date;
            updatedAt: Date;
            clusterId: string | null;
            propertyId: string | null;
            status: import("@prisma/client").$Enums.ApplicationStatus;
            reviewedBy: string | null;
            reviewNotes: string | null;
            reviewedAt: Date | null;
            applicantId: string | null;
            requestedLevel: import("@prisma/client").$Enums.AdminLevel;
            requestedService: import("@prisma/client").$Enums.ServiceType | null;
            justification: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    reviewApplication(actor: RequestUser, id: string, dto: ReviewApplicationDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        createdAt: Date;
        updatedAt: Date;
        clusterId: string | null;
        propertyId: string | null;
        status: import("@prisma/client").$Enums.ApplicationStatus;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        applicantId: string | null;
        requestedLevel: import("@prisma/client").$Enums.AdminLevel;
        requestedService: import("@prisma/client").$Enums.ServiceType | null;
        justification: string;
    }>;
    getStaff(search?: string, page?: string, limit?: string): Promise<{
        staff: {
            role: import("@prisma/client").$Enums.UserRole;
            staffRole: {
                createdAt: Date;
                level: import("@prisma/client").$Enums.AdminLevel;
                clusterId: string | null;
                propertyId: string | null;
                serviceType: import("@prisma/client").$Enums.ServiceType | null;
                revokedAt: Date | null;
            } | null;
            id: string;
            email: string;
            fullName: string;
            kind: import("@prisma/client").$Enums.UserKind | null;
            isActive: boolean;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    assignStaffRole(actor: RequestUser, userId: string, dto: AssignStaffRoleDto): Promise<{
        createdAt: Date;
        userId: string;
        level: import("@prisma/client").$Enums.AdminLevel;
        clusterId: string | null;
        propertyId: string | null;
        serviceType: import("@prisma/client").$Enums.ServiceType | null;
        revokedAt: Date | null;
        createdBy: string;
    }>;
    revokeStaffRole(actor: RequestUser, userId: string): Promise<{
        revoked: boolean;
    }>;
}
