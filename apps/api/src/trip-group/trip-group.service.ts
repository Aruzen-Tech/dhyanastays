import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseSplitMethod,
  TripGroupInviteStatus,
  TripGroupRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class TripGroupService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Groups ──────────────────────────────────────────────────────────────────

  async listForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });
    if (!user) throw new NotFoundException('User not found');

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

  async create(userId: string, dto: CreateTripGroupDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.startsAt && dto.endsAt) {
      const start = new Date(dto.startsAt);
      const end = new Date(dto.endsAt);
      if (end.getTime() < start.getTime()) {
        throw new BadRequestException('endsAt must be after startsAt');
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
            role: TripGroupRole.OWNER,
            status: TripGroupInviteStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        },
      },
      include: { members: true },
    });
  }

  async getDetail(userId: string, groupId: string) {
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

  async delete(userId: string, groupId: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only owner can delete');
    await this.prisma.tripGroup.delete({ where: { id: groupId } });
    return { deleted: true };
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  async inviteMember(userId: string, groupId: string, dto: InviteMemberDto) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only owner can invite');

    const existing = await this.prisma.tripGroupMember.findUnique({
      where: { groupId_email: { groupId, email: dto.email } },
    });
    if (existing) throw new BadRequestException('Email already invited');

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
        role: TripGroupRole.MEMBER,
        status: TripGroupInviteStatus.PENDING,
      },
    });
  }

  async acceptInvite(userId: string, groupId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const member = await this.prisma.tripGroupMember.findFirst({
      where: {
        groupId,
        OR: [{ userId }, { email: user.email }],
      },
    });
    if (!member) throw new NotFoundException('Invitation not found');
    return this.prisma.tripGroupMember.update({
      where: { id: member.id },
      data: {
        userId,
        status: TripGroupInviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async removeMember(userId: string, groupId: string, memberId: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only owner can remove');
    const member = await this.prisma.tripGroupMember.findUnique({ where: { id: memberId } });
    if (!member || member.groupId !== groupId) throw new NotFoundException('Member not found');
    if (member.role === TripGroupRole.OWNER) {
      throw new BadRequestException('Cannot remove owner');
    }
    await this.prisma.tripGroupMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  // ── Expenses ────────────────────────────────────────────────────────────────

  async createExpense(userId: string, groupId: string, dto: CreateExpenseDto) {
    await this.assertMemberAccess(userId, groupId);

    let shares: { memberId: string; amountMinor: number }[];
    if (dto.method === 'EQUAL') {
      if (!dto.memberIds || dto.memberIds.length === 0) {
        throw new BadRequestException('memberIds required for EQUAL split');
      }
      const base = Math.floor(dto.totalMinor / dto.memberIds.length);
      const remainder = dto.totalMinor - base * dto.memberIds.length;
      shares = dto.memberIds.map((memberId, idx) => ({
        memberId,
        amountMinor: base + (idx === 0 ? remainder : 0),
      }));
    } else {
      if (!dto.shares || dto.shares.length === 0) {
        throw new BadRequestException('shares required for CUSTOM split');
      }
      const total = dto.shares.reduce((s, x) => s + x.amountMinor, 0);
      if (total !== dto.totalMinor) {
        throw new BadRequestException('Share amounts must sum to totalMinor');
      }
      shares = dto.shares.map((s) => ({ memberId: s.memberId, amountMinor: s.amountMinor }));
    }

    const memberIds = shares.map((s) => s.memberId);
    const members = await this.prisma.tripGroupMember.findMany({
      where: { id: { in: memberIds }, groupId },
      select: { id: true, userId: true },
    });
    if (members.length !== memberIds.length) {
      throw new BadRequestException('One or more memberIds do not belong to this group');
    }
    const memberById = new Map(members.map((m) => [m.id, m.userId]));

    return this.prisma.expenseSplit.create({
      data: {
        groupId,
        createdById: userId,
        title: dto.title,
        totalMinor: dto.totalMinor,
        method: dto.method as ExpenseSplitMethod,
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

  async markShareSettled(
    userId: string,
    groupId: string,
    expenseId: string,
    shareId: string,
    settled: boolean,
  ) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only owner can mark settled');
    const share = await this.prisma.expenseSplitShare.findUnique({
      where: { id: shareId },
      include: { expense: true },
    });
    if (!share || share.expense.groupId !== groupId || share.expenseId !== expenseId) {
      throw new NotFoundException('Share not found');
    }
    return this.prisma.expenseSplitShare.update({
      where: { id: shareId },
      data: { settledAt: settled ? new Date() : null },
    });
  }

  async deleteExpense(userId: string, groupId: string, expenseId: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    const expense = await this.prisma.expenseSplit.findUnique({ where: { id: expenseId } });
    if (!expense || expense.groupId !== groupId) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.createdById !== userId && group.ownerId !== userId) {
      throw new ForbiddenException('Only creator or owner can delete');
    }
    await this.prisma.expenseSplit.delete({ where: { id: expenseId } });
    return { deleted: true };
  }

  async getBalances(userId: string, groupId: string) {
    await this.assertMemberAccess(userId, groupId);
    const expenses = await this.prisma.expenseSplit.findMany({
      where: { groupId },
      include: { shares: true, createdBy: { select: { id: true } } },
    });
    const balances: Record<string, { memberId: string; owedMinor: number; paidMinor: number; netMinor: number }> = {};
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
        if (share.settledAt) continue;
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async assertMemberAccess(userId: string, groupId: string) {
    const group = await this.prisma.tripGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId === userId) return group;
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
    if (!isMember) throw new ForbiddenException('Not a member of this group');
    return group;
  }
}
