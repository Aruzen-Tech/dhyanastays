import { MemberTier, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare const TIER_THRESHOLDS: Record<MemberTier, number>;
export declare const TIER_DISCOUNT_RATE: Record<MemberTier, number>;
export declare class MembershipService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureMembership(userId: string): Promise<{
        updatedAt: Date;
        userId: string;
        tier: import("@prisma/client").$Enums.MemberTier;
        points: number;
        tierSince: Date;
        nextTierAt: number;
    }>;
    getMembership(userId: string): Promise<{
        tier: import("@prisma/client").$Enums.MemberTier;
        points: number;
        tierSince: Date;
        nextTierAt: number;
        pointsToNextTier: number;
        discountRate: number;
    }>;
    awardPoints(userId: string, deltaPoints: number, tx?: Prisma.TransactionClient): Promise<void>;
    pointsForPaise(paise: number): number;
    getPerksForUser(userId: string): Promise<{
        tier: import("@prisma/client").$Enums.MemberTier;
        perks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            title: string;
            active: boolean;
            tier: import("@prisma/client").$Enums.MemberTier;
        }[];
    }>;
}
