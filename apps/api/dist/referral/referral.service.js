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
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const REFERRER_CREDIT_PAISE = 50000;
const REFERRED_CREDIT_PAISE = 25000;
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
let ReferralService = class ReferralService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getReferralInfo(userId) {
        let user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, referralCode: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!user.referralCode) {
            let code;
            let attempts = 0;
            do {
                code = generateCode();
                const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
                if (!existing)
                    break;
                attempts++;
            } while (attempts < 10);
            user = await this.prisma.user.update({
                where: { id: userId },
                data: { referralCode: code },
                select: { id: true, referralCode: true },
            });
        }
        const referrals = await this.prisma.referral.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                referrerCredit: true,
                creditedAt: true,
                createdAt: true,
                referredUser: { select: { fullName: true } },
            },
        });
        const totalEarned = referrals.reduce((sum, r) => sum + r.referrerCredit, 0);
        const creditBalance = await this.getCreditBalance(userId);
        return {
            referralCode: user.referralCode,
            shareUrl: `/auth/register?ref=${user.referralCode}`,
            referrerReward: REFERRER_CREDIT_PAISE,
            referredReward: REFERRED_CREDIT_PAISE,
            totalReferrals: referrals.length,
            creditedReferrals: referrals.filter((r) => r.status === 'CREDITED').length,
            totalEarned,
            creditBalance,
            referrals: referrals.map((r) => ({
                id: r.id,
                guestName: r.referredUser?.fullName ?? 'Pending sign-up',
                status: r.status,
                credit: r.referrerCredit,
                creditedAt: r.creditedAt,
                createdAt: r.createdAt,
            })),
        };
    }
    async getCreditBalance(userId) {
        const result = await this.prisma.creditLedger.aggregate({
            where: { userId },
            _sum: { amount: true },
        });
        return result._sum.amount ?? 0;
    }
    async getCreditLedger(userId) {
        const entries = await this.prisma.creditLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const balance = await this.getCreditBalance(userId);
        return { balance, entries };
    }
    async applyReferralCode(newUserId, referralCode) {
        const referrer = await this.prisma.user.findUnique({
            where: { referralCode },
            select: { id: true },
        });
        if (!referrer)
            throw new common_1.BadRequestException('Invalid referral code');
        if (referrer.id === newUserId)
            throw new common_1.BadRequestException('Cannot refer yourself');
        const existing = await this.prisma.referral.findUnique({
            where: { referredUserId: newUserId },
        });
        if (existing)
            return;
        await this.prisma.referral.create({
            data: {
                referrerId: referrer.id,
                referredUserId: newUserId,
                referralCode,
                status: 'SIGNED_UP',
            },
        });
    }
    async onReferredUserFirstBooking(userId) {
        const referral = await this.prisma.referral.findUnique({
            where: { referredUserId: userId },
            select: { id: true, referrerId: true, status: true },
        });
        if (!referral || referral.status === 'CREDITED')
            return;
        const completedCount = await this.prisma.booking.count({
            where: { guestId: userId, status: 'COMPLETED' },
        });
        if (completedCount !== 1)
            return;
        await this.prisma.$transaction([
            this.prisma.referral.update({
                where: { id: referral.id },
                data: {
                    status: 'CREDITED',
                    referrerCredit: REFERRER_CREDIT_PAISE,
                    referredCredit: REFERRED_CREDIT_PAISE,
                    creditedAt: new Date(),
                },
            }),
            this.prisma.creditLedger.create({
                data: {
                    userId: referral.referrerId,
                    amount: REFERRER_CREDIT_PAISE,
                    reason: 'referral_bonus',
                    referenceId: referral.id,
                },
            }),
            this.prisma.creditLedger.create({
                data: {
                    userId,
                    amount: REFERRED_CREDIT_PAISE,
                    reason: 'referred_welcome_credit',
                    referenceId: referral.id,
                },
            }),
        ]);
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map