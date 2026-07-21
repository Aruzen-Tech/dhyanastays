import { RequestUser } from '../common/decorators/current-user.decorator';
import { InvestorService } from './investor.service';
export declare class InvestorController {
    private readonly service;
    constructor(service: InvestorService);
    portfolio(user: RequestUser): Promise<{
        investor: {
            investorProfile: {
                legalName: string;
                kycStatus: import("@prisma/client").$Enums.KycStatus;
                panMasked: string | null;
            } | null;
            id: string;
            email: string;
            fullName: string;
        };
        totals: {
            totalDistributedMinor: number;
            grossRevenueMinor: number;
            ownerSideNetMinor: number;
            investorShareMinor: number;
            activeListings: number;
        };
        investments: {
            investmentId: string;
            listingId: string;
            listing: {
                id: string;
                status: import("@prisma/client").$Enums.ListingStatus;
                title: string;
                city: string;
                state: string;
            };
            sharePct: number;
            effectiveAt: Date;
            endedAt: Date | null;
            bookingsCounted: number;
            grossRevenueMinor: number;
            ownerSideNetMinor: number;
            investorShareMinor: number;
        }[];
    }>;
    distributions(user: RequestUser, from?: string, to?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DistributionStatus;
        investorUserId: string;
        period: string;
        amountMinor: number;
        currency: string;
        breakdown: import("@prisma/client/runtime/library").JsonValue | null;
        ledgerEventId: string | null;
        computedAt: Date;
        paidAt: Date | null;
    }[]>;
    capitalCalls(user: RequestUser): Promise<{
        investorSharePct: number;
        investorShareMinor: number;
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.CapitalCallStatus;
        reason: string;
        listingId: string;
        notes: string | null;
        amountMinor: number;
        dueAt: Date;
    }[]>;
    documents(user: RequestUser): import("@prisma/client").Prisma.PrismaPromise<({
        uploadedBy: {
            id: string;
            fullName: string;
        };
    } & {
        id: string;
        kind: import("@prisma/client").$Enums.InvestorDocumentKind;
        url: string;
        title: string;
        investorUserId: string;
        uploadedById: string;
        uploadedAt: Date;
    })[]>;
}
