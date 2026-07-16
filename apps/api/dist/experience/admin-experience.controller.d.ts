import { ExperienceStatus } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { ExperienceService } from './experience.service';
import { ModerateExperienceDto } from './dto/moderate-experience.dto';
export declare class AdminExperienceController {
    private readonly service;
    constructor(service: ExperienceService);
    list(status?: ExperienceStatus): Promise<({
        host: {
            user: {
                email: string;
                fullName: string;
            };
        };
        _count: {
            bookings: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ExperienceStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        hostId: string;
        createdById: string;
        title: string;
        description: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        category: string;
        currency: string;
        capacity: number;
        priceMinor: number;
        imageUrl: string | null;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
    })[]>;
    moderate(user: RequestUser, id: string, dto: ModerateExperienceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ExperienceStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        hostId: string;
        createdById: string;
        title: string;
        description: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        category: string;
        currency: string;
        capacity: number;
        priceMinor: number;
        imageUrl: string | null;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
    }>;
}
