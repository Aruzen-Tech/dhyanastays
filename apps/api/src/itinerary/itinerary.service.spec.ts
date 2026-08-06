import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ItineraryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
import { ItineraryGroundingService } from './itinerary-grounding.service';
import { ItineraryService } from './itinerary.service';

describe('ItineraryService suggestions', () => {
  const itineraryFindUnique = jest.fn();
  const itineraryCreate = jest.fn();
  const usageFindUnique = jest.fn();
  const usageUpsert = jest.fn();
  const buildGroundingContext = jest.fn();

  let service: ItineraryService;

  beforeEach(() => {
    jest.clearAllMocks();

    usageFindUnique.mockResolvedValue(null);
    usageUpsert.mockResolvedValue({});
    itineraryCreate.mockResolvedValue({
      id: 'itinerary-1',
    });

    buildGroundingContext.mockResolvedValue({
      stays: [],
      experiences: [],
    });

    const prisma = {
      itinerary: {
        findUnique: itineraryFindUnique,
        create: itineraryCreate,
      },
      itineraryUsage: {
        findUnique: usageFindUnique,
        upsert: usageUpsert,
      },
    } as unknown as PrismaService;

    const config = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    } as unknown as ConfigService;

    const groundingService = {
      buildContext: buildGroundingContext,
    } as unknown as ItineraryGroundingService;

    service = new ItineraryService(
      prisma,
      config,
      groundingService,
    );
  });

  const validDto: SuggestItineraryDto = {
    destination: 'Bengaluru, Karnataka',
    startsAt: '2026-08-10T00:00:00.000Z',
    endsAt: '2026-08-13T00:00:00.000Z',
    travelers: 2,
    interests: ['food', 'culture'],
    budgetMinor: 500000,
  };

  const validGenerateDto: GenerateItineraryDto = {
    destination: 'Bengaluru, Karnataka',
    startsAt: '2026-08-10T00:00:00.000Z',
    endsAt: '2026-08-12T00:00:00.000Z',
    travelers: 2,
    interests: ['food', 'culture'],
    budgetMinor: 500000,
  };

  it('returns three general trip concepts in development mode', async () => {
    const result = await service.suggestConcepts(
      'user-1',
      validDto,
    );

    expect(result.suggestions).toHaveLength(3);

    expect(result.suggestions.map((suggestion) => suggestion.key)).toEqual([
      'culture-and-cuisine',
      'nature-and-adventure',
      'balanced-local-escape',
    ]);

    expect(result.suggestions[0]).toMatchObject({
      title: 'Culture & Cuisine',
      theme: 'cultural-food',
    });

    expect(usageUpsert).toHaveBeenCalledTimes(1);
  });

  it('rejects a reversed date range', async () => {
    await expect(
      service.suggestConcepts('user-1', {
        ...validDto,
        startsAt: '2026-08-15T00:00:00.000Z',
        endsAt: '2026-08-10T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usageUpsert).not.toHaveBeenCalled();
  });

  it('rejects itineraries longer than 21 days', async () => {
    await expect(
      service.suggestConcepts('user-1', {
        ...validDto,
        startsAt: '2026-08-01T00:00:00.000Z',
        endsAt: '2026-08-23T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usageUpsert).not.toHaveBeenCalled();
  });

  it('rejects a trip starting in the past', async () => {
    await expect(
      service.suggestConcepts('user-1', {
        ...validDto,
        startsAt: '2020-01-10T00:00:00.000Z',
        endsAt: '2020-01-13T00:00:00.000Z',
      }),
    ).rejects.toThrow(
      'Trip start date cannot be in the past',
    );

    expect(usageUpsert).not.toHaveBeenCalled();
  });

  it('persists the expanded trip preferences', async () => {
    const generatedPlan = {
      summary: 'A personalized Bengaluru trip.',
      days: [
        {
          day: 1,
          date: '2026-08-10',
          title: 'Arrival',
          sessions: [
            {
              time: '10:00',
              title: 'City Arrival',
              description: 'Arrive and settle in.',
              category: 'travel',
            },
          ],
        },
        {
          day: 2,
          date: '2026-08-11',
          title: 'Local Exploration',
          sessions: [
            {
              time: '09:00',
              title: 'Local Walk',
              description: 'Explore nearby attractions.',
              category: 'cultural',
            },
          ],
        },
      ],
    };

    (
      service as unknown as {
        callLLMForPlan: jest.Mock;
      }
    ).callLLMForPlan = jest.fn().mockResolvedValue({
      plan: generatedPlan,
      tokensInput: 100,
      tokensOutput: 200,
    });

    await service.generate('user-1', {
      ...validGenerateDto,
      travelStyle: 'balanced',
      pace: 'relaxed',
      dietaryRequirements: ['vegetarian', 'jain'],
      accessibilityNeeds: 'Wheelchair-accessible routes',
      accommodationPreference: 'homestay',
      transportPreference: 'cab',
      activityIntensity: 'light',
      specialRequests: 'Prefer quieter locations',
      themeHint: 'culture-and-cuisine',
    });

    expect(buildGroundingContext).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        travelStyle: 'balanced',
        pace: 'relaxed',
      }),
    );

    expect(itineraryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        travelStyle: 'balanced',
        pace: 'relaxed',
        dietaryRequirements: ['vegetarian', 'jain'],
        accessibilityNeeds: 'Wheelchair-accessible routes',
        accommodationPreference: 'homestay',
        transportPreference: 'cab',
        activityIntensity: 'light',
        specialRequests: 'Prefer quieter locations',
        themeHint: 'culture-and-cuisine',
      }),
    });
  });

  it('includes expanded preferences in suggestion and plan prompts', () => {
    const dto: GenerateItineraryDto = {
      ...validGenerateDto,
      travelStyle: 'comfort',
      pace: 'relaxed',
      dietaryRequirements: ['vegetarian', 'jain'],
      accessibilityNeeds: 'Step-free access',
      accommodationPreference: 'resort',
      transportPreference: 'cab',
      activityIntensity: 'light',
      specialRequests: 'Prefer quiet locations',
      themeHint: 'balanced-local-escape',
    };

    const testableService = service as unknown as {
      buildSuggestionsPrompt: (
        dto: SuggestItineraryDto,
        days: number,
      ) => string;
      buildPlanPrompt: (
        dto: GenerateItineraryDto,
        days: number,
        grounding: {
          stays: unknown[];
          experiences: unknown[];
        },
      ) => string;
    };

    const suggestionsPrompt =
      testableService.buildSuggestionsPrompt(dto, 2);

    const planPrompt =
      testableService.buildPlanPrompt(
        dto,
        2,
        {
          stays: [],
          experiences: [],
        },
      );

    for (const prompt of [
      suggestionsPrompt,
      planPrompt,
    ]) {
      expect(prompt).toContain('"travelStyle": "comfort"');
      expect(prompt).toContain('"pace": "relaxed"');
      expect(prompt).toContain('"dietaryRequirements": [');
      expect(prompt).toContain('"vegetarian"');
      expect(prompt).toContain('"jain"');
      expect(prompt).toContain(
        '"accessibilityNeeds": "Step-free access"',
      );
      expect(prompt).toContain(
        '"accommodationPreference": "resort"',
      );
      expect(prompt).toContain(
        '"transportPreference": "cab"',
      );
      expect(prompt).toContain(
        '"activityIntensity": "light"',
      );
      expect(prompt).toContain(
        '"specialRequests": "Prefer quiet locations"',
      );
      expect(prompt).toContain(
        'user-provided data and constraints',
      );
    }
  });

  it('rejects chat changes to a finalized itinerary', async () => {
    itineraryFindUnique.mockResolvedValue({
      id: 'itinerary-1',
      userId: 'user-1',
      status: ItineraryStatus.FINALIZED,
      summary: 'Final trip',
      days: [],
      destination: 'Bengaluru',
      messages: [],
    });

    await expect(
      service.sendMessage(
        'user-1',
        'itinerary-1',
        'Make the second day more relaxed',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usageFindUnique).not.toHaveBeenCalled();
  });

  it('uses the latest traveler message in the development chat stub', () => {
    const stubService = service as unknown as {
      devStubResponse: (options: {
        system: string;
        conversation: Array<{
          role: 'user' | 'assistant';
          content: string;
        }>;
      }) => {
        text: string;
        tokensInput: number;
        tokensOutput: number;
      };
    };

    const result = stubService.devStubResponse({
      system:
        'You are an AI trip planner refining an existing itinerary.',
      conversation: [
        {
          role: 'user',
          content: '[Current itinerary state]',
        },
        {
          role: 'assistant',
          content: 'How would you like to update it?',
        },
        {
          role: 'user',
          content: 'Make day two more relaxed',
        },
      ],
    });

    const parsed = JSON.parse(result.text) as {
      reply: string;
    };

    expect(parsed.reply).toContain(
      'Make day two more relaxed',
    );

    expect(parsed.reply).not.toContain(
      '[Current itinerary state]',
    );
  });

  it('normalizes a structurally valid generated itinerary', () => {
    const testableService = service as unknown as {
      normalizeGeneratedPlan: (
        plan: unknown,
        dto: GenerateItineraryDto,
        expectedDayCount: number,
      ) => {
        summary: string;
        days: Array<{
          day: number;
          date: string;
          sessions: Array<{
            time: string;
            category: string;
          }>;
        }>;
      } | null;
    };

    const result = testableService.normalizeGeneratedPlan(
      {
        summary: '  A balanced Bengaluru trip.  ',
        days: [
          {
            day: 8,
            date: '2026-08-10',
            title: ' Arrival Day ',
            sessions: [
              {
                time: '08:00',
                title: ' Breakfast ',
                description: ' Begin the day locally. ',
                category: 'MEAL',
              },
              {
                time: '10:30',
                title: 'City Walk',
                description: 'Explore the local area.',
                category: 'cultural',
              },
            ],
          },
          {
            day: 9,
            date: '2026-08-11',
            title: 'Local Experiences',
            sessions: [
              {
                time: '09:00',
                title: 'Local Experience',
                description: 'Explore nearby attractions.',
                category: 'activity',
              },
            ],
          },
        ],
      },
      validGenerateDto,
      2,
    );

    expect(result).not.toBeNull();

    expect(result?.summary).toBe(
      'A balanced Bengaluru trip.',
    );

    expect(result?.days).toHaveLength(2);

    expect(result?.days[0]).toMatchObject({
      day: 1,
      date: '2026-08-10',
    });

    expect(result?.days[0].sessions).toEqual([
      {
        time: '08:00',
        title: 'Breakfast',
        description: 'Begin the day locally.',
        category: 'meal',
      },
      {
        time: '10:30',
        title: 'City Walk',
        description: 'Explore the local area.',
        category: 'cultural',
      },
    ]);

    expect(result?.days[1]).toMatchObject({
      day: 2,
      date: '2026-08-11',
    });
  });

  it('rejects a generated itinerary with incorrect dates', () => {
    const testableService = service as unknown as {
      normalizeGeneratedPlan: (
        plan: unknown,
        dto: GenerateItineraryDto,
        expectedDayCount: number,
      ) => unknown;
    };

    const result = testableService.normalizeGeneratedPlan(
      {
        summary: 'A trip plan.',
        days: [
          {
            day: 1,
            date: '2026-08-11',
            title: 'Wrong Date',
            sessions: [
              {
                time: '09:00',
                title: 'Activity',
                description: 'Details',
                category: 'activity',
              },
            ],
          },
          {
            day: 2,
            date: '2026-08-12',
            title: 'Second Day',
            sessions: [
              {
                time: '09:00',
                title: 'Activity',
                description: 'Details',
                category: 'activity',
              },
            ],
          },
        ],
      },
      validGenerateDto,
      2,
    );

    expect(result).toBeNull();
  });

  it('rejects unordered sessions and unsupported categories', () => {
    const testableService = service as unknown as {
      normalizeGeneratedPlan: (
        plan: unknown,
        dto: GenerateItineraryDto,
        expectedDayCount: number,
      ) => unknown;
    };

    const unorderedResult =
      testableService.normalizeGeneratedPlan(
        {
          summary: 'A trip plan.',
          days: [
            {
              day: 1,
              date: '2026-08-10',
              title: 'First Day',
              sessions: [
                {
                  time: '12:00',
                  title: 'Lunch',
                  description: 'Details',
                  category: 'meal',
                },
                {
                  time: '10:00',
                  title: 'City Walk',
                  description: 'Details',
                  category: 'activity',
                },
              ],
            },
            {
              day: 2,
              date: '2026-08-11',
              title: 'Second Day',
              sessions: [
                {
                  time: '09:00',
                  title: 'Activity',
                  description: 'Details',
                  category: 'activity',
                },
              ],
            },
          ],
        },
        validGenerateDto,
        2,
      );

    expect(unorderedResult).toBeNull();

    const unsupportedCategoryResult =
      testableService.normalizeGeneratedPlan(
        {
          summary: 'A trip plan.',
          days: [
            {
              day: 1,
              date: '2026-08-10',
              title: 'First Day',
              sessions: [
                {
                  time: '10:00',
                  title: 'Shopping',
                  description: 'Details',
                  category: 'shopping',
                },
              ],
            },
            {
              day: 2,
              date: '2026-08-11',
              title: 'Second Day',
              sessions: [
                {
                  time: '09:00',
                  title: 'Activity',
                  description: 'Details',
                  category: 'activity',
                },
              ],
            },
          ],
        },
        validGenerateDto,
        2,
      );

    expect(unsupportedCategoryResult).toBeNull();
  });

  it('creates the requested dates in the development plan stub', () => {
    const testableService = service as unknown as {
      devStubResponse: (options: {
        system: string;
        userMessage: string;
      }) => {
        text: string;
        tokensInput: number;
        tokensOutput: number;
      };
    };

    const response = testableService.devStubResponse({
      system:
        'You are an AI trip planner for Dhyana Stays.',
      userMessage: [
        'Plan a 3-day trip itinerary for 2 traveler(s) in Bengaluru.',
        'Dates: 2026-08-10T00:00:00.000Z to 2026-08-13T00:00:00.000Z.',
      ].join('\n'),
    });

    const parsed = JSON.parse(response.text) as {
      summary: string;
      days: Array<{
        day: number;
        date: string;
      }>;
    };

    expect(parsed.days).toHaveLength(3);

    expect(parsed.days.map((day) => day.date)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);

    expect(parsed.days.map((day) => day.day)).toEqual([
      1,
      2,
      3,
    ]);
  });
});
