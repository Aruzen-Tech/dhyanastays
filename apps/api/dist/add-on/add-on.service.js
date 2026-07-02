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
exports.AddOnService = void 0;
exports.refundRateForTier = refundRateForTier;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
let AddOnService = class AddOnService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async createServiceProvider(actorId, dto) {
        const owner = await this.prisma.user.findUnique({
            where: { id: dto.ownerUserId },
            select: { id: true, email: true },
        });
        if (!owner)
            throw new common_1.BadRequestException('Owner user not found');
        const provider = await this.prisma.serviceProvider.create({
            data: {
                name: dto.name,
                kind: dto.kind,
                ownerUserId: dto.ownerUserId,
                contactEmail: dto.contactEmail,
                contactPhone: dto.contactPhone,
            },
        });
        await this.audit.log(actorId, 'SERVICE_PROVIDER_CREATED', 'ServiceProvider', provider.id, { name: provider.name, kind: provider.kind });
        return provider;
    }
    async listServiceProviders(activeOnly = false) {
        return this.prisma.serviceProvider.findMany({
            where: activeOnly ? { active: true } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                owner: { select: { id: true, fullName: true, email: true } },
                _count: { select: { addOns: true } },
            },
        });
    }
    async setServiceProviderActive(actorId, id, active) {
        const provider = await this.prisma.serviceProvider.update({
            where: { id },
            data: { active },
        });
        await this.audit.log(actorId, active ? 'SERVICE_PROVIDER_ACTIVATED' : 'SERVICE_PROVIDER_DEACTIVATED', 'ServiceProvider', id, { name: provider.name });
        return provider;
    }
    async createAddOn(actorId, dto) {
        const provider = await this.prisma.serviceProvider.findUnique({
            where: { id: dto.providerId },
        });
        if (!provider || !provider.active) {
            throw new common_1.BadRequestException('Provider not found or inactive');
        }
        if (dto.scope === 'LISTING' && !dto.listingId) {
            throw new common_1.BadRequestException('listingId required when scope=LISTING');
        }
        const addOn = await this.prisma.addOn.create({
            data: {
                providerId: dto.providerId,
                title: dto.title,
                description: dto.description,
                priceMinor: dto.priceMinor,
                commissionRate: dto.commissionRate ?? 0.15,
                cancellationTier: dto.cancellationTier ?? 'MODERATE',
                minLeadHours: dto.minLeadHours ?? 24,
                maxPerBooking: dto.maxPerBooking ?? 1,
                scope: dto.scope ?? 'GLOBAL',
                clusterId: dto.clusterId,
                listingId: dto.listingId,
                status: 'PENDING',
            },
        });
        await this.audit.log(actorId, 'ADDON_CREATED', 'AddOn', addOn.id, {
            title: addOn.title,
            price: addOn.priceMinor,
        });
        return addOn;
    }
    async listAddOns(filter) {
        return this.prisma.addOn.findMany({
            where: {
                ...(filter?.status ? { status: filter.status } : {}),
                ...(filter?.providerId ? { providerId: filter.providerId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                provider: { select: { id: true, name: true, kind: true } },
                listing: { select: { id: true, title: true } },
            },
        });
    }
    async listPublicAddOnsForListing(listingId) {
        return this.prisma.addOn.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { scope: client_1.AddOnScope.GLOBAL },
                    { scope: client_1.AddOnScope.LISTING, listingId },
                ],
            },
            orderBy: [{ priceMinor: 'asc' }, { title: 'asc' }],
            include: {
                provider: { select: { id: true, name: true, kind: true } },
            },
        });
    }
    async approveAddOn(actorId, id, dto) {
        const addOn = await this.prisma.addOn.findUnique({ where: { id } });
        if (!addOn)
            throw new common_1.NotFoundException('Add-on not found');
        if (addOn.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Add-on is already ${addOn.status}`);
        }
        const updated = await this.prisma.addOn.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedBy: actorId,
                reviewNotes: dto.reviewNotes,
                reviewedAt: new Date(),
            },
        });
        await this.audit.log(actorId, 'ADDON_APPROVED', 'AddOn', id, {
            title: updated.title,
        });
        return updated;
    }
    async rejectAddOn(actorId, id, dto) {
        const addOn = await this.prisma.addOn.findUnique({ where: { id } });
        if (!addOn)
            throw new common_1.NotFoundException('Add-on not found');
        if (addOn.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Add-on is already ${addOn.status}`);
        }
        const updated = await this.prisma.addOn.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedBy: actorId,
                reviewNotes: dto.reviewNotes,
                reviewedAt: new Date(),
            },
        });
        await this.audit.log(actorId, 'ADDON_REJECTED', 'AddOn', id, {
            title: updated.title,
            notes: dto.reviewNotes,
        });
        return updated;
    }
    async retireAddOn(actorId, id) {
        const updated = await this.prisma.addOn.update({
            where: { id },
            data: { status: 'RETIRED' },
        });
        await this.audit.log(actorId, 'ADDON_RETIRED', 'AddOn', id, {
            title: updated.title,
        });
        return updated;
    }
    async buildSnapshotLines(listingId, checkIn, selections) {
        if (!selections || selections.length === 0)
            return [];
        const byId = new Map();
        for (const s of selections) {
            const existing = byId.get(s.addOnId);
            byId.set(s.addOnId, {
                addOnId: s.addOnId,
                quantity: (existing?.quantity ?? 0) + s.quantity,
            });
        }
        const ids = Array.from(byId.keys());
        const addOns = await this.prisma.addOn.findMany({
            where: { id: { in: ids } },
            include: { provider: { select: { id: true, active: true } } },
        });
        if (addOns.length !== ids.length) {
            throw new common_1.BadRequestException('One or more add-ons not found');
        }
        const now = Date.now();
        const minLeadMs = (hours) => hours * 60 * 60 * 1000;
        const lines = [];
        for (const addOn of addOns) {
            const sel = byId.get(addOn.id);
            if (addOn.status !== 'APPROVED') {
                throw new common_1.BadRequestException(`Add-on "${addOn.title}" is not available (${addOn.status})`);
            }
            if (!addOn.provider.active) {
                throw new common_1.BadRequestException(`Add-on "${addOn.title}" provider is inactive`);
            }
            if (addOn.scope === client_1.AddOnScope.LISTING &&
                addOn.listingId !== listingId) {
                throw new common_1.BadRequestException(`Add-on "${addOn.title}" is not available for this listing`);
            }
            if (sel.quantity > addOn.maxPerBooking) {
                throw new common_1.BadRequestException(`Add-on "${addOn.title}" is limited to ${addOn.maxPerBooking} per booking`);
            }
            if (checkIn.getTime() - now < minLeadMs(addOn.minLeadHours)) {
                throw new common_1.BadRequestException(`Add-on "${addOn.title}" requires at least ${addOn.minLeadHours}h lead time`);
            }
            const totalPrice = addOn.priceMinor * sel.quantity;
            const commission = Math.round(totalPrice * addOn.commissionRate);
            const providerShare = totalPrice - commission;
            lines.push({
                addOnId: addOn.id,
                providerId: addOn.providerId,
                title: addOn.title,
                quantity: sel.quantity,
                unitPrice: addOn.priceMinor,
                totalPrice,
                commission,
                providerShare,
                cancellationTier: addOn.cancellationTier,
            });
        }
        return lines;
    }
    async createBookingAddOns(tx, bookingId, snapshotLines, snapshotHmac) {
        if (snapshotLines.length === 0)
            return [];
        const rows = await Promise.all(snapshotLines.map((line) => tx.bookingAddOn.create({
            data: {
                bookingId,
                addOnId: line.addOnId,
                providerId: line.providerId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                totalPrice: line.totalPrice,
                commission: line.commission,
                providerShare: line.providerShare,
                state: 'CONFIRMED',
                snapshotHmac,
            },
        })));
        return rows;
    }
    async cancelBookingAddOns(tx, bookingId, checkIn, cancelledAt = new Date()) {
        const bookingAddOns = await tx.bookingAddOn.findMany({
            where: { bookingId, state: { notIn: ['CANCELLED', 'REFUNDED'] } },
            include: { addOn: { select: { cancellationTier: true } } },
        });
        let totalRefund = 0;
        const hoursUntil = (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
        for (const ba of bookingAddOns) {
            const refundRate = refundRateForTier(ba.addOn.cancellationTier, hoursUntil);
            const refundAmount = Math.round(ba.totalPrice * refundRate);
            await tx.bookingAddOn.update({
                where: { id: ba.id },
                data: {
                    state: refundAmount > 0 ? 'REFUNDED' : 'CANCELLED',
                    cancelledAt,
                    refundedAt: refundAmount > 0 ? cancelledAt : null,
                    refundAmount,
                },
            });
            totalRefund += refundAmount;
        }
        return totalRefund;
    }
    async getBookingAddOns(bookingId) {
        return this.prisma.bookingAddOn.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' },
            include: {
                addOn: {
                    select: {
                        title: true,
                        description: true,
                        cancellationTier: true,
                        provider: { select: { name: true, kind: true } },
                    },
                },
            },
        });
    }
};
exports.AddOnService = AddOnService;
exports.AddOnService = AddOnService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AddOnService);
function refundRateForTier(tier, hoursUntilCheckIn) {
    switch (tier) {
        case 'FLEXIBLE':
            return hoursUntilCheckIn >= 24 ? 1 : 0;
        case 'MODERATE':
            if (hoursUntilCheckIn >= 72)
                return 1;
            if (hoursUntilCheckIn >= 24)
                return 0.5;
            return 0;
        case 'STRICT':
            return hoursUntilCheckIn >= 168 ? 0.5 : 0;
        case 'NON_REFUNDABLE':
            return 0;
    }
}
//# sourceMappingURL=add-on.service.js.map