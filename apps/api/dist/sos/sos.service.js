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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SosService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const admin_notification_service_1 = require("../admin/admin-notification.service");
const jobs_constants_1 = require("../jobs/jobs.constants");
let SosService = SosService_1 = class SosService {
    constructor(prisma, auditService, adminNotifications, broadcastQueue) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.adminNotifications = adminNotifications;
        this.broadcastQueue = broadcastQueue;
        this.logger = new common_1.Logger(SosService_1.name);
    }
    async listTrustedContacts(userId) {
        return this.prisma.trustedContact.findMany({
            where: { userId },
            orderBy: [{ primary: 'desc' }, { createdAt: 'asc' }],
        });
    }
    async createTrustedContact(userId, dto) {
        if (dto.primary) {
            await this.prisma.trustedContact.updateMany({
                where: { userId, primary: true },
                data: { primary: false },
            });
        }
        return this.prisma.trustedContact.create({
            data: {
                userId,
                name: dto.name,
                phone: dto.phone ?? null,
                email: dto.email ?? null,
                relation: dto.relation,
                primary: dto.primary ?? false,
            },
        });
    }
    async updateTrustedContact(userId, id, dto) {
        const existing = await this.prisma.trustedContact.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new common_1.NotFoundException('trusted contact not found');
        }
        if (dto.primary) {
            await this.prisma.trustedContact.updateMany({
                where: { userId, primary: true, NOT: { id } },
                data: { primary: false },
            });
        }
        return this.prisma.trustedContact.update({
            where: { id },
            data: {
                name: dto.name,
                phone: dto.phone ?? null,
                email: dto.email ?? null,
                relation: dto.relation,
                primary: dto.primary ?? false,
            },
        });
    }
    async deleteTrustedContact(userId, id) {
        const existing = await this.prisma.trustedContact.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new common_1.NotFoundException('trusted contact not found');
        }
        await this.prisma.trustedContact.delete({ where: { id } });
        return { success: true };
    }
    async createIncident(userId, dto) {
        if (dto.bookingId) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: dto.bookingId },
                select: { guestId: true },
            });
            if (!booking || booking.guestId !== userId) {
                throw new common_1.BadRequestException('booking does not belong to user');
            }
        }
        const incident = await this.prisma.sosIncident.create({
            data: {
                userId,
                bookingId: dto.bookingId,
                tier: dto.tier,
                lat: dto.lat,
                lng: dto.lng,
                message: dto.message,
            },
        });
        await this.broadcastQueue.add('broadcast', { incidentId: incident.id }, {
            priority: 1,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 200,
            removeOnFail: 100,
        });
        await this.adminNotifications.create('SOS_OPENED', `SOS: ${dto.tier}`, `New ${dto.tier} incident at ${dto.lat.toFixed(4)}, ${dto.lng.toFixed(4)}${dto.message ? ` — "${dto.message}"` : ''}`, { incidentId: incident.id, userId, bookingId: dto.bookingId ?? null });
        await this.auditService.log(userId, 'SOS_CREATED', 'sos', incident.id, {
            tier: dto.tier,
            bookingId: dto.bookingId ?? null,
        });
        this.logger.warn(`SOS ${incident.id} opened by ${userId} (${dto.tier}) — enqueued broadcast`);
        return incident;
    }
    async getIncidentForUser(userId, id) {
        const incident = await this.prisma.sosIncident.findUnique({
            where: { id },
            include: { broadcasts: true },
        });
        if (!incident || incident.userId !== userId) {
            throw new common_1.NotFoundException('incident not found');
        }
        return incident;
    }
    async listMyIncidents(userId) {
        return this.prisma.sosIncident.findMany({
            where: { userId },
            orderBy: { openedAt: 'desc' },
            take: 20,
        });
    }
    async listIncidents(status) {
        return this.prisma.sosIncident.findMany({
            where: status ? { status } : undefined,
            orderBy: { openedAt: 'desc' },
            take: 100,
            include: {
                user: { select: { id: true, fullName: true, phone: true } },
                broadcasts: true,
            },
        });
    }
    async ackIncident(operatorId, id, _dto) {
        const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('incident not found');
        if (existing.status !== client_1.SosStatus.OPEN) {
            throw new common_1.BadRequestException(`incident already ${existing.status}`);
        }
        const updated = await this.prisma.sosIncident.update({
            where: { id },
            data: {
                status: client_1.SosStatus.ACKNOWLEDGED,
                ackedAt: new Date(),
                ackedBy: operatorId,
            },
        });
        await this.auditService.log(operatorId, 'SOS_ACKED', 'sos', id, {});
        return updated;
    }
    async startProgress(operatorId, id) {
        const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('incident not found');
        if (existing.status !== client_1.SosStatus.ACKNOWLEDGED &&
            existing.status !== client_1.SosStatus.OPEN) {
            throw new common_1.BadRequestException(`incident already ${existing.status}`);
        }
        const updated = await this.prisma.sosIncident.update({
            where: { id },
            data: {
                status: client_1.SosStatus.IN_PROGRESS,
                ackedAt: existing.ackedAt ?? new Date(),
                ackedBy: existing.ackedBy ?? operatorId,
            },
        });
        await this.auditService.log(operatorId, 'SOS_IN_PROGRESS', 'sos', id, {});
        return updated;
    }
    async getOpsMetrics(windowHours = 24) {
        const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const incidents = await this.prisma.sosIncident.findMany({
            where: { openedAt: { gte: since } },
            select: {
                id: true,
                openedAt: true,
                ackedAt: true,
                broadcasts: { select: { status: true } },
            },
        });
        const totalIncidents = incidents.length;
        const acked = incidents.filter((i) => i.ackedAt);
        const pendingAckCount = totalIncidents - acked.length;
        const SLA_TARGET_MS = 5000;
        const latencies = acked
            .map((i) => i.ackedAt.getTime() - i.openedAt.getTime())
            .sort((a, b) => a - b);
        const pct = (p) => {
            if (latencies.length === 0)
                return null;
            const idx = Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length));
            return latencies[idx];
        };
        let sent = 0;
        let failed = 0;
        let skipped = 0;
        for (const i of incidents) {
            for (const b of i.broadcasts) {
                if (b.status === 'SENT')
                    sent++;
                else if (b.status === 'FAILED')
                    failed++;
                else if (b.status === 'SKIPPED')
                    skipped++;
            }
        }
        const slaBreaches = latencies.filter((ms) => ms > SLA_TARGET_MS).length;
        return {
            windowHours,
            totalIncidents,
            ackedCount: acked.length,
            pendingAckCount,
            ackLatencyMs: {
                p50: pct(50),
                p95: pct(95),
                p99: pct(99),
                max: latencies.length > 0 ? latencies[latencies.length - 1] : null,
            },
            broadcastChannels: { sent, failed, skipped },
            slaBreaches,
        };
    }
    async listMessages(actorId, incidentId, role) {
        await this.assertIncidentAccess(actorId, incidentId, role);
        return this.prisma.sosMessage.findMany({
            where: { incidentId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async sendMessage(actorId, incidentId, role, content) {
        await this.assertIncidentAccess(actorId, incidentId, role);
        const trimmed = content.trim();
        if (!trimmed) {
            throw new common_1.BadRequestException('message content is required');
        }
        if (trimmed.length > 2000) {
            throw new common_1.BadRequestException('message too long (max 2000 chars)');
        }
        return this.prisma.sosMessage.create({
            data: {
                incidentId,
                senderId: actorId,
                senderRole: role,
                content: trimmed,
            },
        });
    }
    async getStatusTimeline(actorId, incidentId, role) {
        const incident = await this.assertIncidentAccess(actorId, incidentId, role);
        const timeline = [
            { status: 'OPENED', at: incident.openedAt.toISOString() },
        ];
        if (incident.ackedAt) {
            timeline.push({
                status: 'ACKNOWLEDGED',
                at: incident.ackedAt.toISOString(),
                note: 'Ops team has seen your alert and is responding.',
            });
        }
        if (incident.status === 'IN_PROGRESS') {
            timeline.push({
                status: 'IN_PROGRESS',
                at: (incident.ackedAt ?? incident.openedAt).toISOString(),
                note: 'Help is on the way.',
            });
        }
        if (incident.resolvedAt) {
            timeline.push({
                status: incident.status,
                at: incident.resolvedAt.toISOString(),
                note: incident.status === 'FALSE_ALARM'
                    ? 'Marked as a false alarm.'
                    : 'Incident resolved.',
            });
        }
        return { status: incident.status, timeline };
    }
    async assertIncidentAccess(actorId, incidentId, role) {
        const incident = await this.prisma.sosIncident.findUnique({
            where: { id: incidentId },
        });
        if (!incident)
            throw new common_1.NotFoundException('incident not found');
        if (role === 'GUEST' && incident.userId !== actorId) {
            throw new common_1.NotFoundException('incident not found');
        }
        return incident;
    }
    async resolveIncident(operatorId, id, dto) {
        const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('incident not found');
        if (existing.status === client_1.SosStatus.RESOLVED ||
            existing.status === client_1.SosStatus.FALSE_ALARM) {
            throw new common_1.BadRequestException(`incident already ${existing.status}`);
        }
        const updated = await this.prisma.sosIncident.update({
            where: { id },
            data: {
                status: dto.falseAlarm ? client_1.SosStatus.FALSE_ALARM : client_1.SosStatus.RESOLVED,
                resolvedAt: new Date(),
                resolvedBy: operatorId,
            },
        });
        await this.auditService.log(operatorId, dto.falseAlarm ? 'SOS_FALSE_ALARM' : 'SOS_RESOLVED', 'sos', id, { note: dto.note ?? null });
        return updated;
    }
};
exports.SosService = SosService;
exports.SosService = SosService = SosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_SOS_BROADCAST)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        admin_notification_service_1.AdminNotificationService,
        bullmq_2.Queue])
], SosService);
//# sourceMappingURL=sos.service.js.map