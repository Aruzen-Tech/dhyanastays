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
exports.HostQuickReplyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_QUICK_REPLIES_PER_HOST = 25;
let HostQuickReplyService = class HostQuickReplyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(hostUserId) {
        const host = await this.resolveHost(hostUserId);
        return this.prisma.hostQuickReply.findMany({
            where: { hostId: host.id },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async create(hostUserId, dto) {
        const host = await this.resolveHost(hostUserId);
        const count = await this.prisma.hostQuickReply.count({
            where: { hostId: host.id },
        });
        if (count >= MAX_QUICK_REPLIES_PER_HOST) {
            throw new common_1.ForbiddenException(`Limit reached: hosts may have at most ${MAX_QUICK_REPLIES_PER_HOST} quick replies.`);
        }
        return this.prisma.hostQuickReply.create({
            data: {
                hostId: host.id,
                label: dto.label.trim(),
                body: dto.body.trim(),
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }
    async update(hostUserId, id, dto) {
        const host = await this.resolveHost(hostUserId);
        const existing = await this.prisma.hostQuickReply.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Quick reply not found');
        if (existing.hostId !== host.id)
            throw new common_1.ForbiddenException();
        return this.prisma.hostQuickReply.update({
            where: { id },
            data: {
                label: dto.label.trim(),
                body: dto.body.trim(),
                sortOrder: dto.sortOrder ?? existing.sortOrder,
            },
        });
    }
    async remove(hostUserId, id) {
        const host = await this.resolveHost(hostUserId);
        const existing = await this.prisma.hostQuickReply.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Quick reply not found');
        if (existing.hostId !== host.id)
            throw new common_1.ForbiddenException();
        await this.prisma.hostQuickReply.delete({ where: { id } });
        return { success: true };
    }
    async resolveHost(hostUserId) {
        const host = await this.prisma.host.findUnique({
            where: { userId: hostUserId },
        });
        if (!host) {
            throw new common_1.ForbiddenException('User is not a registered host');
        }
        return host;
    }
};
exports.HostQuickReplyService = HostQuickReplyService;
exports.HostQuickReplyService = HostQuickReplyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HostQuickReplyService);
//# sourceMappingURL=host-quick-reply.service.js.map