"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoldService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_service_1 = require("../pricing/pricing.service");
const audit_service_1 = require("../common/services/audit.service");
const serializable_retry_1 = require("../common/services/serializable-retry");
const HOLD_TTL_MINUTES = 15;
let HoldService = class HoldService {
    constructor(prisma, pricingService, auditService) {
        this.prisma = prisma;
        this.pricingService = pricingService;
        this.auditService = auditService;
    }
    async createHold(guestId, dto) {
        const existing = await this.prisma.hold.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
            if (existing.guestId !== guestId) {
                throw new common_1.ConflictException('Idempotency key belongs to another user');
            }
            return existing;
        }
        const checkIn = new Date(dto.checkIn);
        const checkOut = new Date(dto.checkOut);
        if (checkIn >= checkOut) {
            throw new common_1.BadRequestException('checkOut must be after checkIn');
        }
        const snapshot = await this.pricingService.quote({
            listingId: dto.listingId,
            checkIn: dto.checkIn,
            checkOut: dto.checkOut,
            guests: dto.guests,
            addOns: dto.addOns,
            userId: guestId,
        });
        const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);
        const hold = await (0, serializable_retry_1.withSerializableRetry)(this.prisma, async (tx) => {
            await tx.$executeRaw `
        SELECT id FROM "Listing" WHERE id = ${dto.listingId} FOR UPDATE
      `;
            const overlapping = await tx.booking.findFirst({
                where: {
                    listingId: dto.listingId,
                    status: {
                        in: [
                            'CONFIRMED_DEPOSIT',
                            'CONFIRMED_PAID',
                            'BALANCE_DUE',
                            'PAYMENT_PENDING',
                        ],
                    },
                    AND: [
                        { startsAt: { lt: checkOut } },
                        { endsAt: { gt: checkIn } },
                    ],
                },
            });
            if (overlapping) {
                throw new common_1.ConflictException('Listing is not available for the selected dates');
            }
            const overlappingHold = await tx.hold.findFirst({
                where: {
                    listingId: dto.listingId,
                    expiresAt: { gt: new Date() },
                    booking: null,
                    AND: [
                        { startsAt: { lt: checkOut } },
                        { endsAt: { gt: checkIn } },
                    ],
                },
            });
            if (overlappingHold) {
                throw new common_1.ConflictException('Listing is temporarily held for the selected dates. Try again in a few minutes.');
            }
            const blocked = await tx.availabilityBlock.findFirst({
                where: {
                    listingId: dto.listingId,
                    AND: [
                        { startsAt: { lt: checkOut } },
                        { endsAt: { gt: checkIn } },
                    ],
                },
            });
            if (blocked) {
                throw new common_1.ConflictException('Listing is blocked for the selected dates');
            }
            return tx.hold.create({
                data: {
                    listingId: dto.listingId,
                    guestId,
                    startsAt: checkIn,
                    endsAt: checkOut,
                    expiresAt,
                    priceSnapshot: snapshot,
                    idempotencyKey: dto.idempotencyKey,
                },
            });
        });
        await this.auditService.log(guestId, 'HOLD_CREATE', 'hold', hold.id, {
            listingId: dto.listingId,
            checkIn: dto.checkIn,
            checkOut: dto.checkOut,
            expiresAt: expiresAt.toISOString(),
            total: snapshot.total,
        });
        return hold;
    }
    async expireStaleHolds() {
        const BATCH = 200;
        const stale = await this.prisma.hold.findMany({
            where: {
                expiresAt: { lt: new Date() },
                booking: null,
            },
            select: { id: true, listingId: true },
            take: BATCH,
        });
        if (stale.length === 0)
            return 0;
        for (const h of stale) {
            await this.auditService.log(null, 'HOLD_EXPIRED', 'hold', h.id, {
                listingId: h.listingId,
            });
        }
        await this.prisma.hold.deleteMany({
            where: { id: { in: stale.map((h) => h.id) } },
        });
        return stale.length;
    }
};
exports.HoldService = HoldService;
exports.HoldService = HoldService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pricing_service_1.PricingService,
        audit_service_1.AuditService])
], HoldService);
//# sourceMappingURL=hold.service.js.map