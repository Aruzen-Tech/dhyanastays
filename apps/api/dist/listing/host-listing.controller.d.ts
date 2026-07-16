import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { UpdatePreparationDto } from './dto/update-preparation.dto';
import { UpdateDirectionsDto } from '../guest-assistance/dto/update-directions.dto';
import { UpdateManualDto } from '../guest-assistance/dto/update-manual.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { AddSeasonalRateDto } from './dto/add-seasonal-rate.dto';
import { AddAvailabilityBlockDto } from './dto/add-availability-block.dto';
import { ListingService } from './listing.service';
export declare class HostListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    getProfile(user: RequestUser): Promise<{
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
    getMyListings(user: RequestUser): Promise<({
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
    })[]>;
    create(user: RequestUser, dto: CreateListingDto): Promise<({
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
    }) | null>;
    update(user: RequestUser, id: string, dto: UpdateListingDto): Promise<({
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
    }) | null>;
    getPreparation(user: RequestUser, id: string): Promise<{
        preparationGuide: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    updatePreparation(user: RequestUser, id: string, dto: UpdatePreparationDto): Promise<{
        id: string;
        preparationGuide: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getDirections(user: RequestUser, id: string): Promise<{
        propertyDirections: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    updateDirections(user: RequestUser, id: string, dto: UpdateDirectionsDto): Promise<{
        id: string;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getManual(user: RequestUser, id: string): Promise<{
        propertyManual: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    updateManual(user: RequestUser, id: string, dto: UpdateManualDto): Promise<{
        id: string;
        propertyManual: import("@prisma/client/runtime/library").JsonValue;
    }>;
    addMedia(user: RequestUser, id: string, dto: AddMediaDto): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        listingId: string;
        sortOrder: number;
        mediaType: string;
    }>;
    deleteMedia(user: RequestUser, id: string, mediaId: string): Promise<{
        deleted: boolean;
    }>;
    getAllTags(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        category: string;
    }[]>;
    getListingTags(id: string): Promise<({
        tag: {
            name: string;
            id: string;
            createdAt: Date;
            category: string;
        };
    } & {
        listingId: string;
        tagId: string;
    })[]>;
    setListingTags(user: RequestUser, id: string, body: {
        tagIds: string[];
    }): Promise<({
        tags: ({
            tag: {
                name: string;
                id: string;
                createdAt: Date;
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
    }) | null>;
    addSeasonalRate(user: RequestUser, id: string, dto: AddSeasonalRateDto): Promise<{
        id: string;
        createdAt: Date;
        listingId: string;
        startsAt: Date;
        endsAt: Date;
        nightlyRate: number;
    }>;
    getSeasonalRates(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        listingId: string;
        startsAt: Date;
        endsAt: Date;
        nightlyRate: number;
    }[]>;
    deleteSeasonalRate(user: RequestUser, id: string, rateId: string): Promise<{
        deleted: boolean;
    }>;
    addAvailabilityBlock(user: RequestUser, id: string, dto: AddAvailabilityBlockDto): Promise<{
        id: string;
        createdAt: Date;
        reason: string;
        listingId: string;
        startsAt: Date;
        endsAt: Date;
    }>;
    getAvailabilityBlocks(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        reason: string;
        listingId: string;
        startsAt: Date;
        endsAt: Date;
    }[]>;
    deleteAvailabilityBlock(user: RequestUser, id: string, blockId: string): Promise<{
        deleted: boolean;
    }>;
}
