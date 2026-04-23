import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ItineraryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';

interface ItinerarySession {
  time: string;
  title: string;
  description: string;
  category: string;
}

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  sessions: ItinerarySession[];
}

interface ItineraryPlan {
  summary: string;
  days: ItineraryDay[];
}

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);
  private readonly model = 'claude-haiku-4-5-20251001';
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getById(userId: string, id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({ where: { id } });
    if (!itinerary || itinerary.userId !== userId) {
      throw new NotFoundException('Itinerary not found');
    }
    return itinerary;
  }

  async generate(userId: string, dto: GenerateItineraryDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    const days = Math.ceil(
      (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days > 21) {
      throw new BadRequestException('Itinerary limited to 21 days');
    }

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.listingId },
        select: { id: true },
      });
      if (!listing) throw new NotFoundException('Listing not found');
    }

    const plan = await this.callLLM(dto, days);

    return this.prisma.itinerary.create({
      data: {
        userId,
        listingId: dto.listingId ?? null,
        destination: dto.destination,
        startsAt,
        endsAt,
        travelers: dto.travelers,
        interests: dto.interests ?? [],
        budgetMinor: dto.budgetMinor ?? null,
        status: ItineraryStatus.GENERATED,
        summary: plan.summary,
        days: plan.days as unknown as Prisma.InputJsonValue,
        model: this.model,
      },
    });
  }

  async finalize(userId: string, id: string) {
    const itinerary = await this.getById(userId, id);
    if (itinerary.status === ItineraryStatus.FINALIZED) return itinerary;
    return this.prisma.itinerary.update({
      where: { id },
      data: { status: ItineraryStatus.FINALIZED },
    });
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await this.prisma.itinerary.delete({ where: { id } });
    return { deleted: true };
  }

  // ── LLM call ────────────────────────────────────────────────────────────────

  private async callLLM(
    dto: GenerateItineraryDto,
    days: number,
  ): Promise<ItineraryPlan> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY') ?? '';
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set — returning stub itinerary');
      return this.stubPlan(dto, days);
    }

    const prompt = this.buildPrompt(dto, days);
    const body = {
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      system:
        'You are a wellness retreat planner. Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.',
    };

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Anthropic API error ${res.status}: ${text}`);
        return this.stubPlan(dto, days);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const raw = data?.content?.[0]?.text ?? '';
      const parsed = this.safeParse(raw);
      if (!parsed) {
        this.logger.error('LLM response was not valid JSON, falling back to stub');
        return this.stubPlan(dto, days);
      }
      return parsed;
    } catch (err) {
      this.logger.error(`LLM call failed: ${err instanceof Error ? err.message : err}`);
      return this.stubPlan(dto, days);
    }
  }

  private buildPrompt(dto: GenerateItineraryDto, days: number): string {
    const interests = dto.interests?.join(', ') || 'wellness, yoga, meditation';
    const budget = dto.budgetMinor
      ? `₹${Math.round(dto.budgetMinor / 100)} per person`
      : 'flexible';
    return [
      `Plan a ${days}-day wellness retreat itinerary for ${dto.travelers} traveler(s) in ${dto.destination}.`,
      `Interests: ${interests}. Budget: ${budget}.`,
      `Dates: ${dto.startsAt} to ${dto.endsAt}.`,
      ``,
      `Return JSON with this exact shape:`,
      `{`,
      `  "summary": "<2-3 sentence overview>",`,
      `  "days": [`,
      `    { "day": 1, "date": "YYYY-MM-DD", "title": "<day theme>",`,
      `      "sessions": [`,
      `        { "time": "07:00", "title": "<name>", "description": "<details>", "category": "yoga|meditation|meal|activity|rest|cultural" }`,
      `      ] }`,
      `  ]`,
      `}`,
      ``,
      `Include 4-6 sessions per day covering morning practice, meals, main activity, afternoon session, evening practice.`,
    ].join('\n');
  }

  private safeParse(raw: string): ItineraryPlan | null {
    const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed?.days || !Array.isArray(parsed.days)) return null;
      return parsed as ItineraryPlan;
    } catch {
      return null;
    }
  }

  private stubPlan(dto: GenerateItineraryDto, days: number): ItineraryPlan {
    const themes = ['Arrival & Grounding', 'Deep Practice', 'Exploration', 'Integration', 'Stillness', 'Nourishment', 'Departure'];
    const start = new Date(dto.startsAt);
    const allDays: ItineraryDay[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      allDays.push({
        day: i + 1,
        date: date.toISOString().slice(0, 10),
        title: themes[Math.min(i, themes.length - 1)],
        sessions: [
          { time: '06:30', title: 'Sunrise Yoga', description: 'Hatha + pranayama to start the day.', category: 'yoga' },
          { time: '08:30', title: 'Sattvic Breakfast', description: 'Local seasonal produce.', category: 'meal' },
          { time: '10:00', title: `Explore ${dto.destination}`, description: 'Guided nature walk or local cultural visit.', category: 'activity' },
          { time: '13:00', title: 'Lunch & Rest', description: 'Traditional thali, quiet time.', category: 'meal' },
          { time: '16:00', title: 'Meditation Circle', description: 'Guided vipassana / sound healing.', category: 'meditation' },
          { time: '19:30', title: 'Light Dinner & Reflection', description: 'Herbal tea, journaling.', category: 'meal' },
        ],
      });
    }
    return {
      summary: `A ${days}-day wellness retreat in ${dto.destination} for ${dto.travelers} traveler(s), blending yoga, meditation, local cuisine, and nature.`,
      days: allDays,
    };
  }
}
