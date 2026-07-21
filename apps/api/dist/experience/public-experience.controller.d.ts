import { ExperienceService } from './experience.service';
export declare class PublicExperienceController {
    private readonly service;
    constructor(service: ExperienceService);
    list(city?: string, category?: string): Promise<({
        host: {
            user: {
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
    categories(): {
        categories: readonly ["yoga-class", "meditation", "ayurveda", "sound-healing", "cooking-class", "guided-hike", "retreat-day", "wellness-workshop", "spa-session", "cultural-tour"];
    };
    getOne(id: string): Promise<{
        seatsAvailable: number;
        host: {
            user: {
                fullName: string;
            };
        };
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
        } | null;
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
