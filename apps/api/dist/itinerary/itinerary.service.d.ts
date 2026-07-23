import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
export interface ItinerarySuggestion {
    key: string;
    title: string;
    theme: string;
    summary: string;
}
export declare class ItineraryService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private readonly model;
    private readonly apiKey;
    private readonly isProduction;
    private readonly userMonthlyCapPaise;
    constructor(prisma: PrismaService, config: ConfigService);
    listForUser(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string | null;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: Prisma.JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }[]>;
    getById(userId: string, id: string): Promise<{
        messages: {
            id: string;
            role: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            content: string;
            itineraryId: string;
            appliedPatch: Prisma.JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string | null;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: Prisma.JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    finalize(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string | null;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: Prisma.JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    delete(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    suggestConcepts(userId: string, dto: SuggestItineraryDto): Promise<{
        suggestions: ItinerarySuggestion[];
    }>;
    generate(userId: string, dto: GenerateItineraryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.ItineraryStatus;
        startsAt: Date;
        endsAt: Date;
        listingId: string | null;
        destination: string;
        travelers: number;
        interests: string[];
        budgetMinor: number | null;
        themeHint: string | null;
        summary: string | null;
        days: Prisma.JsonValue | null;
        model: string | null;
        tokensInput: number;
        tokensOutput: number;
    }>;
    listMessages(userId: string, itineraryId: string): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        tokensInput: number;
        tokensOutput: number;
        content: string;
        itineraryId: string;
        appliedPatch: Prisma.JsonValue | null;
    }[]>;
    sendMessage(userId: string, itineraryId: string, content: string): Promise<{
        userMessage: {
            id: string;
            role: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            content: string;
            itineraryId: string;
            appliedPatch: Prisma.JsonValue | null;
        };
        assistantMessage: {
            id: string;
            role: string;
            createdAt: Date;
            tokensInput: number;
            tokensOutput: number;
            content: string;
            itineraryId: string;
            appliedPatch: Prisma.JsonValue | null;
        };
        updated: {
            messages: {
                id: string;
                role: string;
                createdAt: Date;
                tokensInput: number;
                tokensOutput: number;
                content: string;
                itineraryId: string;
                appliedPatch: Prisma.JsonValue | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import("@prisma/client").$Enums.ItineraryStatus;
            startsAt: Date;
            endsAt: Date;
            listingId: string | null;
            destination: string;
            travelers: number;
            interests: string[];
            budgetMinor: number | null;
            themeHint: string | null;
            summary: string | null;
            days: Prisma.JsonValue | null;
            model: string | null;
            tokensInput: number;
            tokensOutput: number;
        };
    }>;
    getUsage(userId: string): Promise<{
        monthBucket: string;
        capPaise: number;
        generations: number;
        chatMessages: number;
        costPaise: number;
        tokensInput: number;
        tokensOutput: number;
    }>;
    private assertOwnedById;
    private validateDateRange;
    private daysBetween;
    private currentMonthBucket;
    private assertWithinMonthlyCap;
    private recordUsage;
    private buildSuggestionsPrompt;
    private buildPlanPrompt;
    private buildChatSystemPrompt;
    private buildChatConversation;
    private sanitizeDays;
    private callAnthropic;
    private callLLMForPlan;
    private safeParse;
    private devStubResponse;
}
