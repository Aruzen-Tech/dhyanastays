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
exports.MembershipService = exports.TIER_DISCOUNT_RATE = exports.TIER_THRESHOLDS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
exports.TIER_THRESHOLDS = {
    EXPLORER: 0,
    WANDERER: 500,
    SOJOURNER: 1500,
    PATRON: 3500,
    AMBASSADOR: 7500,
};
const TIER_ORDER = [
    'EXPLORER',
    'WANDERER',
    'SOJOURNER',
    'PATRON',
    'AMBASSADOR',
];
exports.TIER_DISCOUNT_RATE = {
    EXPLORER: 0,
    WANDERER: 0.05,
    SOJOURNER: 0.10,
    PATRON: 0.15,
    AMBASSADOR: 0.20,
};
function tierForPoints(points) {
    let result = 'EXPLORER';
    for (const tier of TIER_ORDER) {
        if (points >= exports.TIER_THRESHOLDS[tier])
            result = tier;
    }
    return result;
}
function nextThreshold(tier) {
    const idx = TIER_ORDER.indexOf(tier);
    if (idx < 0 || idx === TIER_ORDER.length - 1) {
        return exports.TIER_THRESHOLDS[tier];
    }
    return exports.TIER_THRESHOLDS[TIER_ORDER[idx + 1]];
}
let MembershipService = class MembershipService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureMembership(userId) {
        return this.prisma.membership.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                tier: 'EXPLORER',
                points: 0,
                nextTierAt: exports.TIER_THRESHOLDS.WANDERER,
            },
        });
    }
    async getMembership(userId) {
        const m = await this.ensureMembership(userId);
        return {
            tier: m.tier,
            points: m.points,
            tierSince: m.tierSince,
            nextTierAt: m.nextTierAt,
            pointsToNextTier: Math.max(0, m.nextTierAt - m.points),
            discountRate: exports.TIER_DISCOUNT_RATE[m.tier],
        };
    }
    async awardPoints(userId, deltaPoints, tx) {
        if (deltaPoints === 0)
            return;
        const client = tx ?? this.prisma;
        const current = await client.membership.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                tier: 'EXPLORER',
                points: 0,
                nextTierAt: exports.TIER_THRESHOLDS.WANDERER,
            },
        });
        const newPoints = Math.max(0, current.points + deltaPoints);
        const computedTier = tierForPoints(newPoints);
        const newTier = TIER_ORDER.indexOf(computedTier) > TIER_ORDER.indexOf(current.tier)
            ? computedTier
            : current.tier;
        await client.membership.update({
            where: { userId },
            data: {
                points: newPoints,
                tier: newTier,
                tierSince: newTier !== current.tier ? new Date() : current.tierSince,
                nextTierAt: nextThreshold(newTier),
            },
        });
    }
    pointsForPaise(paise) {
        return Math.floor(paise / 10000);
    }
    async getPerksForUser(userId) {
        const m = await this.ensureMembership(userId);
        const eligibleTiers = TIER_ORDER.slice(0, TIER_ORDER.indexOf(m.tier) + 1);
        const perks = await this.prisma.perk.findMany({
            where: { active: true, tier: { in: eligibleTiers } },
            orderBy: [{ tier: 'asc' }, { createdAt: 'asc' }],
        });
        return { tier: m.tier, perks };
    }
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MembershipService);
//# sourceMappingURL=membership.service.js.map