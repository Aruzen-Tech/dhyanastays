import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ItineraryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
import { ItineraryGroundingService } from './itinerary-grounding.service';
import { ItineraryService } from './itinerary.service';

describe('ItineraryService suggestions', () => {
  const itineraryFindUnique = jest.fn();
  const usageFindUnique = jest.fn();
  const usageUpsert = jest.fn();

  let service: ItineraryService;

  beforeEach(() => {
    jest.clearAllMocks();

    usageFindUnique.mockResolvedValue(null);
    usageUpsert.mockResolvedValue({});

    const prisma = {
      itinerary: {
        findUnique: itineraryFindUnique,
      },
      itineraryUsage: {
        findUnique: usageFindUnique,
        upsert: usageUpsert,
      },
    } as unknown as PrismaService;

    const config = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    } as unknown as ConfigService;

    const groundingService = {} as ItineraryGroundingService;

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
});
