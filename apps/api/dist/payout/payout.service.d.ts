import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
export declare class PayoutService {
    private readonly prisma;
    private readonly auditService;
    private readonly ledgerService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, ledgerService: LedgerService);
    markEligible(): Promise<number>;
    runWeeklyBatch(actorId: string): Promise<{
        batchId: string;
        totalAmount: number;
        lineCount: number;
        hostCount: number;
    }>;
    markBatchPaid(batchId: string, actorId: string): Promise<{
        batchId: string;
        status: string;
        totalAmount: number;
    }>;
    dryRunBatch(): Promise<{
        lineCount: number;
        totalAmount: number;
        hostCount: number;
        breakdown: Array<{
            hostId: string;
            hostName: string;
            hostEmail: string;
            lineCount: number;
            amount: number;
        }>;
    }>;
    getEligibleLines(): Promise<({
        host: {
            user: {
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
        };
        listing: {
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PayoutStatus;
        amount: number;
        listingId: string;
        hostId: string;
        bookingId: string;
        eligibleAt: Date;
        batchId: string | null;
    })[]>;
    getHostStatements(hostUserId: string): Promise<{
        hostId: string;
        totalEarned: number;
        totalPending: number;
        lines: ({
            listing: {
                title: string;
            };
            batch: {
                status: import("@prisma/client").$Enums.PayoutStatus;
                runDate: Date;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PayoutStatus;
            amount: number;
            listingId: string;
            hostId: string;
            bookingId: string;
            eligibleAt: Date;
            batchId: string | null;
        })[];
    }>;
    getBatches(): Promise<({
        _count: {
            lines: number;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PayoutStatus;
        runDate: Date;
        totalAmount: number;
    })[]>;
    handleRefundAfterPayout(bookingId: string, refundAmount: number, actorId: string | null): Promise<void>;
}
