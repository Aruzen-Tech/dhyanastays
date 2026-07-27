import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/** HTTP 402 Payment Required — used when monthly itinerary AI quota is exhausted. */
class PaymentRequiredException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
import { ConfigService } from '@nestjs/config';
import { ItineraryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
import {
  ItineraryGroundingContext,
  ItineraryGroundingService,
} from './itinerary-grounding.service';

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

export interface ItinerarySuggestion {
  /** Stable key for the UI to round-trip back as themeHint. */
  key: string;
  title: string;
  theme: string;
  summary: string;
}

interface ChatPatch {
  /** Updated full days array (assistant returns the whole thing for safety). */
  days?: ItineraryDay[];
  /** Updated summary, optional. */
  summary?: string;
}

interface AnthropicResponse {
   
  content?: Array<{ type?: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// Haiku 4.5 pricing (USD per Mtok, May 2026): $0.80 input / $4 output.
// At ~83 INR/USD that's roughly 6.6 paise per 1k input + 33 paise per 1k output.
// Conservative single multiplier captures both for cost-cap accounting.
const COST_PER_KTOK_INPUT_PAISE = 7;
const COST_PER_KTOK_OUTPUT_PAISE = 33;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_VERSION = '2023-06-01';
/** Per-attempt hard timeout for the Anthropic call (the flow retries once). */
const ANTHROPIC_TIMEOUT_MS = 30_000;

const MAX_DAYS = 21;
const ITINERARY_CATEGORIES = new Set([
  'stay',
  'travel',
  'meal',
  'activity',
  'rest',
  'cultural',
  'wellness',
]);

const SESSION_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_CHAT_HISTORY = 20;

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);
  private readonly model = ANTHROPIC_MODEL;
  private readonly apiKey: string;
  private readonly isProduction: boolean;
  private readonly userMonthlyCapPaise: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly groundingService: ItineraryGroundingService,
  ) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '') ?? '';
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.userMonthlyCapPaise = this.config.get<number>(
      'ITINERARY_USER_MONTHLY_CAP_PAISE',
      5000,
    );

    // Defense-in-depth — Joi env validation already enforces this in prod.
    if (this.isProduction && !this.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required in production — itinerary planner refuses to start without it',
      );
    }
  }

  // ── Listing endpoints ───────────────────────────────────────────────────────

  async listForUser(userId: string) {
    return this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getById(userId: string, id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!itinerary || itinerary.userId !== userId) {
      throw new NotFoundException('Itinerary not found');
    }
    return itinerary;
  }

  async finalize(userId: string, id: string) {
    const itinerary = await this.assertOwnedById(userId, id);
    if (itinerary.status === ItineraryStatus.FINALIZED) return itinerary;
    return this.prisma.itinerary.update({
      where: { id },
      data: { status: ItineraryStatus.FINALIZED },
    });
  }

  async delete(userId: string, id: string) {
    await this.assertOwnedById(userId, id);
    await this.prisma.itinerary.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Step 1: suggestions (concepts) ─────────────────────────────────────────

  async suggestConcepts(
    userId: string,
    dto: SuggestItineraryDto,
  ): Promise<{ suggestions: ItinerarySuggestion[] }> {
    const days = this.validateDateRange(dto.startsAt, dto.endsAt);
    await this.assertWithinMonthlyCap(userId);

    const prompt = this.buildSuggestionsPrompt(dto, days);
    const system =
      'You are an AI trip planner for Dhyana Stays. Suggest exactly 3 distinct trip concepts. Return ONLY valid JSON: { "suggestions": [{"key":"slug","title":"...","theme":"...","summary":"..."}, ...] }. No prose and no markdown fences.';

    const result = await this.callAnthropic({
      system,
      userMessage: prompt,
      maxTokens: 800,
    });
    if (!result) {
      throw new ServiceUnavailableException(
        'Itinerary AI is unavailable — please try again in a minute.',
      );
    }

    type SuggestionsPayload = { suggestions?: ItinerarySuggestion[] };
    const parsed = this.safeParse<SuggestionsPayload>(result.text);
    if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new ServiceUnavailableException(
        'Itinerary AI returned an unexpected response — please try again.',
      );
    }

    await this.recordUsage(userId, {
      generations: 0,
      chatMessages: 0,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });

    return {
      suggestions: parsed.suggestions
        .slice(0, 3)
        .map((s, idx) => ({
          key: (s.key ?? `concept-${idx + 1}`).slice(0, 60),
          title: String(s.title ?? '').slice(0, 120),
          theme: String(s.theme ?? '').slice(0, 60),
          summary: String(s.summary ?? '').slice(0, 400),
        })),
    };
  }

  // ── Step 2: full generation ────────────────────────────────────────────────

  async generate(userId: string, dto: GenerateItineraryDto) {
    const days = this.validateDateRange(dto.startsAt, dto.endsAt);
    await this.assertWithinMonthlyCap(userId);

    const groundingContext = await this.groundingService.buildContext(
      userId,
      dto,
    );

    const result = await this.callLLMForPlan(dto, days, groundingContext);
    if (!result) {
      throw new ServiceUnavailableException(
        'Itinerary AI is unavailable — please try again in a minute.',
      );
    }

    const created = await this.prisma.itinerary.create({
      data: {
        userId,
        listingId: dto.listingId ?? null,
        destination: dto.destination,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        travelers: dto.travelers,
        interests: dto.interests ?? [],
        budgetMinor: dto.budgetMinor ?? null,
        themeHint: dto.themeHint ?? null,
        status: ItineraryStatus.GENERATED,
        summary: result.plan.summary,
        days: result.plan.days as unknown as Prisma.InputJsonValue,
        model: this.model,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
      },
    });

    await this.recordUsage(userId, {
      generations: 1,
      chatMessages: 0,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });

    return created;
  }

  // ── Step 3: chat refinement ────────────────────────────────────────────────

  async listMessages(userId: string, itineraryId: string) {
    await this.assertOwnedById(userId, itineraryId);
    return this.prisma.itineraryMessage.findMany({
      where: { itineraryId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, itineraryId: string, content: string) {
    const itinerary = await this.assertOwnedById(userId, itineraryId);

    if (itinerary.status === ItineraryStatus.FINALIZED) {
      throw new BadRequestException(
        'Finalized itineraries cannot be modified',
      );
    }

    await this.assertWithinMonthlyCap(userId);

    // Persist user message immediately so it shows up even if AI fails.
    const userMessage = await this.prisma.itineraryMessage.create({
      data: { itineraryId, role: 'user', content },
    });

    // Build conversation context with last N messages.
    const history = await this.prisma.itineraryMessage.findMany({
      where: { itineraryId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CHAT_HISTORY,
    });
    const ordered = [...history].reverse();

    const system = this.buildChatSystemPrompt();
    const conversation = this.buildChatConversation(itinerary, ordered);

    const result = await this.callAnthropic({
      system,
      conversation,
      maxTokens: 4096,
    });

    if (!result) {
      // Persist a friendly assistant fallback so the chat shows the failure.
      const assistantMessage = await this.prisma.itineraryMessage.create({
        data: {
          itineraryId,
          role: 'assistant',
          content:
            'Sorry — I had trouble reaching my planner brain just now. Try sending that again in a minute.',
        },
      });
      return { userMessage, assistantMessage, updated: itinerary };
    }

    // Try to extract a JSON envelope { "reply": "...", "patch": { days?, summary? } }.
    type ChatEnvelope = { reply?: string; patch?: ChatPatch };
    const envelope = this.safeParse<ChatEnvelope>(result.text);
    const replyText = envelope?.reply ?? result.text;
    const patch = envelope?.patch ?? null;

    let appliedPatch: Prisma.InputJsonValue | undefined;
    let updated = itinerary;
    if (patch && (Array.isArray(patch.days) || typeof patch.summary === 'string')) {
      // Validate patch shape minimally before persisting.
      const safePatch: Record<string, unknown> = {};
      if (Array.isArray(patch.days)) {
        const sanitizedDays = this.sanitizeDays(patch.days);
        if (sanitizedDays.length > 0 && sanitizedDays.length <= MAX_DAYS) {
          safePatch.days = sanitizedDays;
        }
      }
      if (typeof patch.summary === 'string' && patch.summary.length > 0) {
        safePatch.summary = patch.summary.slice(0, 1000);
      }

      if (Object.keys(safePatch).length > 0) {
        updated = await this.prisma.itinerary.update({
          where: { id: itineraryId },
          data: {
            ...(safePatch.days !== undefined && {
              days: safePatch.days as unknown as Prisma.InputJsonValue,
            }),
            ...(safePatch.summary !== undefined && {
              summary: safePatch.summary as string,
            }),
            tokensInput: itinerary.tokensInput + result.tokensInput,
            tokensOutput: itinerary.tokensOutput + result.tokensOutput,
          },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        appliedPatch = safePatch as Prisma.InputJsonValue;
      }
    }

    const assistantMessage = await this.prisma.itineraryMessage.create({
      data: {
        itineraryId,
        role: 'assistant',
        content: replyText.slice(0, 4000),
        appliedPatch,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
      },
    });

    await this.recordUsage(userId, {
      generations: 0,
      chatMessages: 1,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });

    return { userMessage, assistantMessage, updated };
  }

  // ── Usage / cost cap ───────────────────────────────────────────────────────

  async getUsage(userId: string) {
    const bucket = this.currentMonthBucket();
    const row = await this.prisma.itineraryUsage.findUnique({
      where: { userId_monthBucket: { userId, monthBucket: bucket } },
    });
    return {
      monthBucket: bucket,
      capPaise: this.userMonthlyCapPaise,
      generations: row?.generations ?? 0,
      chatMessages: row?.chatMessages ?? 0,
      costPaise: row?.costPaise ?? 0,
      tokensInput: row?.tokensInput ?? 0,
      tokensOutput: row?.tokensOutput ?? 0,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertOwnedById(userId: string, id: string) {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    if (itinerary.userId !== userId) throw new ForbiddenException('Access denied');
    return itinerary;
  }

  private validateDateRange(startsAtIso: string, endsAtIso: string): number {
    const startsAt = new Date(startsAtIso);
    const endsAt = new Date(endsAtIso);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    const days = this.daysBetween(startsAtIso, endsAtIso);
    if (days > MAX_DAYS) {
      throw new BadRequestException(`Itinerary limited to ${MAX_DAYS} days`);
    }
    return days;
  }

  private daysBetween(startsAtIso: string, endsAtIso: string): number {
    return Math.ceil(
      (new Date(endsAtIso).getTime() - new Date(startsAtIso).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }

  private currentMonthBucket(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async assertWithinMonthlyCap(userId: string): Promise<void> {
    if (this.userMonthlyCapPaise <= 0) return; // cap disabled
    const bucket = this.currentMonthBucket();
    const usage = await this.prisma.itineraryUsage.findUnique({
      where: { userId_monthBucket: { userId, monthBucket: bucket } },
    });
    if (usage && usage.costPaise >= this.userMonthlyCapPaise) {
      throw new PaymentRequiredException(
        `Monthly itinerary AI quota reached (${(this.userMonthlyCapPaise / 100).toFixed(0)}). Quota resets next month.`,
      );
    }
  }

  private async recordUsage(
    userId: string,
    delta: {
      generations: number;
      chatMessages: number;
      tokensInput: number;
      tokensOutput: number;
    },
  ): Promise<void> {
    const bucket = this.currentMonthBucket();
    const costPaiseDelta =
      Math.ceil((delta.tokensInput / 1000) * COST_PER_KTOK_INPUT_PAISE) +
      Math.ceil((delta.tokensOutput / 1000) * COST_PER_KTOK_OUTPUT_PAISE);

    await this.prisma.itineraryUsage.upsert({
      where: { userId_monthBucket: { userId, monthBucket: bucket } },
      create: {
        userId,
        monthBucket: bucket,
        generations: delta.generations,
        chatMessages: delta.chatMessages,
        tokensInput: delta.tokensInput,
        tokensOutput: delta.tokensOutput,
        costPaise: costPaiseDelta,
      },
      update: {
        generations: { increment: delta.generations },
        chatMessages: { increment: delta.chatMessages },
        tokensInput: { increment: delta.tokensInput },
        tokensOutput: { increment: delta.tokensOutput },
        costPaise: { increment: costPaiseDelta },
      },
    });
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSuggestionsPrompt(
    dto: SuggestItineraryDto,
    days: number,
  ): string {
    const interests =
      dto.interests?.join(', ') ||
      'local experiences, food, culture and sightseeing';

    const budget =
      dto.budgetMinor !== undefined
        ? `₹${Math.round(dto.budgetMinor / 100)}`
        : 'flexible';

    return [
      `Suggest exactly 3 distinct trip concepts for a ${days}-day visit to ${dto.destination} for ${dto.travelers} traveler(s).`,
      `Interests: ${interests}. Total trip budget: ${budget}.`,
      '',
      `Each concept must have a clearly different travel style.`,
      `Possible styles include culture, food, nature, adventure, relaxation, family travel, local exploration or a balanced trip.`,
      '',
      `Return JSON using this exact shape:`,
      `{`,
      `  "suggestions": [`,
      `    {`,
      `      "key": "<short-kebab-case-key>",`,
      `      "title": "<concept title>",`,
      `      "theme": "<short theme>",`,
      `      "summary": "<1-2 sentence explanation>"`,
      `    }`,
      `  ]`,
      `}`,
      '',
      `Return exactly 3 entries.`,
    ].join('\n');
  }

  private buildPlanPrompt(
    dto: GenerateItineraryDto,
    days: number,
    grounding: ItineraryGroundingContext,
  ): string {
    const interests =
      dto.interests?.join(', ') || 'local experiences, food and sightseeing';

    const budget =
      dto.budgetMinor !== undefined
        ? `₹${Math.round(dto.budgetMinor / 100)}`
        : 'flexible';

    const themeLine = dto.themeHint
      ? `Preferred trip theme: ${dto.themeHint}.`
      : '';

    const verifiedInventory = JSON.stringify(
      {
        stays: grounding.stays,
        experiences: grounding.experiences,
      },
      null,
      2,
    );

    return [
      `Plan a ${days}-day trip itinerary for ${dto.travelers} traveler(s) in ${dto.destination}.`,
      `Interests: ${interests}. Budget: ${budget}.`,
      themeLine,
      `Dates: ${dto.startsAt} to ${dto.endsAt}.`,
      '',
      `Verified Dhyana Stays inventory:`,
      verifiedInventory,
      '',
      `Grounding rules:`,
      `- Only stays and experiences listed in the verified inventory may be described as available or bookable.`,
      `- Never invent listing IDs, experience IDs, availability, prices or seat counts.`,
      `- Prefer verified Dhyana Stays inventory when it matches the traveller's preferences.`,
      `- If no verified stay is provided, do not claim that any specific accommodation is available.`,
      `- If no verified experience is provided, suggest only general activities without claiming live availability or confirmed pricing.`,
      `- Keep the itinerary within the traveller's budget where reasonably possible.`,
      `- Do not create overlapping sessions.`,
      '',
      `Return JSON with this exact shape:`,
      `{`,
      `  "summary": "<2-3 sentence overview>",`,
      `  "days": [`,
      `    {`,
      `      "day": 1,`,
      `      "date": "YYYY-MM-DD",`,
      `      "title": "<day theme>",`,
      `      "sessions": [`,
      `        {`,
      `          "time": "HH:MM",`,
      `          "title": "<session name>",`,
      `          "description": "<details>",`,
      `          "category": "stay|travel|meal|activity|rest|cultural|wellness"`,
      `        }`,
      `      ]`,
      `    }`,
      `  ]`,
      `}`,
      '',
      `Include a practical sequence of sessions covering travel, meals, activities and rest.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildChatSystemPrompt(): string {
    return [
      'You are an AI trip planner for Dhyana Stays refining an existing itinerary with the traveler.',
      'The current itinerary summary and complete days array are provided at the beginning of the conversation as JSON.',
      'When the traveler asks for a change, return JSON using this envelope:',
      '{ "reply": "<short conversational reply, 1-3 sentences>", "patch": { "summary": "<optional new summary>", "days": [<complete updated days array>] } }',
      'Rules:',
      '- Always return the JSON envelope, including when answering a question without changing the itinerary.',
      '- For questions that require no itinerary update, return a reply and omit the patch.',
      '- When updating days, return the complete days array rather than a partial delta.',
      '- Preserve unchanged days and sessions.',
      '- Each day must use: { "day": N, "date": "YYYY-MM-DD", "title": "...", "sessions": [{ "time": "HH:MM", "title": "...", "description": "...", "category": "stay|travel|meal|activity|rest|cultural|wellness" }] }',
      '- Do not exceed 21 days.',
      '- Do not create overlapping sessions.',
      '- Do not invent confirmed availability, bookings, prices or inventory.',
      '- Return no markdown fences and no prose outside the JSON envelope.',
    ].join('\n');
  }

  private buildChatConversation(
    itinerary: { summary: string | null; days: Prisma.JsonValue | null; destination: string },
    history: Array<{ role: string; content: string }>,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    // Inject the itinerary state as the first user turn so the model has context.
    const stateMessage = {
      role: 'user' as const,
      content:
        `[Current itinerary for ${itinerary.destination}]\n` +
        JSON.stringify({ summary: itinerary.summary, days: itinerary.days }),
    };
    const turns = history.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));
    return [stateMessage, ...turns];
  }

  private sanitizeDays(days: unknown[]): ItineraryDay[] {
    return days
      .map((d, i) => {
        const obj = d as Record<string, unknown>;
        const sessions = Array.isArray(obj.sessions) ? obj.sessions : [];
        return {
          day: typeof obj.day === 'number' ? obj.day : i + 1,
          date: typeof obj.date === 'string' ? obj.date : '',
          title: typeof obj.title === 'string' ? obj.title.slice(0, 120) : '',
          sessions: sessions.slice(0, 12).map((s) => {
            const so = s as Record<string, unknown>;
            return {
              time: typeof so.time === 'string' ? so.time.slice(0, 8) : '09:00',
              title: typeof so.title === 'string' ? so.title.slice(0, 120) : '',
              description:
                typeof so.description === 'string' ? so.description.slice(0, 600) : '',
              category:
                typeof so.category === 'string' ? so.category.slice(0, 30) : 'activity',
            };
          }),
        };
      })
      .filter((d) => d.date.length > 0 && d.title.length > 0);
  }

  private normalizeGeneratedPlan(
    plan: ItineraryPlan,
    dto: GenerateItineraryDto,
    expectedDayCount: number,
  ): ItineraryPlan | null {
    if (
      typeof plan.summary !== 'string' ||
      plan.summary.trim().length === 0
    ) {
      this.logger.error('Generated itinerary has no valid summary');
      return null;
    }

    if (!Array.isArray(plan.days)) {
      this.logger.error('Generated itinerary has no days array');
      return null;
    }

    const sanitizedDays = this.sanitizeDays(plan.days);

    if (sanitizedDays.length !== expectedDayCount) {
      this.logger.error(
        `Generated itinerary returned ${sanitizedDays.length} days; expected ${expectedDayCount}`,
      );
      return null;
    }

    const tripStart = new Date(dto.startsAt);

    const expectedDates = Array.from(
      { length: expectedDayCount },
      (_, index) => {
        const date = new Date(tripStart);
        date.setUTCDate(date.getUTCDate() + index);
        return date.toISOString().slice(0, 10);
      },
    );

    const normalizedDays: ItineraryDay[] = [];

    for (let index = 0; index < sanitizedDays.length; index += 1) {
      const day = sanitizedDays[index];

      if (day.date !== expectedDates[index]) {
        this.logger.error(
          `Generated itinerary day ${index + 1} has date ${day.date}; expected ${expectedDates[index]}`,
        );
        return null;
      }

      if (day.sessions.length === 0) {
        this.logger.error(
          `Generated itinerary day ${index + 1} has no sessions`,
        );
        return null;
      }

      let previousTime = '';

      const sessions: ItinerarySession[] = [];

      for (const session of day.sessions) {
        const time = session.time.slice(0, 5);

        if (!SESSION_TIME_PATTERN.test(time)) {
          this.logger.error(
            `Generated itinerary contains invalid session time: ${session.time}`,
          );
          return null;
        }

        if (previousTime && time <= previousTime) {
          this.logger.error(
            `Generated itinerary sessions are duplicated or unordered on day ${index + 1}`,
          );
          return null;
        }

        if (!session.title.trim()) {
          this.logger.error(
            `Generated itinerary contains an empty session title on day ${index + 1}`,
          );
          return null;
        }

        const category = session.category
          .trim()
          .toLowerCase();

        if (!ITINERARY_CATEGORIES.has(category)) {
          this.logger.error(
            `Generated itinerary contains unsupported category: ${session.category}`,
          );
          return null;
        }

        sessions.push({
          time,
          title: session.title.trim(),
          description: session.description.trim(),
          category,
        });

        previousTime = time;
      }

      normalizedDays.push({
        day: index + 1,
        date: expectedDates[index],
        title: day.title.trim(),
        sessions,
      });
    }

    return {
      summary: plan.summary.trim().slice(0, 1000),
      days: normalizedDays,
    };
  }

  // ── LLM call (with retry, prompt caching, no stub fallback in prod) ────────

  /**
   * Single retry on 429/5xx with 2s backoff. Returns null on terminal failure
   * so callers can surface a 503 to the user (or persist a friendly fallback
   * in chat). Production refuses to fall back to stub data.
   */
  private async callAnthropic(opts: {
    system: string;
    userMessage?: string;
    conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens: number;
  }): Promise<{
    text: string;
    tokensInput: number;
    tokensOutput: number;
  } | null> {
    if (!this.apiKey) {
      if (this.isProduction) {
        // Should never reach here — env validation throws at startup.
        throw new ServiceUnavailableException('AI provider not configured');
      }
      this.logger.warn('ANTHROPIC_API_KEY not set — returning dev stub');
      return this.devStubResponse(opts);
    }

    const messages =
      opts.conversation ?? [{ role: 'user' as const, content: opts.userMessage ?? '' }];

    // System prompt cached as ephemeral content block so repeat calls within
    // ~5 min skip re-tokenizing the (long) system prompt — ~80% cheaper.
    const body = {
      model: this.model,
      max_tokens: opts.maxTokens,
      system: [
        {
          type: 'text',
          text: opts.system,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages,
    };

    const attempt = async (): Promise<{
      ok: true;
      text: string;
      tokensInput: number;
      tokensOutput: number;
    } | { ok: false; status: number; body: string }> => {
      // Hard timeout — without it a stalled Anthropic connection would hang the
      // request indefinitely, holding a Node socket + the guest's HTTP request.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ANTHROPIC_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_API_VERSION,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } catch (err) {
        // Abort (timeout) or network error → status 0, treated as retryable.
        const msg = err instanceof Error ? err.message : 'network error';
        return { ok: false, status: 0, body: ctrl.signal.aborted ? `timeout after ${ANTHROPIC_TIMEOUT_MS}ms` : msg };
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, status: res.status, body: text };
      }
      const data = (await res.json()) as AnthropicResponse;
      const text = data?.content?.[0]?.text ?? '';
      return {
        ok: true,
        text,
        tokensInput:
          (data.usage?.input_tokens ?? 0) +
          (data.usage?.cache_read_input_tokens ?? 0),
        tokensOutput: data.usage?.output_tokens ?? 0,
      };
    };

    try {
      const r1 = await attempt();
      if (r1.ok) return r1;

      // Retry once on 429 / 5xx / timeout(0). Other errors are terminal.
      if (r1.status === 429 || r1.status >= 500 || r1.status === 0) {
        this.logger.warn(`Anthropic ${r1.status}, retrying once after 2s`);
        await new Promise((r) => setTimeout(r, 2000));
        const r2 = await attempt();
        if (r2.ok) return r2;
        this.logger.error(`Anthropic ${r2.status} after retry: ${r2.body.slice(0, 300)}`);
        return null;
      }
      this.logger.error(`Anthropic ${r1.status} (no retry): ${r1.body.slice(0, 300)}`);
      return null;
    } catch (err) {
      this.logger.error(
        `Anthropic call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async callLLMForPlan(
    dto: GenerateItineraryDto,
    days: number,
    grounding: ItineraryGroundingContext,
  ): Promise<{ plan: ItineraryPlan; tokensInput: number; tokensOutput: number } | null> {
    const system =
      'You are an AI trip planner for Dhyana Stays. Use verified backend inventory as the source of truth. Return ONLY valid JSON matching the requested schema. No prose and no markdown fences.';
    const result = await this.callAnthropic({
      system,
      userMessage: this.buildPlanPrompt(dto, days, grounding),
      maxTokens: 4096,
    });
    if (!result) return null;

    const parsed = this.safeParse<ItineraryPlan>(result.text);

    if (!parsed) {
      this.logger.error('LLM returned invalid JSON for plan');
      return null;
    }

    const normalizedPlan = this.normalizeGeneratedPlan(
      parsed,
      dto,
      days,
    );

    if (!normalizedPlan) {
      this.logger.error(
        'LLM returned a structurally invalid itinerary plan',
      );
      return null;
    }

    return {
      plan: normalizedPlan,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    };
  }

  private safeParse<T>(raw: string): T | null {
    const trimmed = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }

  // ── Dev-mode stub (NEVER used in production — see callAnthropic guard) ────

  private devStubResponse(opts: {
    system: string;
    userMessage?: string;
    conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): { text: string; tokensInput: number; tokensOutput: number } {
    const latestUserTurn = [...(opts.conversation ?? [])]
      .reverse()
      .find((turn) => turn.role === 'user');

    const ask =
      opts.userMessage ??
      latestUserTurn?.content ??
      '';

    if (opts.system.includes('Suggest exactly 3 distinct trip concepts')) {
      const text = JSON.stringify({
        suggestions: [
          {
            key: 'culture-and-cuisine',
            title: 'Culture & Cuisine',
            theme: 'cultural-food',
            summary:
              'Explore local landmarks, neighbourhoods and regional food through a relaxed, culture-focused itinerary.',
          },
          {
            key: 'nature-and-adventure',
            title: 'Nature & Adventure',
            theme: 'nature-adventure',
            summary:
              'Combine outdoor activities, scenic locations and active experiences with enough time to rest.',
          },
          {
            key: 'balanced-local-escape',
            title: 'Balanced Local Escape',
            theme: 'balanced',
            summary:
              'A balanced trip mixing popular attractions, local experiences, good food and flexible free time.',
          },
        ],
      });
      return { text, tokensInput: 200, tokensOutput: 250 };
    }

    if (opts.system.includes('refining an existing itinerary')) {
      const text = JSON.stringify({
        reply: `(dev stub) I see your message: "${ask.slice(0, 120)}". Set ANTHROPIC_API_KEY to get real responses.`,
      });
      return { text, tokensInput: 50, tokensOutput: 60 };
    }

    // Fallback for plan generation — produce a structurally valid local plan.
    const dayCountMatch = ask.match(
      /Plan a (\d+)-day trip itinerary/i,
    );

    const dateRangeMatch = ask.match(
      /Dates:\s*(\S+)\s+to\s+(\S+)\./i,
    );

    const requestedDayCount = Number(
      dayCountMatch?.[1] ?? 1,
    );

    const dayCount = Math.max(
      1,
      Math.min(MAX_DAYS, requestedDayCount),
    );

    const parsedStartDate = dateRangeMatch?.[1]
      ? new Date(dateRangeMatch[1])
      : new Date();

    const startDate = Number.isNaN(
      parsedStartDate.getTime(),
    )
      ? new Date()
      : parsedStartDate;

    const days: ItineraryDay[] = Array.from(
      { length: dayCount },
      (_, index) => {
        const date = new Date(startDate);

        date.setUTCDate(
          date.getUTCDate() + index,
        );

        return {
          day: index + 1,
          date: date.toISOString().slice(0, 10),
          title:
            index === 0
              ? 'Arrival & Local Exploration'
              : `Explore & Experience — Day ${index + 1}`,
          sessions: [
            {
              time: '08:00',
              title: 'Breakfast & Day Planning',
              description:
                'Start the day with breakfast and review the planned activities.',
              category: 'meal',
            },
            {
              time: '10:00',
              title: 'Local Exploration',
              description:
                'Explore a notable local area based on the selected trip interests.',
              category: 'activity',
            },
            {
              time: '13:00',
              title: 'Regional Lunch',
              description:
                'Enjoy a relaxed lunch featuring local cuisine.',
              category: 'meal',
            },
            {
              time: '16:00',
              title: 'Flexible Experience',
              description:
                'Use this time for a verified experience, sightseeing or rest.',
              category: 'cultural',
            },
            {
              time: '19:00',
              title: 'Dinner & Relaxation',
              description:
                'Finish the day with dinner and sufficient rest.',
              category: 'rest',
            },
          ],
        };
      },
    );

    const text = JSON.stringify({
      summary:
        '(dev stub) A balanced local itinerary generated without calling the external AI provider.',
      days,
    });

    return {
      text,
      tokensInput: 300,
      tokensOutput: 400,
    };
  }
}
