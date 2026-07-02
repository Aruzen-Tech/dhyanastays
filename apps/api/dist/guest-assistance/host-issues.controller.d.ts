import { IssueStatus } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { GuestAssistanceService } from './guest-assistance.service';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
export declare class HostIssuesController {
    private readonly assistanceService;
    constructor(assistanceService: GuestAssistanceService);
    getIssues(user: RequestUser, status?: IssueStatus): Promise<({
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
    updateStatus(user: RequestUser, id: string, dto: UpdateIssueStatusDto): Promise<{
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
}
