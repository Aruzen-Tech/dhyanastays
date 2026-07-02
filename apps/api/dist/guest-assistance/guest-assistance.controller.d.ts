import { RequestUser } from '../common/decorators/current-user.decorator';
import { GuestAssistanceService } from './guest-assistance.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
export declare class GuestAssistanceController {
    private readonly assistanceService;
    constructor(assistanceService: GuestAssistanceService);
    getDirections(user: RequestUser, id: string): Promise<{
        bookingId: string;
        listingTitle: string;
        propertyDirections: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    getManual(user: RequestUser, id: string): Promise<{
        bookingId: string;
        listingTitle: string;
        propertyManual: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
    }>;
    createIssue(user: RequestUser, id: string, dto: CreateIssueDto): Promise<{
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
    getIssues(user: RequestUser, id: string): Promise<{
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
    checkIn(user: RequestUser, id: string, dto: CheckInDto): Promise<{
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
    checkOut(user: RequestUser, id: string, dto: CheckOutDto): Promise<{
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
    getCheckInOutStatus(user: RequestUser, id: string): Promise<{
        bookingId: string;
        checkInData: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
        checkOutData: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null;
        canCheckIn: boolean;
        canCheckOut: boolean;
    }>;
}
