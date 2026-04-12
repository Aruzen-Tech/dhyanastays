import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
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
    create(user: RequestUser, dto: CreateListingDto): Promise<({
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
    update(user: RequestUser, id: string, dto: UpdateListingDto): Promise<{
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
