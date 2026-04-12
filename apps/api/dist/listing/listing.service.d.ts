import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
export declare class ListingService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    createHostListing(userId: string, dto: CreateListingDto): Promise<({
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            maxGuests: number;
            cleaningFee: number;
            minNights: number;
        }[];
    } & {
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
        timezone: string;
        needsReapproval: boolean;
    }) | null>;
    updateHostListing(userId: string, listingId: string, dto: UpdateListingDto): Promise<{
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
        timezone: string;
        needsReapproval: boolean;
    }>;
    getHostListings(userId: string): Promise<({
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            maxGuests: number;
            cleaningFee: number;
            minNights: number;
        }[];
    } & {
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
        timezone: string;
        needsReapproval: boolean;
    })[]>;
    getPendingListings(): Promise<({
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            maxGuests: number;
            cleaningFee: number;
            minNights: number;
        }[];
    } & {
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
        timezone: string;
        needsReapproval: boolean;
    })[]>;
    reviewListing(actorUserId: string, listingId: string, action: 'approve' | 'reject' | 'request_changes', note?: string): Promise<{
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
        timezone: string;
        needsReapproval: boolean;
    }>;
    getHostProfile(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        verificationStatus: import("@prisma/client").$Enums.HostVerificationStatus;
        payoutAccountRef: string | null;
        payoutEnabled: boolean;
    }>;
    getPendingHosts(): Promise<({
        user: {
            id: string;
            email: string;
            fullName: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        verificationStatus: import("@prisma/client").$Enums.HostVerificationStatus;
        payoutAccountRef: string | null;
        payoutEnabled: boolean;
    })[]>;
    reviewHost(actorUserId: string, hostId: string, action: 'approve' | 'reject'): Promise<{
        user: {
            id: string;
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
    }>;
    private sendListingReviewNotification;
    getPublicListings(): Promise<({
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            maxGuests: number;
            cleaningFee: number;
            minNights: number;
        }[];
    } & {
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
        timezone: string;
        needsReapproval: boolean;
    })[]>;
    getPublicListingById(id: string): Promise<{
        rateRules: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            listingId: string;
            baseNightlyRate: number;
            maxGuests: number;
            cleaningFee: number;
            minNights: number;
        }[];
    } & {
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
        timezone: string;
        needsReapproval: boolean;
    }>;
    private isReapprovalTriggered;
    private writeAudit;
}
