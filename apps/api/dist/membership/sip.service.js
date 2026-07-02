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
exports.SipService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const membership_service_1 = require("./membership.service");
const SIP_POINT_RATE_PAISE = 10000;
let SipService = class SipService {
    constructor(prisma, audit, membership) {
        this.prisma = prisma;
        this.audit = audit;
        this.membership = membership;
    }
    async startSip(userId, dto) {
        const existingActive = await this.prisma.tripSip.findFirst({
            where: { userId, status: 'ACTIVE' },
        });
        if (existingActive) {
            throw new common_1.BadRequestException('An active SIP already exists. Pause or close it before starting a new one.');
        }
        if (dto.monthlyMinor < 50000) {
            throw new common_1.BadRequestException('Minimum monthly SIP is ₹500');
        }
        if (dto.anchorDay < 1 || dto.anchorDay > 28) {
            throw new common_1.BadRequestException('Anchor day must be between 1 and 28');
        }
        const sip = await this.prisma.tripSip.create({
            data: {
                userId,
                monthlyMinor: dto.monthlyMinor,
                anchorDay: dto.anchorDay,
                status: 'ACTIVE',
            },
        });
        await this.audit.log(userId, 'SIP_STARTED', 'TripSip', sip.id, {
            monthlyMinor: dto.monthlyMinor,
            anchorDay: dto.anchorDay,
        });
        return sip;
    }
    async listSips(userId) {
        return this.prisma.tripSip.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            include: {
                _count: { select: { contributions: true } },
            },
        });
    }
    async getSip(userId, sipId) {
        const sip = await this.prisma.tripSip.findUnique({
            where: { id: sipId },
            include: {
                contributions: { orderBy: { depositedAt: 'desc' }, take: 50 },
            },
        });
        if (!sip || sip.userId !== userId)
            throw new common_1.NotFoundException('SIP not found');
        return sip;
    }
    async setStatus(userId, sipId, status) {
        const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
        if (!sip || sip.userId !== userId)
            throw new common_1.NotFoundException('SIP not found');
        if (sip.status === status)
            return sip;
        if (sip.status === 'CLOSED') {
            throw new common_1.BadRequestException('SIP is closed and cannot change status');
        }
        const updated = await this.prisma.tripSip.update({
            where: { id: sipId },
            data: {
                status,
                closedAt: status === 'CLOSED' ? new Date() : null,
            },
        });
        await this.audit.log(userId, `SIP_${status}`, 'TripSip', sipId, {
            previousStatus: sip.status,
        });
        return updated;
    }
    async recordContribution(userId, sipId, dto) {
        const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
        if (!sip || sip.userId !== userId)
            throw new common_1.NotFoundException('SIP not found');
        if (sip.status !== 'ACTIVE') {
            throw new common_1.BadRequestException(`Cannot contribute — SIP is ${sip.status}`);
        }
        if (dto.amountMinor <= 0) {
            throw new common_1.BadRequestException('amountMinor must be positive');
        }
        if (dto.paymentRef) {
            const existing = await this.prisma.sipContribution.findFirst({
                where: { sipId, paymentRef: dto.paymentRef },
            });
            if (existing)
                return existing;
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const ledger = await tx.creditLedger.create({
                data: {
                    userId,
                    amount: dto.amountMinor,
                    reason: 'sip_contribution',
                    referenceId: sipId,
                },
            });
            const contribution = await tx.sipContribution.create({
                data: {
                    sipId,
                    amountMinor: dto.amountMinor,
                    ledgerEventId: ledger.id,
                    paymentRef: dto.paymentRef,
                },
            });
            const points = Math.floor(dto.amountMinor / SIP_POINT_RATE_PAISE);
            if (points > 0) {
                await this.membership.awardPoints(userId, points, tx);
            }
            return { ledger, contribution };
        });
        await this.audit.log(userId, 'SIP_CONTRIBUTION', 'SipContribution', result.contribution.id, {
            sipId,
            amountMinor: dto.amountMinor,
            ledgerEventId: result.ledger.id,
            paymentRef: dto.paymentRef ?? null,
        });
        return result.contribution;
    }
    async getSipBalance(userId, sipId) {
        const sip = await this.prisma.tripSip.findUnique({ where: { id: sipId } });
        if (!sip || sip.userId !== userId)
            throw new common_1.NotFoundException('SIP not found');
        const agg = await this.prisma.sipContribution.aggregate({
            where: { sipId },
            _sum: { amountMinor: true },
        });
        return agg._sum.amountMinor ?? 0;
    }
    async listDueForAutodebit(today) {
        return this.prisma.tripSip.findMany({
            where: { status: 'ACTIVE', anchorDay: today.getDate() },
        });
    }
};
exports.SipService = SipService;
exports.SipService = SipService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        membership_service_1.MembershipService])
], SipService);
//# sourceMappingURL=sip.service.js.map