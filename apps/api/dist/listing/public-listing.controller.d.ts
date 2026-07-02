import { ListingService } from './listing.service';
export declare class PublicListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    getFeed(q?: string, city?: string, experienceTags?: string, propertyType?: string, dietaryOptions?: string, sort?: 'newest' | 'price-asc' | 'price-desc'): Promise<({
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
    search(q?: string): Promise<({
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
    getByBounds(swLat: string, swLng: string, neLat: string, neLng: string): Promise<({
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
    getOne(id: string): Promise<{
        host: {
            user: {
                fullName: string;
            };
            userId: string;
        };
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
    }>;
    getAllTags(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        category: string;
    }[]>;
    getFacetVocabulary(): {
        experienceTags: readonly ["yoga", "meditation", "ayurveda", "sound-healing", "detox", "spa", "silent-retreat", "nature", "hiking", "cooking"];
        propertyTypes: readonly ["villa", "cottage", "ashram", "homestay", "resort", "farmstay", "boutique-hotel"];
        dietaryOptions: readonly ["vegetarian", "vegan", "gluten-free", "ayurvedic", "jain", "sattvic", "non-veg-available"];
    };
}
