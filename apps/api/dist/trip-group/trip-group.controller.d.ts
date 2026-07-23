import { RequestUser } from '../common/decorators/current-user.decorator';
import { TripGroupService } from './trip-group.service';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class TripGroupController {
    private readonly service;
    constructor(service: TripGroupService);
    list(user: RequestUser): Promise<({
        _count: {
            members: number;
            expenses: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    })[]>;
    create(user: RequestUser, dto: CreateTripGroupDto): Promise<{
        members: {
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.TripGroupRole;
            userId: string | null;
            status: import("@prisma/client").$Enums.TripGroupInviteStatus;
            groupId: string;
            invitedAt: Date;
            acceptedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    }>;
    detail(user: RequestUser, id: string): Promise<{
        viewerIsOwner: boolean;
        owner: {
            id: string;
            email: string;
            fullName: string;
        };
        members: {
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.TripGroupRole;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        notes: string | null;
        ownerId: string;
        destination: string | null;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        deleted: boolean;
    }>;
    invite(user: RequestUser, id: string, dto: InviteMemberDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.TripGroupRole;
        userId: string | null;
        status: import("@prisma/client").$Enums.TripGroupInviteStatus;
        groupId: string;
        invitedAt: Date;
        acceptedAt: Date | null;
    }>;
    accept(user: RequestUser, id: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.TripGroupRole;
        userId: string | null;
        status: import("@prisma/client").$Enums.TripGroupInviteStatus;
        groupId: string;
        invitedAt: Date;
        acceptedAt: Date | null;
    }>;
    removeMember(user: RequestUser, id: string, memberId: string): Promise<{
        deleted: boolean;
    }>;
    createExpense(user: RequestUser, id: string, dto: CreateExpenseDto): Promise<{
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
    deleteExpense(user: RequestUser, id: string, expenseId: string): Promise<{
        deleted: boolean;
    }>;
    markSettled(user: RequestUser, id: string, expenseId: string, shareId: string, settled: boolean): Promise<{
        id: string;
        userId: string | null;
        amountMinor: number;
        expenseId: string;
        memberId: string;
        settledAt: Date | null;
    }>;
    balances(user: RequestUser, id: string): Promise<Record<string, {
        memberId: string;
        owedMinor: number;
        paidMinor: number;
        netMinor: number;
    }>>;
}
