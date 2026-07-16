import { RequestUser } from '../common/decorators/current-user.decorator';
import { MembershipService } from './membership.service';
import { SipService } from './sip.service';
import { StartSipDto } from './dto/start-sip.dto';
import { ContributeSipDto } from './dto/contribute-sip.dto';
import { SipStatusDto } from './dto/sip-status.dto';
export declare class MembershipController {
    private readonly membershipService;
    private readonly sipService;
    constructor(membershipService: MembershipService, sipService: SipService);
    getMembership(user: RequestUser): Promise<{
        tier: import("@prisma/client").$Enums.MemberTier;
        points: number;
        tierSince: Date;
        nextTierAt: number;
        pointsToNextTier: number;
        discountRate: number;
    }>;
    getPerks(user: RequestUser): Promise<{
        tier: import("@prisma/client").$Enums.MemberTier;
        perks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            active: boolean;
            tier: import("@prisma/client").$Enums.MemberTier;
        }[];
    }>;
    listSips(user: RequestUser): Promise<({
        _count: {
            contributions: number;
        };
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    })[]>;
    startSip(user: RequestUser, dto: StartSipDto): Promise<{
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }>;
    getSip(user: RequestUser, id: string): Promise<{
        contributions: {
            id: string;
            amountMinor: number;
            ledgerEventId: string;
            paymentRef: string | null;
            depositedAt: Date;
            sipId: string;
        }[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }>;
    getSipBalance(user: RequestUser, id: string): Promise<{
        balance: number;
    }>;
    setStatus(user: RequestUser, id: string, dto: SipStatusDto): Promise<{
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }>;
    contribute(user: RequestUser, id: string, dto: ContributeSipDto): Promise<{
        id: string;
        amountMinor: number;
        ledgerEventId: string;
        paymentRef: string | null;
        depositedAt: Date;
        sipId: string;
    }>;
}
