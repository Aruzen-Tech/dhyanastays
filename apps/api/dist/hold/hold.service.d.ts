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
        listingId: string;
        guestId: string;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
    }>;
    expireStaleHolds(): Promise<number>;
}
