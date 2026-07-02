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
var PricingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = exports.SNAPSHOT_TTL_MS = exports.GST_RATE = exports.PLATFORM_FEE_RATE = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const price_snapshot_signer_service_1 = require("../common/services/price-snapshot-signer.service");
const add_on_service_1 = require("../add-on/add-on.service");
const membership_service_1 = require("../membership/membership.service");
exports.PLATFORM_FEE_RATE = 0.10;
exports.GST_RATE = 0.18;
exports.SNAPSHOT_TTL_MS = 30 * 60 * 1000;
let PricingService = PricingService_1 = class PricingService {
    constructor(prisma, snapshotSigner, addOnService, membershipService) {
        this.prisma = prisma;
        this.snapshotSigner = snapshotSigner;
        this.addOnService = addOnService;
        this.membershipService = membershipService;
    }
    async quote(dto) {
        const checkIn = new Date(dto.checkIn);
        const checkOut = new Date(dto.checkOut);
        if (checkIn >= checkOut) {
            throw new common_1.BadRequestException('checkOut must be after checkIn');
        }
        const nights = this.diffDays(checkIn, checkOut);
        if (nights < 1) {
            throw new common_1.BadRequestException('Minimum stay is 1 night');
        }
        const listing = await this.prisma.listing.findFirst({
            where: { id: dto.listingId, status: 'APPROVED' },
            include: {
                rateRules: true,
                seasonalRates: true,
            },
        });
        if (!listing) {
            throw new common_1.NotFoundException('Listing not found or not available');
        }
        const rateRule = listing.rateRules[0];
        if (!rateRule) {
            throw new common_1.BadRequestException('Listing has no rate configured');
        }
        if (dto.guests > rateRule.maxGuests) {
            throw new common_1.BadRequestException(`Listing supports max ${rateRule.maxGuests} guests`);
        }
        if (nights < rateRule.minNights) {
            throw new common_1.BadRequestException(`Minimum stay is ${rateRule.minNights} nights`);
        }
        const nightlyBreakdown = [];
        let subtotal = 0;
        for (let i = 0; i < nights; i++) {
            const nightDate = new Date(checkIn);
            nightDate.setDate(nightDate.getDate() + i);
            const seasonal = listing.seasonalRates.find((sr) => new Date(sr.startsAt) <= nightDate &&
                nightDate < new Date(sr.endsAt));
            const rate = seasonal ? seasonal.nightlyRate : rateRule.baseNightlyRate;
            nightlyBreakdown.push({
                date: nightDate.toISOString().split('T')[0],
                rate,
            });
            subtotal += rate;
        }
        const cleaningFee = rateRule.cleaningFee;
        const grossPlatformFee = Math.round((subtotal + cleaningFee) * exports.PLATFORM_FEE_RATE);
        let loyaltyDiscount = 0;
        let loyaltyTier;
        if (dto.userId) {
            const membership = await this.membershipService.getMembership(dto.userId);
            const rate = membership_service_1.TIER_DISCOUNT_RATE[membership.tier];
            if (rate > 0) {
                loyaltyDiscount = Math.round(grossPlatformFee * rate);
            }
            loyaltyTier = membership.tier;
        }
        const platformFee = grossPlatformFee - loyaltyDiscount;
        const addOnLines = await this.addOnService.buildSnapshotLines(dto.listingId, checkIn, dto.addOns ?? []);
        const addOnsTotal = addOnLines.reduce((s, l) => s + l.totalPrice, 0);
        const addOnCommissionTotal = addOnLines.reduce((s, l) => s + l.commission, 0);
        const gstBase = platformFee + addOnCommissionTotal;
        const gstAmount = Math.round(gstBase * exports.GST_RATE);
        const total = subtotal + cleaningFee + platformFee + addOnsTotal + gstAmount;
        const depositAmount = Math.round(total * 0.5);
        const balanceAmount = total - depositAmount;
        const splitFirst = (months) => {
            if (total <= 0)
                return 0;
            const base = Math.floor(total / months);
            const remainder = total - base * months;
            return base + (remainder > 0 ? 1 : 0);
        };
        const payLaterFirstInstalment = [
            { months: 3, amountMinor: splitFirst(3) },
            { months: 6, amountMinor: splitFirst(6) },
            { months: 12, amountMinor: splitFirst(12) },
        ];
        const snapshotAt = new Date();
        const snapshot = {
            listingId: dto.listingId,
            checkIn: dto.checkIn,
            checkOut: dto.checkOut,
            nights,
            guests: dto.guests,
            baseNightlyRate: rateRule.baseNightlyRate,
            nightlyBreakdown,
            subtotal,
            cleaningFee,
            platformFeeRate: exports.PLATFORM_FEE_RATE,
            platformFee,
            loyaltyDiscount,
            loyaltyTier,
            addOnsTotal,
            addOns: addOnLines.map((l) => ({
                addOnId: l.addOnId,
                providerId: l.providerId,
                title: l.title,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                totalPrice: l.totalPrice,
                commission: l.commission,
                providerShare: l.providerShare,
                cancellationTier: l.cancellationTier,
            })),
            gstRate: exports.GST_RATE,
            gstAmount,
            total,
            depositAmount,
            balanceAmount,
            payLaterFirstInstalment,
            currency: 'INR',
            snapshotAt: snapshotAt.toISOString(),
            expiresAt: new Date(snapshotAt.getTime() + exports.SNAPSHOT_TTL_MS).toISOString(),
        };
        snapshot.hmac = this.snapshotSigner.sign(snapshot);
        return snapshot;
    }
    static buildPolicySnapshot() {
        return {
            tiers: PricingService_1.LIVE_CANCELLATION_TIERS.map((t) => ({ ...t })),
            snapshotAt: new Date().toISOString(),
        };
    }
    computeRefundAmount(totalPaid, checkIn, cancelledAt = new Date(), policySnapshot) {
        const hoursUntilCheckIn = (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
        const tiers = policySnapshot?.tiers && policySnapshot.tiers.length > 0
            ? [...policySnapshot.tiers].sort((a, b) => b.minHoursBefore - a.minHoursBefore)
            : PricingService_1.LIVE_CANCELLATION_TIERS;
        for (const tier of tiers) {
            if (hoursUntilCheckIn >= tier.minHoursBefore) {
                return Math.round((totalPaid * tier.refundPct) / 100);
            }
        }
        return 0;
    }
    diffDays(from, to) {
        return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    }
};
exports.PricingService = PricingService;
PricingService.LIVE_CANCELLATION_TIERS = [
    { minHoursBefore: 48, refundPct: 100 },
    { minHoursBefore: 10.0001, refundPct: 50 },
    { minHoursBefore: 0, refundPct: 0 },
];
exports.PricingService = PricingService = PricingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        price_snapshot_signer_service_1.PriceSnapshotSignerService,
        add_on_service_1.AddOnService,
        membership_service_1.MembershipService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map