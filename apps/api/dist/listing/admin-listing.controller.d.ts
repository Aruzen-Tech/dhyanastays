import { RequestUser } from '../common/decorators/current-user.decorator';
import { AdminReviewDto } from './dto/admin-review.dto';
import { ListingService } from './listing.service';
export declare class AdminListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    listPending(): Promise<({
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
    approve(user: RequestUser, id: string, dto: AdminReviewDto): Promise<{
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
    reject(user: RequestUser, id: string, dto: AdminReviewDto): Promise<{
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
    requestChanges(user: RequestUser, id: string, dto: AdminReviewDto): Promise<{
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
    listPendingHosts(): Promise<({
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
    approveHost(user: RequestUser, id: string): Promise<{
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
    rejectHost(user: RequestUser, id: string): Promise<{
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
}
