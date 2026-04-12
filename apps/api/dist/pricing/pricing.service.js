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
exports.PricingService = exports.PLATFORM_FEE_RATE = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
exports.PLATFORM_FEE_RATE = 0.10;
let PricingService = class PricingService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const platformFee = Math.round((subtotal + cleaningFee) * exports.PLATFORM_FEE_RATE);
        const total = subtotal + cleaningFee + platformFee;
        const depositAmount = Math.round(total * 0.5);
        const balanceAmount = total - depositAmount;
        return {
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
            total,
            depositAmount,
            balanceAmount,
            currency: 'INR',
            snapshotAt: new Date().toISOString(),
        };
    }
    computeRefundAmount(totalPaid, checkIn, cancelledAt = new Date()) {
        const hoursUntilCheckIn = (checkIn.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
        if (hoursUntilCheckIn >= 48) {
            return totalPaid;
        }
        else if (hoursUntilCheckIn > 10) {
            return Math.round(totalPaid * 0.5);
        }
        else {
            return 0;
        }
    }
    diffDays(from, to) {
        return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map