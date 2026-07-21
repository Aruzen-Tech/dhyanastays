import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { AddSeasonalRateDto } from './dto/add-seasonal-rate.dto';
import { AddAvailabilityBlockDto } from './dto/add-availability-block.dto';
import { UpdatePreparationDto } from './dto/update-preparation.dto';
export declare class ListingService {
    private readonly prisma;
    private readonly notificationService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, config: ConfigService);
    createHostListing(userId: string, dto: CreateListingDto): Promise<({
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
    } & {
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
    }) | null>;
    updateHostListing(userId: string, listingId: string, dto: UpdateListingDto): Promise<({
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
    } & {
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
    }) | null>;
    getHostListings(userId: string): Promise<({
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
    } & {
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
    })[]>;
    getPendingListings(): Promise<({
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
    } & {
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
    })[]>;
    reviewListing(actorUserId: string, listingId: string, action: 'approve' | 'reject' | 'request_changes', note?: string): Promise<{
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
    getPublicListings(): Promise<({
        media: {
            id: string;
            createdAt: Date;
            url: string;
            mediaType: string;
            sortOrder: number;
            listingId: string;
        }[];
        tags: ({
            tag: {
                id: string;
                createdAt: Date;
                name: string;
                category: string;
            };
        } & {
            listingId: string;
            tagId: string;
        })[];
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
    } & {
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
    })[]>;
    getDiscoveryListings(params: {
        q?: string;
        city?: string;
        experienceTags?: string[];
        propertyType?: string;
        dietaryOptions?: string[];
        sort?: 'newest' | 'price-asc' | 'price-desc';
    }): Promise<({
        media: {
            id: string;
            createdAt: Date;
            url: string;
            mediaType: string;
            sortOrder: number;
            listingId: string;
        }[];
        tags: ({
            tag: {
                id: string;
                createdAt: Date;
                name: string;
                category: string;
            };
        } & {
            listingId: string;
            tagId: string;
        })[];
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
    } & {
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
    })[]>;
    getListingsByBounds(swLat: number, swLng: number, neLat: number, neLng: number): Promise<({
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
    } & {
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
    })[]>;
    getPublicListingById(id: string): Promise<{
        host: {
            user: {
                fullName: string;
            };
            userId: string;
        };
        media: {
            id: string;
            createdAt: Date;
            url: string;
            mediaType: string;
            sortOrder: number;
            listingId: string;
        }[];
        tags: ({
            tag: {
                id: string;
                createdAt: Date;
                name: string;
                category: string;
            };
        } & {
            listingId: string;
            tagId: string;
        })[];
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
    } & {
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
    searchListings(q: string): Promise<({
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
    } & {
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
    })[]>;
    addMedia(userId: string, listingId: string, dto: AddMediaDto): Promise<{
        id: string;
        createdAt: Date;
        url: string;
        mediaType: string;
        sortOrder: number;
        listingId: string;
    }>;
    deleteMedia(userId: string, listingId: string, mediaId: string): Promise<{
        deleted: boolean;
    }>;
    addSeasonalRate(userId: string, listingId: string, dto: AddSeasonalRateDto): Promise<{
        id: string;
        createdAt: Date;
        startsAt: Date;
        endsAt: Date;
        nightlyRate: number;
        listingId: string;
    }>;
    getSeasonalRates(userId: string, listingId: string): Promise<{
        id: string;
        createdAt: Date;
        startsAt: Date;
        endsAt: Date;
        nightlyRate: number;
        listingId: string;
    }[]>;
    deleteSeasonalRate(userId: string, listingId: string, rateId: string): Promise<{
        deleted: boolean;
    }>;
    addAvailabilityBlock(userId: string, listingId: string, dto: AddAvailabilityBlockDto): Promise<{
        id: string;
        createdAt: Date;
        reason: string;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
    }>;
    getAvailabilityBlocks(userId: string, listingId: string): Promise<{
        id: string;
        createdAt: Date;
        reason: string;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
    }[]>;
    deleteAvailabilityBlock(userId: string, listingId: string, blockId: string): Promise<{
        deleted: boolean;
    }>;
    getAllTags(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        category: string;
    }[]>;
    setListingTags(userId: string, listingId: string, tagIds: string[]): Promise<({
        tags: ({
            tag: {
                id: string;
                createdAt: Date;
                name: string;
                category: string;
            };
        } & {
            listingId: string;
            tagId: string;
        })[];
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
    } & {
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
    }) | null>;
    getListingTags(listingId: string): Promise<({
        tag: {
            id: string;
            createdAt: Date;
            name: string;
            category: string;
        };
    } & {
        listingId: string;
        tagId: string;
    })[]>;
    private verifyOwnership;
    private sendListingReviewNotification;
    getPreparationGuide(userId: string, listingId: string): Promise<{
        preparationGuide: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    }>;
    updatePreparationGuide(userId: string, listingId: string, dto: UpdatePreparationDto): Promise<{
        id: string;
        preparationGuide: Prisma.JsonValue;
    }>;
    getPreparationForBooking(userId: string, bookingId: string): Promise<{
        bookingId: string;
        listingTitle: string;
        preparationGuide: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    }>;
    getDirections(userId: string, listingId: string): Promise<{
        propertyDirections: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    }>;
    updateDirections(userId: string, listingId: string, dto: object): Promise<{
        id: string;
        propertyDirections: Prisma.JsonValue;
    }>;
    getManual(userId: string, listingId: string): Promise<{
        propertyManual: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    }>;
    updateManual(userId: string, listingId: string, dto: object): Promise<{
        id: string;
        propertyManual: Prisma.JsonValue;
    }>;
    private isReapprovalTriggered;
    private writeAudit;
    private meiliIndex;
    private meiliDelete;
}
