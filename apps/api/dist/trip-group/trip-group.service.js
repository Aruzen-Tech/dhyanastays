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
exports.TripGroupService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TripGroupService = class TripGroupService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, fullName: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const groups = await this.prisma.tripGroup.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { OR: [{ userId }, { email: user.email }] } } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { members: true, expenses: true } },
            },
        });
        return groups;
    }
    async create(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, fullName: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.startsAt && dto.endsAt) {
            const start = new Date(dto.startsAt);
            const end = new Date(dto.endsAt);
            if (end.getTime() < start.getTime()) {
                throw new common_1.BadRequestException('endsAt must be after startsAt');
            }
        }
        return this.prisma.tripGroup.create({
            data: {
                ownerId: userId,
                name: dto.name,
                destination: dto.destination ?? null,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
                notes: dto.notes ?? null,
                members: {
                    create: {
                        userId,
                        email: user.email,
                        fullName: user.fullName,
                        role: client_1.TripGroupRole.OWNER,
                        status: client_1.TripGroupInviteStatus.ACCEPTED,
                        acceptedAt: new Date(),
                    },
                },
            },
            include: { members: true },
        });
    }
    async getDetail(userId, groupId) {
        const group = await this.assertMemberAccess(userId, groupId);
        return this.prisma.tripGroup.findUniqueOrThrow({
            where: { id: groupId },
            include: {
                members: { orderBy: { invitedAt: 'asc' } },
                expenses: {
                    orderBy: { incurredAt: 'desc' },
                    include: {
                        shares: true,
                        createdBy: { select: { id: true, fullName: true } },
                    },
                },
                owner: { select: { id: true, fullName: true, email: true } },
            },
        }).then((g) => ({ ...g, viewerIsOwner: group.ownerId === userId }));
    }
    async delete(userId, groupId) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId !== userId)
            throw new common_1.ForbiddenException('Only owner can delete');
        await this.prisma.tripGroup.delete({ where: { id: groupId } });
        return { deleted: true };
    }
    async inviteMember(userId, groupId, dto) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId !== userId)
            throw new common_1.ForbiddenException('Only owner can invite');
        const existing = await this.prisma.tripGroupMember.findUnique({
            where: { groupId_email: { groupId, email: dto.email } },
        });
        if (existing)
            throw new common_1.BadRequestException('Email already invited');
        const invitee = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true },
        });
        return this.prisma.tripGroupMember.create({
            data: {
                groupId,
                email: dto.email,
                fullName: dto.fullName,
                userId: invitee?.id ?? null,
                role: client_1.TripGroupRole.MEMBER,
                status: client_1.TripGroupInviteStatus.PENDING,
            },
        });
    }
    async acceptInvite(userId, groupId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const member = await this.prisma.tripGroupMember.findFirst({
            where: {
                groupId,
                OR: [{ userId }, { email: user.email }],
            },
        });
        if (!member)
            throw new common_1.NotFoundException('Invitation not found');
        return this.prisma.tripGroupMember.update({
            where: { id: member.id },
            data: {
                userId,
                status: client_1.TripGroupInviteStatus.ACCEPTED,
                acceptedAt: new Date(),
            },
        });
    }
    async removeMember(userId, groupId, memberId) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId !== userId)
            throw new common_1.ForbiddenException('Only owner can remove');
        const member = await this.prisma.tripGroupMember.findUnique({ where: { id: memberId } });
        if (!member || member.groupId !== groupId)
            throw new common_1.NotFoundException('Member not found');
        if (member.role === client_1.TripGroupRole.OWNER) {
            throw new common_1.BadRequestException('Cannot remove owner');
        }
        await this.prisma.tripGroupMember.delete({ where: { id: memberId } });
        return { deleted: true };
    }
    async createExpense(userId, groupId, dto) {
        await this.assertMemberAccess(userId, groupId);
        let shares;
        if (dto.method === 'EQUAL') {
            if (!dto.memberIds || dto.memberIds.length === 0) {
                throw new common_1.BadRequestException('memberIds required for EQUAL split');
            }
            const base = Math.floor(dto.totalMinor / dto.memberIds.length);
            const remainder = dto.totalMinor - base * dto.memberIds.length;
            shares = dto.memberIds.map((memberId, idx) => ({
                memberId,
                amountMinor: base + (idx === 0 ? remainder : 0),
            }));
        }
        else {
            if (!dto.shares || dto.shares.length === 0) {
                throw new common_1.BadRequestException('shares required for CUSTOM split');
            }
            const total = dto.shares.reduce((s, x) => s + x.amountMinor, 0);
            if (total !== dto.totalMinor) {
                throw new common_1.BadRequestException('Share amounts must sum to totalMinor');
            }
            shares = dto.shares.map((s) => ({ memberId: s.memberId, amountMinor: s.amountMinor }));
        }
        const memberIds = shares.map((s) => s.memberId);
        const members = await this.prisma.tripGroupMember.findMany({
            where: { id: { in: memberIds }, groupId },
            select: { id: true, userId: true },
        });
        if (members.length !== memberIds.length) {
            throw new common_1.BadRequestException('One or more memberIds do not belong to this group');
        }
        const memberById = new Map(members.map((m) => [m.id, m.userId]));
        return this.prisma.expenseSplit.create({
            data: {
                groupId,
                createdById: userId,
                title: dto.title,
                totalMinor: dto.totalMinor,
                method: dto.method,
                notes: dto.notes ?? null,
                incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : new Date(),
                shares: {
                    create: shares.map((s) => ({
                        memberId: s.memberId,
                        userId: memberById.get(s.memberId) ?? null,
                        amountMinor: s.amountMinor,
                    })),
                },
            },
            include: { shares: true },
        });
    }
    async markShareSettled(userId, groupId, expenseId, shareId, settled) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId !== userId)
            throw new common_1.ForbiddenException('Only owner can mark settled');
        const share = await this.prisma.expenseSplitShare.findUnique({
            where: { id: shareId },
            include: { expense: true },
        });
        if (!share || share.expense.groupId !== groupId || share.expenseId !== expenseId) {
            throw new common_1.NotFoundException('Share not found');
        }
        return this.prisma.expenseSplitShare.update({
            where: { id: shareId },
            data: { settledAt: settled ? new Date() : null },
        });
    }
    async deleteExpense(userId, groupId, expenseId) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        const expense = await this.prisma.expenseSplit.findUnique({ where: { id: expenseId } });
        if (!expense || expense.groupId !== groupId) {
            throw new common_1.NotFoundException('Expense not found');
        }
        if (expense.createdById !== userId && group.ownerId !== userId) {
            throw new common_1.ForbiddenException('Only creator or owner can delete');
        }
        await this.prisma.expenseSplit.delete({ where: { id: expenseId } });
        return { deleted: true };
    }
    async getBalances(userId, groupId) {
        await this.assertMemberAccess(userId, groupId);
        const expenses = await this.prisma.expenseSplit.findMany({
            where: { groupId },
            include: { shares: true, createdBy: { select: { id: true } } },
        });
        const balances = {};
        const members = await this.prisma.tripGroupMember.findMany({ where: { groupId } });
        members.forEach((m) => {
            balances[m.id] = { memberId: m.id, owedMinor: 0, paidMinor: 0, netMinor: 0 };
        });
        for (const exp of expenses) {
            const creatorMember = members.find((m) => m.userId === exp.createdById);
            if (creatorMember) {
                balances[creatorMember.id].paidMinor += exp.totalMinor;
            }
            for (const share of exp.shares) {
                if (share.settledAt)
                    continue;
                if (balances[share.memberId]) {
                    balances[share.memberId].owedMinor += share.amountMinor;
                }
            }
        }
        Object.values(balances).forEach((b) => {
            b.netMinor = b.paidMinor - b.owedMinor;
        });
        return balances;
    }
    async assertMemberAccess(userId, groupId) {
        const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId === userId)
            return group;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        const isMember = await this.prisma.tripGroupMember.findFirst({
            where: {
                groupId,
                OR: [{ userId }, { email: user?.email ?? '' }],
            },
        });
        if (!isMember)
            throw new common_1.ForbiddenException('Not a member of this group');
        return group;
    }
};
exports.TripGroupService = TripGroupService;
exports.TripGroupService = TripGroupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripGroupService);
//# sourceMappingURL=trip-group.service.js.map