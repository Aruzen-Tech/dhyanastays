import { RequestUser } from '../common/decorators/current-user.decorator';
import { ExperienceService } from './experience.service';
import { BookExperienceDto } from './dto/book-experience.dto';
export declare class GuestExperienceController {
    private readonly service;
    constructor(service: ExperienceService);
    listBookings(user: RequestUser): Promise<({
        experience: {
            id: string;
            category: string;
            startsAt: Date;
            endsAt: Date;
            title: string;
            city: string;
            state: string;
            imageUrl: string | null;
        };
    } & {
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ExperienceBookingStatus;
        guestId: string;
        currency: string;
        experienceId: string;
        seats: number;
        totalMinor: number;
        paymentRef: string | null;
        cancelledAt: Date | null;
        refundedAt: Date | null;
    })[]>;
    book(user: RequestUser, id: string, dto: BookExperienceDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ExperienceBookingStatus;
        guestId: string;
        currency: string;
        experienceId: string;
        seats: number;
        totalMinor: number;
        paymentRef: string | null;
        cancelledAt: Date | null;
        refundedAt: Date | null;
    }>;
    cancel(user: RequestUser, id: string): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ExperienceBookingStatus;
        guestId: string;
        currency: string;
        experienceId: string;
        seats: number;
        totalMinor: number;
        paymentRef: string | null;
        cancelledAt: Date | null;
        refundedAt: Date | null;
    }>;
}
