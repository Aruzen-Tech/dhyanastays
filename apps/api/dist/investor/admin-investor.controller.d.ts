import { CapitalCallStatus } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { InvestorService } from './investor.service';
import { UpsertInvestmentDto } from './dto/upsert-investment.dto';
import { CreateCapitalCallDto, UpdateCapitalCallDto } from './dto/upsert-capital-call.dto';
import { UploadInvestorDocumentDto } from './dto/upload-investor-document.dto';
import { RecomputeDistributionDto, UpdateDistributionDto } from './dto/recompute-distribution.dto';
export declare class AdminInvestorController {
    private readonly service;
    constructor(service: InvestorService);
    listInvestments(investorUserId?: string, listingId?: string): import("@prisma/client").Prisma.PrismaPromise<({
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
        sharePct: import("@prisma/client/runtime/library").Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    })[]>;
    createInvestment(dto: UpsertInvestmentDto, user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        listingId: string;
        investorUserId: string;
        sharePct: import("@prisma/client/runtime/library").Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    }>;
    updateInvestment(id: string, dto: Partial<UpsertInvestmentDto>, user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        listingId: string;
        investorUserId: string;
        sharePct: import("@prisma/client/runtime/library").Decimal;
        effectiveAt: Date;
        endedAt: Date | null;
        notes: string | null;
    }>;
    removeInvestment(id: string, user: RequestUser): Promise<void>;
    listCapitalCalls(listingId?: string, status?: CapitalCallStatus): import("@prisma/client").Prisma.PrismaPromise<({
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
    createCapitalCall(dto: CreateCapitalCallDto, user: RequestUser): Promise<{
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
    updateCapitalCall(id: string, dto: UpdateCapitalCallDto, user: RequestUser): Promise<{
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
    listDocuments(investorUserId?: string): import("@prisma/client").Prisma.PrismaPromise<({
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
    uploadDocument(dto: UploadInvestorDocumentDto, user: RequestUser): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.InvestorDocumentKind;
        url: string;
        title: string;
        investorUserId: string;
        uploadedById: string;
        uploadedAt: Date;
    }>;
    removeDocument(id: string, user: RequestUser): Promise<void>;
    listDistributions(period?: string): import("@prisma/client").Prisma.PrismaPromise<({
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
        breakdown: import("@prisma/client/runtime/library").JsonValue | null;
        ledgerEventId: string | null;
        computedAt: Date;
        paidAt: Date | null;
    })[]>;
    recomputeDistributions(dto: RecomputeDistributionDto, user: RequestUser): Promise<{
        period: string;
        computed: number;
        results: {
            investorUserId: string;
            amountMinor: number;
        }[];
    }>;
    updateDistribution(id: string, dto: UpdateDistributionDto, user: RequestUser): Promise<{
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
    }>;
}
