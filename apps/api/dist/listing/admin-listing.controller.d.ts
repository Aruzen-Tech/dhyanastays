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
