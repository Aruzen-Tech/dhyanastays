"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ItineraryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItineraryService = void 0;
const common_1 = require("@nestjs/common");
class PaymentRequiredException extends common_1.HttpException {
    constructor(message) {
        super(message, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
}
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const COST_PER_KTOK_INPUT_PAISE = 7;
const COST_PER_KTOK_OUTPUT_PAISE = 33;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_VERSION = '2023-06-01';
const MAX_DAYS = 21;
const MAX_CHAT_HISTORY = 20;
let ItineraryService = ItineraryService_1 = class ItineraryService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(ItineraryService_1.name);
        this.model = ANTHROPIC_MODEL;
        this.apiKey = this.config.get('ANTHROPIC_API_KEY', '') ?? '';
        this.isProduction = this.config.get('NODE_ENV') === 'production';
        this.userMonthlyCapPaise = this.config.get('ITINERARY_USER_MONTHLY_CAP_PAISE', 5000);
        if (this.isProduction && !this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY is required in production — itinerary planner refuses to start without it');
        }
    }
    async listForUser(userId) {
        return this.prisma.itinerary.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async getById(userId, id) {
        const itinerary = await this.prisma.itinerary.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!itinerary || itinerary.userId !== userId) {
            throw new common_1.NotFoundException('Itinerary not found');
        }
        return itinerary;
    }
    async finalize(userId, id) {
        const itinerary = await this.assertOwnedById(userId, id);
        if (itinerary.status === client_1.ItineraryStatus.FINALIZED)
            return itinerary;
        return this.prisma.itinerary.update({
            where: { id },
            data: { status: client_1.ItineraryStatus.FINALIZED },
        });
    }
    async delete(userId, id) {
        await this.assertOwnedById(userId, id);
        await this.prisma.itinerary.delete({ where: { id } });
        return { deleted: true };
    }
    async suggestConcepts(userId, dto) {
        const days = this.daysBetween(dto.startsAt, dto.endsAt);
        await this.assertWithinMonthlyCap(userId);
        const prompt = this.buildSuggestionsPrompt(dto, days);
        const system = 'You are a wellness retreat planner. Return ONLY valid JSON: { "suggestions": [{"key":"slug","title":"...","theme":"...","summary":"..."}, ...] }. Provide exactly 3 distinct concepts. No prose, no markdown fences.';
        const result = await this.callAnthropic({
            system,
            userMessage: prompt,
            maxTokens: 800,
        });
        if (!result) {
            throw new common_1.ServiceUnavailableException('Itinerary AI is unavailable — please try again in a minute.');
        }
        const parsed = this.safeParse(result.text);
        if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) {
            throw new common_1.ServiceUnavailableException('Itinerary AI returned an unexpected response — please try again.');
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
    async generate(userId, dto) {
        const days = this.validateDateRange(dto.startsAt, dto.endsAt);
        await this.assertWithinMonthlyCap(userId);
        if (dto.listingId) {
            const listing = await this.prisma.listing.findUnique({
                where: { id: dto.listingId },
                select: { id: true },
            });
            if (!listing)
                throw new common_1.NotFoundException('Listing not found');
        }
        const result = await this.callLLMForPlan(dto, days);
        if (!result) {
            throw new common_1.ServiceUnavailableException('Itinerary AI is unavailable — please try again in a minute.');
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
                status: client_1.ItineraryStatus.GENERATED,
                summary: result.plan.summary,
                days: result.plan.days,
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
    async listMessages(userId, itineraryId) {
        await this.assertOwnedById(userId, itineraryId);
        return this.prisma.itineraryMessage.findMany({
            where: { itineraryId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async sendMessage(userId, itineraryId, content) {
        const itinerary = await this.assertOwnedById(userId, itineraryId);
        await this.assertWithinMonthlyCap(userId);
        const userMessage = await this.prisma.itineraryMessage.create({
            data: { itineraryId, role: 'user', content },
        });
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
            const assistantMessage = await this.prisma.itineraryMessage.create({
                data: {
                    itineraryId,
                    role: 'assistant',
                    content: 'Sorry — I had trouble reaching my planner brain just now. Try sending that again in a minute.',
                },
            });
            return { userMessage, assistantMessage, updated: itinerary };
        }
        const envelope = this.safeParse(result.text);
        const replyText = envelope?.reply ?? result.text;
        const patch = envelope?.patch ?? null;
        let appliedPatch;
        let updated = itinerary;
        if (patch && (Array.isArray(patch.days) || typeof patch.summary === 'string')) {
            const safePatch = {};
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
                            days: safePatch.days,
                        }),
                        ...(safePatch.summary !== undefined && {
                            summary: safePatch.summary,
                        }),
                        tokensInput: itinerary.tokensInput + result.tokensInput,
                        tokensOutput: itinerary.tokensOutput + result.tokensOutput,
                    },
                    include: { messages: { orderBy: { createdAt: 'asc' } } },
                });
                appliedPatch = safePatch;
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
    async getUsage(userId) {
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
    async assertOwnedById(userId, id) {
        const itinerary = await this.prisma.itinerary.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!itinerary)
            throw new common_1.NotFoundException('Itinerary not found');
        if (itinerary.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        return itinerary;
    }
    validateDateRange(startsAtIso, endsAtIso) {
        const startsAt = new Date(startsAtIso);
        const endsAt = new Date(endsAtIso);
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            throw new common_1.BadRequestException('Invalid dates');
        }
        if (endsAt.getTime() <= startsAt.getTime()) {
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        }
        const days = this.daysBetween(startsAtIso, endsAtIso);
        if (days > MAX_DAYS) {
            throw new common_1.BadRequestException(`Itinerary limited to ${MAX_DAYS} days`);
        }
        return days;
    }
    daysBetween(startsAtIso, endsAtIso) {
        return Math.ceil((new Date(endsAtIso).getTime() - new Date(startsAtIso).getTime()) /
            (1000 * 60 * 60 * 24));
    }
    currentMonthBucket() {
        const d = new Date();
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    async assertWithinMonthlyCap(userId) {
        if (this.userMonthlyCapPaise <= 0)
            return;
        const bucket = this.currentMonthBucket();
        const usage = await this.prisma.itineraryUsage.findUnique({
            where: { userId_monthBucket: { userId, monthBucket: bucket } },
        });
        if (usage && usage.costPaise >= this.userMonthlyCapPaise) {
            throw new PaymentRequiredException(`Monthly itinerary AI quota reached (${(this.userMonthlyCapPaise / 100).toFixed(0)}). Quota resets next month.`);
        }
    }
    async recordUsage(userId, delta) {
        const bucket = this.currentMonthBucket();
        const costPaiseDelta = Math.ceil((delta.tokensInput / 1000) * COST_PER_KTOK_INPUT_PAISE) +
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
    buildSuggestionsPrompt(dto, days) {
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
    buildPlanPrompt(dto, days) {
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
    buildChatSystemPrompt() {
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
    buildChatConversation(itinerary, history) {
        const stateMessage = {
            role: 'user',
            content: `[Current itinerary for ${itinerary.destination}]\n` +
                JSON.stringify({ summary: itinerary.summary, days: itinerary.days }),
        };
        const turns = history.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
        return [stateMessage, ...turns];
    }
    sanitizeDays(days) {
        return days
            .map((d, i) => {
            const obj = d;
            const sessions = Array.isArray(obj.sessions) ? obj.sessions : [];
            return {
                day: typeof obj.day === 'number' ? obj.day : i + 1,
                date: typeof obj.date === 'string' ? obj.date : '',
                title: typeof obj.title === 'string' ? obj.title.slice(0, 120) : '',
                sessions: sessions.slice(0, 12).map((s) => {
                    const so = s;
                    return {
                        time: typeof so.time === 'string' ? so.time.slice(0, 8) : '09:00',
                        title: typeof so.title === 'string' ? so.title.slice(0, 120) : '',
                        description: typeof so.description === 'string' ? so.description.slice(0, 600) : '',
                        category: typeof so.category === 'string' ? so.category.slice(0, 30) : 'activity',
                    };
                }),
            };
        })
            .filter((d) => d.date.length > 0 && d.title.length > 0);
    }
    async callAnthropic(opts) {
        if (!this.apiKey) {
            if (this.isProduction) {
                throw new common_1.ServiceUnavailableException('AI provider not configured');
            }
            this.logger.warn('ANTHROPIC_API_KEY not set — returning dev stub');
            return this.devStubResponse(opts);
        }
        const messages = opts.conversation ?? [{ role: 'user', content: opts.userMessage ?? '' }];
        const body = {
            model: this.model,
            max_tokens: opts.maxTokens,
            system: [
                {
                    type: 'text',
                    text: opts.system,
                    cache_control: { type: 'ephemeral' },
                },
            ],
            messages,
        };
        const attempt = async () => {
            const res = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': ANTHROPIC_API_VERSION,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const text = await res.text();
                return { ok: false, status: res.status, body: text };
            }
            const data = (await res.json());
            const text = data?.content?.[0]?.text ?? '';
            return {
                ok: true,
                text,
                tokensInput: (data.usage?.input_tokens ?? 0) +
                    (data.usage?.cache_read_input_tokens ?? 0),
                tokensOutput: data.usage?.output_tokens ?? 0,
            };
        };
        try {
            const r1 = await attempt();
            if (r1.ok)
                return r1;
            if (r1.status === 429 || r1.status >= 500) {
                this.logger.warn(`Anthropic ${r1.status}, retrying once after 2s`);
                await new Promise((r) => setTimeout(r, 2000));
                const r2 = await attempt();
                if (r2.ok)
                    return r2;
                this.logger.error(`Anthropic ${r2.status} after retry: ${r2.body.slice(0, 300)}`);
                return null;
            }
            this.logger.error(`Anthropic ${r1.status} (no retry): ${r1.body.slice(0, 300)}`);
            return null;
        }
        catch (err) {
            this.logger.error(`Anthropic call failed: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async callLLMForPlan(dto, days) {
        const system = 'You are a wellness retreat planner. Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.';
        const result = await this.callAnthropic({
            system,
            userMessage: this.buildPlanPrompt(dto, days),
            maxTokens: 4096,
        });
        if (!result)
            return null;
        const parsed = this.safeParse(result.text);
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
    safeParse(raw) {
        const trimmed = raw
            .trim()
            .replace(/^```(?:json)?/i, '')
            .replace(/```$/, '')
            .trim();
        try {
            return JSON.parse(trimmed);
        }
        catch {
            return null;
        }
    }
    devStubResponse(opts) {
        const ask = opts.userMessage ?? opts.conversation?.[0]?.content ?? '';
        if (opts.system.includes('Suggest 3 distinct concept')) {
            const text = JSON.stringify({
                suggestions: [
                    {
                        key: 'detox-reset',
                        title: 'Detox & Reset',
                        theme: 'detox',
                        summary: 'A grounding week of cleansing meals, gentle hatha and silent walks. For first-timers and post-burnout resets.',
                    },
                    {
                        key: 'practice-deepening',
                        title: 'Practice Deepening',
                        theme: 'yoga-intensive',
                        summary: 'Two yoga sessions a day with pranayama and meditation circles. Best for intermediate practitioners ready to go deeper.',
                    },
                    {
                        key: 'cultural-immersion',
                        title: 'Cultural Immersion',
                        theme: 'cultural',
                        summary: 'Yoga balanced with local temples, cooking classes and evening kirtan. For travellers who want context with their wellness.',
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
        const days = [
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
};
exports.ItineraryService = ItineraryService;
exports.ItineraryService = ItineraryService = ItineraryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ItineraryService);
//# sourceMappingURL=itinerary.service.js.map