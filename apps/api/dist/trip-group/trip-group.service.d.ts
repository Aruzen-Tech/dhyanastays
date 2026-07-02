import { PrismaService } from '../prisma/prisma.service';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class TripGroupService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listForUser(userId: string): Promise<({
        _count: {
            members: number;
            expenses: number;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    })[]>;
    create(userId: string, dto: CreateTripGroupDto): Promise<{
        members: {
            role: import("@prisma/client").$Enums.TripGroupRole;
            id: string;
            email: string;
            fullName: string;
            userId: string | null;
            status: import("@prisma/client").$Enums.TripGroupInviteStatus;
            groupId: string;
            invitedAt: Date;
            acceptedAt: Date | null;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    }>;
    getDetail(userId: string, groupId: string): Promise<{
        viewerIsOwner: boolean;
        owner: {
            id: string;
            email: string;
            fullName: string;
        };
        members: {
            role: import("@prisma/client").$Enums.TripGroupRole;
            id: string;
            email: string;
            fullName: string;
            userId: string | null;
            status: import("@prisma/client").$Enums.TripGroupInviteStatus;
            groupId: string;
            invitedAt: Date;
            acceptedAt: Date | null;
        }[];
        expenses: ({
            createdBy: {
                id: string;
                fullName: string;
            };
            shares: {
                id: string;
                userId: string | null;
                amountMinor: number;
                expenseId: string;
                memberId: string;
                settledAt: Date | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string;
            title: string;
            notes: string | null;
            currency: string;
            totalMinor: number;
            groupId: string;
            method: import("@prisma/client").$Enums.ExpenseSplitMethod;
            incurredAt: Date;
        })[];
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    }>;
    delete(userId: string, groupId: string): Promise<{
        deleted: boolean;
    }>;
    inviteMember(userId: string, groupId: string, dto: InviteMemberDto): Promise<{
        role: import("@prisma/client").$Enums.TripGroupRole;
        id: string;
        email: string;
        fullName: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.TripGroupInviteStatus;
        groupId: string;
        invitedAt: Date;
        acceptedAt: Date | null;
    }>;
    acceptInvite(userId: string, groupId: string): Promise<{
        role: import("@prisma/client").$Enums.TripGroupRole;
        id: string;
        email: string;
        fullName: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.TripGroupInviteStatus;
        groupId: string;
        invitedAt: Date;
        acceptedAt: Date | null;
    }>;
    removeMember(userId: string, groupId: string, memberId: string): Promise<{
        deleted: boolean;
    }>;
    createExpense(userId: string, groupId: string, dto: CreateExpenseDto): Promise<{
        shares: {
            id: string;
            userId: string | null;
            amountMinor: number;
            expenseId: string;
            memberId: string;
            settledAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string;
        title: string;
        notes: string | null;
        currency: string;
        totalMinor: number;
        groupId: string;
        method: import("@prisma/client").$Enums.ExpenseSplitMethod;
        incurredAt: Date;
    }>;
    markShareSettled(userId: string, groupId: string, expenseId: string, shareId: string, settled: boolean): Promise<{
        id: string;
        userId: string | null;
        amountMinor: number;
        expenseId: string;
        memberId: string;
        settledAt: Date | null;
    }>;
    deleteExpense(userId: string, groupId: string, expenseId: string): Promise<{
        deleted: boolean;
    }>;
    getBalances(userId: string, groupId: string): Promise<Record<string, {
        memberId: string;
        owedMinor: number;
        paidMinor: number;
        netMinor: number;
    }>>;
    private assertMemberAccess;
}
