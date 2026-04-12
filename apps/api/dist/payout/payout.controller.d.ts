import { RequestUser } from '../common/decorators/current-user.decorator';
import { PayoutService } from './payout.service';
export declare class PayoutController {
    private readonly payoutService;
    constructor(payoutService: PayoutService);
    getEligible(): Promise<({
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
        listingId: string;
        status: import("@prisma/client").$Enums.PayoutStatus;
        hostId: string;
        bookingId: string;
        amount: number;
        eligibleAt: Date;
        batchId: string | null;
    })[]>;
    runWeekly(user: RequestUser): Promise<{
        batchId: string;
        totalAmount: number;
        lineCount: number;
        hostCount: number;
    }>;
    markPaid(user: RequestUser, id: string): Promise<{
        batchId: string;
        status: string;
        totalAmount: number;
    }>;
    getBatches(): Promise<({
        _count: {
            lines: number;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PayoutStatus;
        totalAmount: number;
        runDate: Date;
    })[]>;
    getStatements(user: RequestUser): Promise<{
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
            listingId: string;
            status: import("@prisma/client").$Enums.PayoutStatus;
            hostId: string;
            bookingId: string;
            amount: number;
            eligibleAt: Date;
            batchId: string | null;
        })[];
    }>;
}
