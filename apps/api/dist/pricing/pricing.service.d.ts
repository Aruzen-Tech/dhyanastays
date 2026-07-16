import { PrismaService } from '../prisma/prisma.service';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import { AddOnService } from '../add-on/add-on.service';
import { MembershipService } from '../membership/membership.service';
import { PriceSnapshot, QuoteDto } from './dto/quote.dto';
export declare const PLATFORM_FEE_RATE = 0.1;
export declare const GST_RATE = 0.18;
export declare const SNAPSHOT_TTL_MS: number;
export declare class PricingService {
    private readonly prisma;
    private readonly snapshotSigner;
    private readonly addOnService;
    private readonly membershipService;
    constructor(prisma: PrismaService, snapshotSigner: PriceSnapshotSignerService, addOnService: AddOnService, membershipService: MembershipService);
    quote(dto: QuoteDto): Promise<PriceSnapshot>;
    static readonly LIVE_CANCELLATION_TIERS: ReadonlyArray<{
        minHoursBefore: number;
        refundPct: number;
    }>;
    static buildPolicySnapshot(): {
        tiers: {
            minHoursBefore: number;
            refundPct: number;
        }[];
        snapshotAt: string;
    };
    computeRefundAmount(totalPaid: number, checkIn: Date, cancelledAt?: Date, policySnapshot?: {
        tiers?: {
            minHoursBefore: number;
            refundPct: number;
        }[];
    } | null): number;
    private diffDays;
}
