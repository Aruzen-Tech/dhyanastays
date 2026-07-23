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
var PayoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const ledger_service_1 = require("../common/services/ledger.service");
let PayoutService = PayoutService_1 = class PayoutService {
    constructor(prisma, auditService, ledgerService) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.ledgerService = ledgerService;
        this.logger = new common_1.Logger(PayoutService_1.name);
    }
    async markEligible() {
        const now = new Date();
        const result = await this.prisma.payoutLine.updateMany({
            where: {
                status: 'NOT_ELIGIBLE',
                eligibleAt: { lte: now },
            },
            data: { status: 'ELIGIBLE' },
        });
        if (result.count > 0) {
            this.logger.log(`Marked ${result.count} payout lines as ELIGIBLE`);
            await this.auditService.log(null, 'PAYOUT_ELIGIBILITY_MARKED', 'payout_line', 'batch', { count: result.count, at: now.toISOString() });
        }
        return result.count;
    }
    async runWeeklyBatch(actorId) {
        const eligibleLines = await this.prisma.payoutLine.findMany({
            where: { status: 'ELIGIBLE' },
            include: { host: { include: { user: true } } },
        });
        if (eligibleLines.length === 0) {
            throw new common_1.BadRequestException('No eligible payout lines found');
        }
        const totalAmount = eligibleLines.reduce((sum, l) => sum + l.amount, 0);
        const hostIds = new Set(eligibleLines.map((l) => l.hostId));
        const batch = await this.prisma.$transaction(async (tx) => {
            const created = await tx.payoutBatch.create({
                data: {
                    runDate: new Date(),
                    status: 'SCHEDULED',
                    totalAmount,
                },
            });
            await tx.payoutLine.updateMany({
                where: { status: 'ELIGIBLE' },
                data: {
                    status: 'SCHEDULED',
                    batchId: created.id,
                },
            });
            for (const line of eligibleLines) {
                await this.ledgerService.record({
                    type: 'PAYOUT_SCHEDULED',
                    amount: line.amount,
                    bookingId: line.bookingId,
                    payoutLineId: line.id,
                    metadata: {
                        batchId: created.id,
                        hostId: line.hostId,
                    },
                    tx,
                });
            }
            await this.auditService.log(actorId, 'PAYOUT_BATCH_CREATED', 'payout_batch', created.id, {
                totalAmount,
                lineCount: eligibleLines.length,
                hostCount: hostIds.size,
            }, tx);
            return created;
        });
        return {
            batchId: batch.id,
            totalAmount,
            lineCount: eligibleLines.length,
            hostCount: hostIds.size,
        };
    }
    async markBatchPaid(batchId, actorId) {
        const batch = await this.prisma.payoutBatch.findUnique({
            where: { id: batchId },
            include: { lines: true },
        });
        if (!batch)
            throw new common_1.NotFoundException('Payout batch not found');
        if (batch.status !== 'SCHEDULED') {
            throw new common_1.BadRequestException(`Batch is in status ${batch.status}, expected SCHEDULED`);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.payoutBatch.update({
                where: { id: batchId },
                data: { status: 'PAID' },
            });
            await tx.payoutLine.updateMany({
                where: { batchId },
                data: { status: 'PAID' },
            });
            for (const line of batch.lines) {
                await this.ledgerService.record({
                    type: 'PAYOUT_SENT',
                    amount: line.amount,
                    bookingId: line.bookingId,
                    payoutLineId: line.id,
                    metadata: { batchId },
                    tx,
                });
            }
            await this.auditService.log(actorId, 'PAYOUT_BATCH_PAID', 'payout_batch', batchId, { totalAmount: batch.totalAmount, lineCount: batch.lines.length }, tx);
        });
        return { batchId, status: 'PAID', totalAmount: batch.totalAmount };
    }
    async dryRunBatch() {
        const eligibleLines = await this.prisma.payoutLine.findMany({
            where: { status: 'ELIGIBLE' },
            include: {
                host: { include: { user: { select: { fullName: true, email: true } } } },
            },
        });
        if (eligibleLines.length === 0) {
            return { lineCount: 0, totalAmount: 0, hostCount: 0, breakdown: [] };
        }
        const byHost = new Map();
        for (const line of eligibleLines) {
            const existing = byHost.get(line.hostId);
            if (existing) {
                existing.lineCount++;
                existing.amount += line.amount;
            }
            else {
                const hostUser = line.host.user;
                byHost.set(line.hostId, {
                    hostId: line.hostId,
                    hostName: hostUser.fullName ?? '',
                    hostEmail: hostUser.email,
                    lineCount: 1,
                    amount: line.amount,
                });
            }
        }
        const breakdown = Array.from(byHost.values()).sort((a, b) => b.amount - a.amount);
        const totalAmount = eligibleLines.reduce((s, l) => s + l.amount, 0);
        return {
            lineCount: eligibleLines.length,
            totalAmount,
            hostCount: breakdown.length,
            breakdown,
        };
    }
    async getEligibleLines() {
        return this.prisma.payoutLine.findMany({
            where: { status: 'ELIGIBLE' },
            include: {
                host: { include: { user: { select: { fullName: true, email: true } } } },
                listing: { select: { title: true } },
            },
            orderBy: { eligibleAt: 'asc' },
        });
    }
    async getHostStatements(hostUserId) {
        const host = await this.prisma.host.findUnique({
            where: { userId: hostUserId },
        });
        if (!host)
            throw new common_1.NotFoundException('Host profile not found');
        const lines = await this.prisma.payoutLine.findMany({
            where: { hostId: host.id },
            include: {
                listing: { select: { title: true } },
                batch: { select: { runDate: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const totalEarned = lines
            .filter((l) => l.status === 'PAID')
            .reduce((sum, l) => sum + l.amount, 0);
        const totalPending = lines
            .filter((l) => ['ELIGIBLE', 'SCHEDULED', 'NOT_ELIGIBLE'].includes(l.status))
            .reduce((sum, l) => sum + l.amount, 0);
        return {
            hostId: host.id,
            totalEarned,
            totalPending,
            lines,
        };
    }
    async getBatches() {
        return this.prisma.payoutBatch.findMany({
            orderBy: { runDate: 'desc' },
            include: {
                _count: { select: { lines: true } },
            },
        });
    }
    async handleRefundAfterPayout(bookingId, refundAmount, actorId) {
        const payoutLine = await this.prisma.payoutLine.findFirst({
            where: { bookingId, status: 'PAID' },
        });
        if (!payoutLine)
            return;
        const carryForward = Math.min(refundAmount, payoutLine.amount);
        await this.ledgerService.record({
            type: 'BALANCE_CARRY_FORWARD',
            amount: -carryForward,
            bookingId,
            payoutLineId: payoutLine.id,
            metadata: {
                reason: 'refund_after_payout',
                refundAmount,
                carryForward,
            },
        });
        await this.auditService.log(actorId, 'PAYOUT_CARRY_FORWARD', 'payout_line', payoutLine.id, { refundAmount, carryForward, bookingId });
    }
};
exports.PayoutService = PayoutService;
exports.PayoutService = PayoutService = PayoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        ledger_service_1.LedgerService])
], PayoutService);
//# sourceMappingURL=payout.service.js.map