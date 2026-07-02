import { RequestUser } from '../common/decorators/current-user.decorator';
import { ReferralService } from './referral.service';
import { ApplyReferralDto } from './dto/apply-referral.dto';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
    getReferralInfo(user: RequestUser): Promise<{
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
    applyReferralCode(user: RequestUser, dto: ApplyReferralDto): Promise<void>;
    getCreditLedger(user: RequestUser): Promise<{
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
}
