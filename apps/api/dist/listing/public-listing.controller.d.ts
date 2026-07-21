import { ListingService } from './listing.service';
export declare class PublicListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    getFeed(q?: string, city?: string, experienceTags?: string, propertyType?: string, dietaryOptions?: string, sort?: 'newest' | 'price-asc' | 'price-desc'): Promise<({
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
        preparationGuide: import("@prisma/client/runtime/library").JsonValue | null;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue | null;
        propertyManual: import("@prisma/client/runtime/library").JsonValue | null;
        experienceTags: string[];
        propertyType: string | null;
        dietaryOptions: string[];
        needsReapproval: boolean;
    })[]>;
    search(q?: string): Promise<({
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
        preparationGuide: import("@prisma/client/runtime/library").JsonValue | null;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue | null;
        propertyManual: import("@prisma/client/runtime/library").JsonValue | null;
        experienceTags: string[];
        propertyType: string | null;
        dietaryOptions: string[];
        needsReapproval: boolean;
    })[]>;
    getByBounds(swLat: string, swLng: string, neLat: string, neLng: string): Promise<({
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
        preparationGuide: import("@prisma/client/runtime/library").JsonValue | null;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue | null;
        propertyManual: import("@prisma/client/runtime/library").JsonValue | null;
        experienceTags: string[];
        propertyType: string | null;
        dietaryOptions: string[];
        needsReapproval: boolean;
    })[]>;
    getOne(id: string): Promise<{
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
        preparationGuide: import("@prisma/client/runtime/library").JsonValue | null;
        propertyDirections: import("@prisma/client/runtime/library").JsonValue | null;
        propertyManual: import("@prisma/client/runtime/library").JsonValue | null;
        experienceTags: string[];
        propertyType: string | null;
        dietaryOptions: string[];
        needsReapproval: boolean;
    }>;
    getAllTags(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        category: string;
    }[]>;
    getFacetVocabulary(): {
        experienceTags: readonly ["yoga", "meditation", "ayurveda", "sound-healing", "detox", "spa", "silent-retreat", "nature", "hiking", "cooking"];
        propertyTypes: readonly ["villa", "cottage", "ashram", "homestay", "resort", "farmstay", "boutique-hotel"];
        dietaryOptions: readonly ["vegetarian", "vegan", "gluten-free", "ayurvedic", "jain", "sattvic", "non-veg-available"];
    };
}
