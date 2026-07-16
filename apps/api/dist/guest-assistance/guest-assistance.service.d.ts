import { IssueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
export declare class GuestAssistanceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getDirectionsForBooking(userId: string, bookingId: string): Promise<{
        bookingId: string;
        listingTitle: string;
        propertyDirections: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    getManualForBooking(userId: string, bookingId: string): Promise<{
        bookingId: string;
        listingTitle: string;
        propertyManual: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    createIssue(userId: string, bookingId: string, dto: CreateIssueDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IssueStatus;
        listingId: string;
        guestId: string;
        description: string;
        bookingId: string;
        category: import("@prisma/client").$Enums.IssueCategory;
        urgency: import("@prisma/client").$Enums.IssueUrgency;
        photoUrl: string | null;
        hostNotes: string | null;
        resolvedAt: Date | null;
    }>;
    getIssuesForBooking(userId: string, bookingId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IssueStatus;
        listingId: string;
        guestId: string;
        description: string;
        bookingId: string;
        category: import("@prisma/client").$Enums.IssueCategory;
        urgency: import("@prisma/client").$Enums.IssueUrgency;
        photoUrl: string | null;
        hostNotes: string | null;
        resolvedAt: Date | null;
    }[]>;
    getIssuesForHost(userId: string, status?: IssueStatus): Promise<({
        listing: {
            id: string;
            title: string;
        };
        booking: {
            id: string;
            startsAt: Date;
            endsAt: Date;
        };
        guest: {
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IssueStatus;
        listingId: string;
        guestId: string;
        description: string;
        bookingId: string;
        category: import("@prisma/client").$Enums.IssueCategory;
        urgency: import("@prisma/client").$Enums.IssueUrgency;
        photoUrl: string | null;
        hostNotes: string | null;
        resolvedAt: Date | null;
    })[]>;
    getAllIssues(status?: IssueStatus): Promise<({
        listing: {
            id: string;
            title: string;
        };
        booking: {
            id: string;
            startsAt: Date;
            endsAt: Date;
        };
        guest: {
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IssueStatus;
        listingId: string;
        guestId: string;
        description: string;
        bookingId: string;
        category: import("@prisma/client").$Enums.IssueCategory;
        urgency: import("@prisma/client").$Enums.IssueUrgency;
        photoUrl: string | null;
        hostNotes: string | null;
        resolvedAt: Date | null;
    })[]>;
    updateIssueStatus(userId: string, role: string, issueId: string, dto: UpdateIssueStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IssueStatus;
        listingId: string;
        guestId: string;
        description: string;
        bookingId: string;
        category: import("@prisma/client").$Enums.IssueCategory;
        urgency: import("@prisma/client").$Enums.IssueUrgency;
        photoUrl: string | null;
        hostNotes: string | null;
        resolvedAt: Date | null;
    }>;
    checkIn(userId: string, bookingId: string, dto: CheckInDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    checkOut(userId: string, bookingId: string, dto: CheckOutDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.BookingStatus;
        holdId: string;
        listingId: string;
        guestId: string;
        plan: import("@prisma/client").$Enums.PaymentPlan;
        startsAt: Date;
        endsAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        guestDetails: import("@prisma/client/runtime/library").JsonValue | null;
        checkInData: import("@prisma/client/runtime/library").JsonValue | null;
        checkOutData: import("@prisma/client/runtime/library").JsonValue | null;
        balanceDueAt: Date | null;
        payLaterMonths: number | null;
        acceptedTermsAt: Date | null;
        statusHistory: import("@prisma/client/runtime/library").JsonValue;
        cancellationPolicySnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getCheckInOutStatus(userId: string, bookingId: string): Promise<{
        bookingId: string;
        checkInData: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
        checkOutData: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
        canCheckIn: boolean;
        canCheckOut: boolean;
    }>;
    private getConfirmedBooking;
}
