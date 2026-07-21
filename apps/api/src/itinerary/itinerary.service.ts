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
    const days = this.daysBetween(dto.startsAt, dto.endsAt);
    await this.assertWithinMonthlyCap(userId);

    const prompt = this.buildSuggestionsPrompt(dto, days);
    const system =
      'You are a wellness retreat planner. Return ONLY valid JSON: { "suggestions": [{"key":"slug","title":"...","theme":"...","summary":"..."}, ...] }. Provide exactly 3 distinct concepts. No prose, no markdown fences.';

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

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.listingId },
        select: { id: true },
      });
      if (!listing) throw new NotFoundException('Listing not found');
    }

    const result = await this.callLLMForPlan(dto, days);
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
    const interests = dto.interests?.join(', ') || 'wellness, yoga, meditation';
    const budget = dto.budgetMinor
      ? `₹${Math.round(dto.budgetMinor / 100)} per person`
      : 'flexible';
    return [
      `Suggest 3 distinct concept variations for a ${days}-day wellness retreat in ${dto.destination} for ${dto.travelers} traveler(s).`,
      `Interests: ${interests}. Budget: ${budget}.`,
      ``,
      `Each concept should have a clear theme. Examples:`,
      `- "Detox & Reset" focused on cleansing diet, gentle yoga, silent walks`,
      `- "Adventure & Wellness" mixing hikes/water sports with evening yoga`,
      `- "Cultural Immersion" with local temples, cooking classes, sound healing`,
      ``,
      `Return JSON: { "suggestions": [{"key":"detox-reset","title":"Detox & Reset","theme":"detox","summary":"<2 sentences>"}, ...] }`,
      `Exactly 3 entries. Keys are short kebab-case slugs. Summaries 1-2 sentences each.`,
    ].join('\n');
  }

  private buildPlanPrompt(dto: GenerateItineraryDto, days: number): string {
    const interests = dto.interests?.join(', ') || 'wellness, yoga, meditation';
    const budget = dto.budgetMinor
      ? `₹${Math.round(dto.budgetMinor / 100)} per person`
      : 'flexible';
    const themeLine = dto.themeHint
      ? `Concept theme: ${dto.themeHint}.`
      : '';
    return [
      `Plan a ${days}-day wellness retreat itinerary for ${dto.travelers} traveler(s) in ${dto.destination}.`,
      `Interests: ${interests}. Budget: ${budget}.`,
      themeLine,
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
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildChatSystemPrompt(): string {
    return [
      'You are a wellness retreat planner refining an existing itinerary in conversation with the guest.',
      'You have access to the current itinerary (summary + days array) at the top of the conversation as JSON.',
      'When the guest asks for a change, return JSON in this envelope:',
      '{ "reply": "<short conversational reply, 1-3 sentences>", "patch": { "summary": "<optional new summary>", "days": [<full updated days array>] } }',
      'Rules:',
      '- ALWAYS return the JSON envelope, even for questions ("What would you suggest?" → reply only, omit patch).',
      '- When you patch days, return the COMPLETE days array, not a delta. Preserve unchanged days exactly.',
      '- Each day has: { "day": N, "date": "YYYY-MM-DD", "title": "...", "sessions": [{ "time": "HH:MM", "title": "...", "description": "...", "category": "yoga|meditation|meal|activity|rest|cultural" }] }',
      '- Do not exceed 21 days total. Keep 4-6 sessions per day.',
      '- No markdown fences, no prose outside the JSON envelope.',
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
  ): Promise<{ plan: ItineraryPlan; tokensInput: number; tokensOutput: number } | null> {
    const system =
      'You are a wellness retreat planner. Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.';
    const result = await this.callAnthropic({
      system,
      userMessage: this.buildPlanPrompt(dto, days),
      maxTokens: 4096,
    });
    if (!result) return null;

    const parsed = this.safeParse<ItineraryPlan>(result.text);
    if (!parsed?.days || !Array.isArray(parsed.days)) {
      this.logger.error('LLM returned non-conforming JSON for plan');
      return null;
    }
    return {
      plan: parsed,
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
    const ask = opts.userMessage ?? opts.conversation?.[0]?.content ?? '';

    if (opts.system.includes('Suggest 3 distinct concept')) {
      const text = JSON.stringify({
        suggestions: [
          {
            key: 'detox-reset',
            title: 'Detox & Reset',
            theme: 'detox',
            summary:
              'A grounding week of cleansing meals, gentle hatha and silent walks. For first-timers and post-burnout resets.',
          },
          {
            key: 'practice-deepening',
            title: 'Practice Deepening',
            theme: 'yoga-intensive',
            summary:
              'Two yoga sessions a day with pranayama and meditation circles. Best for intermediate practitioners ready to go deeper.',
          },
          {
            key: 'cultural-immersion',
            title: 'Cultural Immersion',
            theme: 'cultural',
            summary:
              'Yoga balanced with local temples, cooking classes and evening kirtan. For travellers who want context with their wellness.',
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

    // Fallback for plan generation — match shape of generate output.
    const days: ItineraryDay[] = [
      {
        day: 1,
        date: new Date().toISOString().slice(0, 10),
        title: 'Arrival & Grounding',
        sessions: [
          {
            time: '07:00',
            title: 'Sunrise Hatha',
            description: 'Gentle hatha and pranayama.',
            category: 'yoga',
          },
          {
            time: '09:00',
            title: 'Sattvic Breakfast',
            description: 'Local seasonal produce.',
            category: 'meal',
          },
          {
            time: '17:00',
            title: 'Meditation Circle',
            description: 'Guided vipassana.',
            category: 'meditation',
          },
        ],
      },
    ];
    const text = JSON.stringify({
      summary: '(dev stub) Set ANTHROPIC_API_KEY for real plans.',
      days,
    });
    return { text, tokensInput: 300, tokensOutput: 400 };
  }
}
