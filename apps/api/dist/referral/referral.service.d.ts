import { PrismaService } from '../prisma/prisma.service';
export declare class ReferralService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getReferralInfo(userId: string): Promise<{
        referralCode: string | null;
        shareUrl: string;
        referrerReward: number;
        referredReward: number;
        totalReferrals: number;
        creditedReferrals: number;
        totalEarned: number;
        creditBalance: number;
        referrals: {
            id: string;
            guestName: string;
            status: import("@prisma/client").$Enums.ReferralStatus;
            credit: number;
            creditedAt: Date | null;
            createdAt: Date;
        }[];
    }>;
    getCreditBalance(userId: string): Promise<number>;
    getCreditLedger(userId: string): Promise<{
        balance: number;
        entries: {
            id: string;
            createdAt: Date;
            userId: string;
            amount: number;
            reason: string;
            referenceId: string | null;
        }[];
    }>;
    applyReferralCode(newUserId: string, referralCode: string): Promise<void>;
    onReferredUserFirstBooking(userId: string): Promise<void>;
}
