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
var OutboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_ATTEMPTS = 5;
const BACKOFF_SECONDS = [30, 120, 600, 3600];
let OutboxService = OutboxService_1 = class OutboxService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(OutboxService_1.name);
    }
    static backoffSeconds(attempts) {
        const idx = Math.min(attempts, BACKOFF_SECONDS.length - 1);
        return BACKOFF_SECONDS[idx];
    }
    static maxAttempts() {
        return MAX_ATTEMPTS;
    }
    async enqueue(params, tx) {
        if (params.channels.length === 0)
            return;
        const client = tx ?? this.prisma;
        const pref = await this.getPreference(params.userId, client);
        await client.notificationOutbox.createMany({
            data: params.channels.map((channel) => {
                const allowed = this.isChannelAllowed(pref, params.kind, channel);
                return {
                    userId: params.userId,
                    kind: params.kind,
                    channel,
                    payload: params.payload,
                    status: allowed ? client_1.OutboxStatus.PENDING : client_1.OutboxStatus.SKIPPED,
                };
            }),
        });
    }
    async claimPending(now = new Date(), limit = 50) {
        return this.prisma.notificationOutbox.findMany({
            where: {
                status: client_1.OutboxStatus.PENDING,
                nextAttemptAt: { lte: now },
                attempts: { lt: MAX_ATTEMPTS },
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
    async markSent(id) {
        await this.prisma.notificationOutbox.update({
            where: { id },
            data: { status: client_1.OutboxStatus.SENT, sentAt: new Date() },
        });
    }
    async recordFailure(id, error) {
        const row = await this.prisma.notificationOutbox.findUnique({
            where: { id },
            select: { attempts: true },
        });
        if (!row)
            return;
        const attempts = row.attempts + 1;
        const done = attempts >= MAX_ATTEMPTS;
        const nextAttemptAt = new Date(Date.now() + OutboxService_1.backoffSeconds(attempts) * 1000);
        await this.prisma.notificationOutbox.update({
            where: { id },
            data: {
                attempts,
                lastError: error.slice(0, 500),
                status: done ? client_1.OutboxStatus.FAILED : client_1.OutboxStatus.PENDING,
                nextAttemptAt,
            },
        });
        if (done) {
            this.logger.warn(`Outbox ${id} exhausted ${MAX_ATTEMPTS} attempts — marking FAILED`);
        }
    }
    async getPreference(userId, tx) {
        const client = tx ?? this.prisma;
        const row = await client.notificationPreference.findUnique({
            where: { userId },
        });
        return row?.channels || row
            ? {
                channels: row?.channels ?? undefined,
                quietHours: row?.quietHours ?? undefined,
            }
            : {};
    }
    async upsertPreference(userId, channels, quietHours) {
        return this.prisma.notificationPreference.upsert({
            where: { userId },
            create: {
                userId,
                channels: (channels ?? {}),
                quietHours: quietHours
                    ? quietHours
                    : client_1.Prisma.JsonNull,
            },
            update: {
                channels: (channels ?? {}),
                quietHours: quietHours
                    ? quietHours
                    : client_1.Prisma.JsonNull,
            },
        });
    }
    isChannelAllowed(pref, kind, channel) {
        const transactional = [
            'booking.confirmed',
            'booking.cancelled',
            'sos.ack',
        ];
        if (transactional.includes(kind))
            return true;
        const kindPref = pref.channels?.[kind];
        if (!kindPref)
            return true;
        const key = channel.toLowerCase();
        return kindPref[key] !== false;
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = OutboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map