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
        description: string;
        category: string;
        status: import("@prisma/client").$Enums.ExperienceStatus;
        startsAt: Date;
        endsAt: Date;
        hostId: string;
        createdById: string;
        title: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        listingId: string | null;
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
        description: string;
        category: string;
        status: import("@prisma/client").$Enums.ExperienceStatus;
        startsAt: Date;
        endsAt: Date;
        hostId: string;
        createdById: string;
        title: string;
        city: string;
        state: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        listingId: string | null;
        currency: string;
        capacity: number;
        priceMinor: number;
        imageUrl: string | null;
        reviewedBy: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
    }>;
}
