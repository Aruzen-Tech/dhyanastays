import { CapitalCallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { OutboxService } from '../notification/outbox.service';
import { UpsertInvestmentDto } from './dto/upsert-investment.dto';
import { CreateCapitalCallDto, UpdateCapitalCallDto } from './dto/upsert-capital-call.dto';
import { UploadInvestorDocumentDto } from './dto/upload-investor-document.dto';
import { RecomputeDistributionDto, UpdateDistributionDto } from './dto/recompute-distribution.dto';
export declare class InvestorService {
    private readonly prisma;
    private readonly audit;
    private readonly outbox;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, outbox: OutboxService);
    getPortfolio(investorUserId: string): Promise<{
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
    listDistributions(investorUserId: string, opts?: {
        from?: string;
        to?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DistributionStatus;
        investorUserId: string;
        period: string;
        amountMinor: number;
        currency: string;
        breakdown: Prisma.JsonValue | null;
        ledgerEventId: string | null;
        computedAt: Date;
        paidAt: Date | null;
    }[]>;
    listCapitalCallsForInvestor(investorUserId: string): Promise<{
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
    listDocuments(investorUserId: string): Prisma.PrismaPromise<({
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
    createInvestment(dto: UpsertInvestmentDto, actorUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        listingId: string;
        investorUserId: string;
        sharePct: Prisma.Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    }>;
    updateInvestment(id: string, dto: Partial<UpsertInvestmentDto>, actorUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        listingId: string;
        investorUserId: string;
        sharePct: Prisma.Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    }>;
    removeInvestment(id: string, actorUserId: string): Promise<void>;
    listInvestmentsAdmin(filters: {
        investorUserId?: string;
        listingId?: string;
    }): Prisma.PrismaPromise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
        };
        investor: {
            id: string;
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        listingId: string;
        investorUserId: string;
        sharePct: Prisma.Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    })[]>;
    createCapitalCall(dto: CreateCapitalCallDto, actorUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.CapitalCallStatus;
        reason: string;
        listingId: string;
        notes: string | null;
        amountMinor: number;
        dueAt: Date;
    }>;
    updateCapitalCall(id: string, dto: UpdateCapitalCallDto, actorUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.CapitalCallStatus;
        reason: string;
        listingId: string;
        notes: string | null;
        amountMinor: number;
        dueAt: Date;
    }>;
    listCapitalCallsAdmin(filters: {
        listingId?: string;
        status?: CapitalCallStatus;
    }): Prisma.PrismaPromise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.CapitalCallStatus;
        reason: string;
        listingId: string;
        notes: string | null;
        amountMinor: number;
        dueAt: Date;
    })[]>;
    uploadDocument(dto: UploadInvestorDocumentDto, actorUserId: string): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.InvestorDocumentKind;
        url: string;
        title: string;
        investorUserId: string;
        uploadedById: string;
        uploadedAt: Date;
    }>;
    removeDocument(id: string, actorUserId: string): Promise<void>;
    listDocumentsAdmin(investorUserId?: string): Prisma.PrismaPromise<({
        investor: {
            id: string;
            email: string;
            fullName: string;
        };
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
    recomputeDistributions(dto: RecomputeDistributionDto, actorUserId: string): Promise<{
        period: string;
        computed: number;
        results: {
            investorUserId: string;
            amountMinor: number;
        }[];
    }>;
    computeAndUpsertDistribution(investorUserId: string, period: string, periodStart: Date, periodEnd: Date): Promise<number>;
    listDistributionsAdmin(filters: {
        period?: string;
    }): Prisma.PrismaPromise<({
        investor: {
            id: string;
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DistributionStatus;
        investorUserId: string;
        period: string;
        amountMinor: number;
        currency: string;
        breakdown: Prisma.JsonValue | null;
        ledgerEventId: string | null;
        computedAt: Date;
        paidAt: Date | null;
    })[]>;
    updateDistribution(id: string, dto: UpdateDistributionDto, actorUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DistributionStatus;
        investorUserId: string;
        period: string;
        amountMinor: number;
        currency: string;
        breakdown: Prisma.JsonValue | null;
        ledgerEventId: string | null;
        computedAt: Date;
        paidAt: Date | null;
    }>;
    runMonthlyClose(now?: Date): Promise<{
        period: string;
        computed: number;
    }>;
    private assertInvestorKind;
    private assertListingExists;
    private snapshotRevenue;
    private notifyInvestorsOfCapitalCall;
}
