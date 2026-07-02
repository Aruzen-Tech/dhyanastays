import { RequestUser } from '../common/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ItineraryController {
    private readonly service;
    constructor(service: ItineraryService);
    list(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: import("@prisma/client/runtime/library").JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }[]>;
    usage(user: RequestUser): Promise<{
        monthBucket: string;
        capPaise: number;
        generations: number;
        chatMessages: number;
        costPaise: number;
        tokensInput: number;
        tokensOutput: number;
    }>;
    suggest(user: RequestUser, dto: SuggestItineraryDto): Promise<{
        suggestions: import("./itinerary.service").ItinerarySuggestion[];
    }>;
    generate(user: RequestUser, dto: GenerateItineraryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: import("@prisma/client/runtime/library").JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    listMessages(user: RequestUser, id: string): Promise<{
        role: string;
        id: string;
        createdAt: Date;
        tokensInput: number;
        tokensOutput: number;
        itineraryId: string;
        content: string;
        appliedPatch: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    sendMessage(user: RequestUser, id: string, dto: SendMessageDto): Promise<{
        userMessage: {
            role: string;
            id: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            itineraryId: string;
            content: string;
            appliedPatch: import("@prisma/client/runtime/library").JsonValue | null;
        };
        assistantMessage: {
            role: string;
            id: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            itineraryId: string;
            content: string;
            appliedPatch: import("@prisma/client/runtime/library").JsonValue | null;
        };
        updated: {
            messages: {
                role: string;
                id: string;
                createdAt: Date;
                tokensInput: number;
                tokensOutput: number;
                itineraryId: string;
                content: string;
                appliedPatch: import("@prisma/client/runtime/library").JsonValue | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import("@prisma/client").$Enums.ItineraryStatus;
            listingId: string | null;
            startsAt: Date;
            endsAt: Date;
            destination: string;
            travelers: number;
            interests: string[];
            budgetMinor: number | null;
            themeHint: string | null;
            summary: string | null;
            days: import("@prisma/client/runtime/library").JsonValue | null;
            model: string | null;
            tokensInput: number;
            tokensOutput: number;
        };
    }>;
    getOne(user: RequestUser, id: string): Promise<{
        messages: {
            role: string;
            id: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            itineraryId: string;
            content: string;
            appliedPatch: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: import("@prisma/client/runtime/library").JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    finalize(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        listingId: string | null;
        startsAt: Date;
        endsAt: Date;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: import("@prisma/client/runtime/library").JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        deleted: boolean;
    }>;
}
