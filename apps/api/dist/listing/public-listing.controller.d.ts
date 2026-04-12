import { ListingService } from './listing.service';
export declare class PublicListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    getFeed(): Promise<({
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
    getOne(id: string): Promise<{
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
}
