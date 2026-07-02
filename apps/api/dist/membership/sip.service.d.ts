import { SipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { MembershipService } from './membership.service';
import { StartSipDto } from './dto/start-sip.dto';
import { ContributeSipDto } from './dto/contribute-sip.dto';
export declare class SipService {
    private readonly prisma;
    private readonly audit;
    private readonly membership;
    constructor(prisma: PrismaService, audit: AuditService, membership: MembershipService);
    startSip(userId: string, dto: StartSipDto): Promise<{
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }>;
    listSips(userId: string): Promise<({
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
    getSip(userId: string, sipId: string): Promise<{
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
    setStatus(userId: string, sipId: string, status: SipStatus): Promise<{
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }>;
    recordContribution(userId: string, sipId: string, dto: ContributeSipDto): Promise<{
        id: string;
        amountMinor: number;
        ledgerEventId: string;
        paymentRef: string | null;
        depositedAt: Date;
        sipId: string;
    }>;
    getSipBalance(userId: string, sipId: string): Promise<number>;
    listDueForAutodebit(today: Date): Promise<{
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.SipStatus;
        closedAt: Date | null;
        monthlyMinor: number;
        anchorDay: number;
        startedAt: Date;
    }[]>;
}
