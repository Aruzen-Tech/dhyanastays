import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../common/services/audit.service';
import { CreateHoldDto } from './dto/create-hold.dto';
export declare class HoldService {
    private readonly prisma;
    private readonly pricingService;
    private readonly auditService;
    constructor(prisma: PrismaService, pricingService: PricingService, auditService: AuditService);
    createHold(guestId: string, dto: CreateHoldDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        expiresAt: Date;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        guestId: string;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
    }>;
    releaseHold(guestId: string, holdId: string): Promise<{
        released: boolean;
        alreadyGone: boolean;
    } | {
        released: boolean;
        alreadyGone?: undefined;
    }>;
    getHoldStatus(guestId: string, listingId: string, checkIn: string, checkOut: string): Promise<{
        held: false;
        mine?: undefined;
        heldUntil?: undefined;
        remainingSeconds?: undefined;
    } | {
        held: true;
        mine: boolean;
        heldUntil: string;
        remainingSeconds: number;
    }>;
    expireStaleHolds(): Promise<number>;
}
