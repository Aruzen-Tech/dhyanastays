import { ApplicationStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { ApplyStaffDto } from './dto/apply-staff.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { ChangeUserKindDto } from './dto/change-user-kind.dto';
import { BookingStateMachine } from '../booking/state-machine';
export declare class AdminService {
    private readonly prisma;
    private readonly auditService;
    private readonly stateMachine;
    constructor(prisma: PrismaService, auditService: AuditService, stateMachine: BookingStateMachine);
    private readonly SETTING_DEFAULTS;
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
            metadata: Prisma.JsonValue;
            actorUserId: string | null;
        })[];
    }>;
    getUsers(page: number, limit: number, role?: UserRole, search?: string): Promise<{
        users: {
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
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
    deactivateUser(userId: string, actorId: string): Promise<{
        id: string;
        email: string;
        passwordHash: string | null;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        kind: import("@prisma/client").$Enums.UserKind | null;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        avatarUrl: string | null;
        referralCode: string | null;
    }>;
    activateUser(userId: string, actorId: string): Promise<{
        id: string;
        email: string;
        passwordHash: string | null;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        kind: import("@prisma/client").$Enums.UserKind | null;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        avatarUrl: string | null;
        referralCode: string | null;
    }>;
    getAuditLog(page: number, limit: number, action?: string, resourceType?: string): Promise<{
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
            metadata: Prisma.JsonValue;
            actorUserId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getRevenueAnalytics(from: string, to: string, groupBy: 'day' | 'week' | 'month'): Promise<{
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
        media: {
            id: string;
            createdAt: Date;
            url: string;
            mediaType: string;
            sortOrder: number;
            listingId: string;
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
            startsAt: Date;
            endsAt: Date;
            nightlyRate: number;
            listingId: string;
        }[];
        availabilityBlocks: {
            id: string;
            createdAt: Date;
            reason: string;
            startsAt: Date;
            endsAt: Date;
            listingId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import("@prisma/client").$Enums.ListingStatus;
        hostId: string;
        createdById: string;
        title: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        timezone: string;
        preparationGuide: Prisma.JsonValue | null;
        propertyDirections: Prisma.JsonValue | null;
        propertyManual: Prisma.JsonValue | null;
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
    getRefunds(page: number, limit: number): Promise<{
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
    createRefund(actorId: string, dto: {
        bookingId: string;
        amount: number;
        reason: string;
    }): Promise<{
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
        updatedBy: string | null;
        value: Prisma.JsonValue;
    }[]>;
    updateSettings(actorId: string, updates: Array<{
        key: string;
        value: unknown;
    }>): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        updatedBy: string | null;
        value: Prisma.JsonValue;
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
    bulkApproveListings(actorId: string, ids: string[]): Promise<{
        count: number;
    }>;
    bulkDeactivateUsers(actorId: string, ids: string[]): Promise<{
        count: number;
    }>;
    bulkCompleteBookings(actorId: string, ids: string[]): Promise<{
        count: number;
    }>;
    globalSearch(q: string): Promise<{
        users: {
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
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
    getAdminActivity(page: number, limit: number, adminId?: string): Promise<{
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
            metadata: Prisma.JsonValue;
            actorUserId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    submitApplication(dto: ApplyStaffDto, applicantId?: string): Promise<{
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
    getApplications(page: number, limit: number, status?: ApplicationStatus): Promise<{
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
    reviewApplication(id: string, actorId: string, dto: ReviewApplicationDto): Promise<{
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
    getStaff(page: number, limit: number, search?: string): Promise<{
        staff: {
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
            role: import("@prisma/client").$Enums.UserRole;
            kind: import("@prisma/client").$Enums.UserKind | null;
            isActive: boolean;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    assignStaffRole(userId: string, actorId: string, dto: AssignStaffRoleDto): Promise<{
        createdAt: Date;
        userId: string;
        level: import("@prisma/client").$Enums.AdminLevel;
        clusterId: string | null;
        propertyId: string | null;
        serviceType: import("@prisma/client").$Enums.ServiceType | null;
        revokedAt: Date | null;
        createdBy: string;
    }>;
    revokeStaffRole(userId: string, actorId: string): Promise<{
        revoked: boolean;
    }>;
    changeUserKind(userId: string, actorId: string, dto: ChangeUserKindDto): Promise<{
        userId: string;
        kind: import("@prisma/client").$Enums.UserKind;
        role: "GUEST" | "HOST" | "ADMIN";
        staffLevel: import("@prisma/client").$Enums.AdminLevel | null;
    }>;
    getUserRoleHistory(userId: string): Promise<{
        user: {
            staffRole: {
                level: import("@prisma/client").$Enums.AdminLevel;
                revokedAt: Date | null;
            } | null;
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
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
            before: Prisma.JsonValue;
            after: Prisma.JsonValue;
            reason: string;
            createdAt: Date;
        }[];
    }>;
    getRevenueForecast(): Promise<{
        period: string;
        confirmedRevenue: number;
        expectedDeposits: number;
        expectedBalance: number;
        bookingCount: number;
    }[]>;
}
