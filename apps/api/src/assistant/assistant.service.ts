import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AskDto, AssistantCatalogItemDto } from './dto/ask.dto';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_VERSION = '2023-06-01';
const ANTHROPIC_TIMEOUT_MS = 20_000;

export interface AssistantSuggestion {
  label: string;
  href: string;
  why?: string;
}

export interface AssistantReply {
  answer: string;
  suggestions: AssistantSuggestion[];
  /** 'ai' when Anthropic answered; 'search' when the deterministic fallback did. */
  source: 'ai' | 'search';
}

/**
 * Role-aware, guide-and-navigate-only assistant. Grounded strictly in the
 * caller's own accessible features (sent by the client). Uses Anthropic Haiku
 * when configured — reusing the itinerary service's call shape — and always
 * degrades to a deterministic keyword match when the key is absent or the call
 * fails. Never performs actions; every suggested href is validated against the
 * caller's catalog so hallucinated routes are dropped.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '') ?? '';
  }

  async ask(role: string, dto: AskDto): Promise<AssistantReply> {
    const items = dto.items ?? [];
    const validHrefs = new Set(items.map((i) => i.href));

    if (!this.apiKey) {
      return this.keywordFallback(dto.message, items);
    }

    const catalog = items
      .map((i) => `- ${i.label} -> ${i.href}${i.description ? ` — ${i.description}` : ''}`)
      .join('\n');

    const system = [
      `You are the in-app navigator for Dhyana Stays (a wellness-retreat booking platform).`,
      `You are helping a user whose role is "${role}". You ONLY guide and navigate — you never`,
      `perform actions or change any data.`,
      ``,
      `Features this user can access (label -> route — description):`,
      catalog || '(no features available)',
      ``,
      `Answer the user's question in 1-3 short, friendly sentences, then pick up to 3 of the MOST`,
      `relevant routes. Respond with ONLY minified JSON (no prose, no code fences) of the shape:`,
      `{"answer": string, "suggestions": [{"label": string, "href": string, "why": string}]}`,
      `Every "href" MUST be copied verbatim from the list above — never invent a route. If nothing`,
      `fits, return an empty suggestions array.`,
    ].join('\n');

    const text = await this.callAnthropic(system, dto.message);
    if (text == null) return this.keywordFallback(dto.message, items);

    const parsed = this.parseJson(text);
    if (!parsed) return this.keywordFallback(dto.message, items);

    const suggestions: AssistantSuggestion[] = (parsed.suggestions ?? [])
      .filter((s): s is { label?: unknown; href: string; why?: unknown } =>
        !!s && typeof s.href === 'string' && validHrefs.has(s.href),
      )
      .slice(0, 3)
      .map((s) => ({
        label: String(s.label ?? items.find((i) => i.href === s.href)?.label ?? s.href),
        href: s.href,
        why: s.why ? String(s.why) : undefined,
      }));

    const answer =
      typeof parsed.answer === 'string' && parsed.answer.trim()
        ? parsed.answer.trim()
        : 'Here are the most relevant options.';

    return { answer, suggestions, source: 'ai' };
  }

  /** Deterministic keyword match — used with no API key or on AI failure. */
  private keywordFallback(message: string, items: AssistantCatalogItemDto[]): AssistantReply {
    const words = message
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);

    const scored = items
      .map((i) => {
        const hay = `${i.label} ${i.description ?? ''}`.toLowerCase();
        const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
        return { item: i, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      answer: scored.length
        ? `Here are the closest matches for "${message.slice(0, 80)}".`
        : `I couldn't find a matching feature. Try the ⋯ menu, or rephrase your request.`,
      suggestions: scored.map((x) => ({ label: x.item.label, href: x.item.href })),
      source: 'search',
    };
  }

  private parseJson(
    text: string,
  ): { answer?: unknown; suggestions?: Array<{ label?: unknown; href?: unknown; why?: unknown }> } | null {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end < start) return null;
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  private async callAnthropic(system: string, userMessage: string): Promise<string | null> {
    const body = {
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      system: [{ type: 'text', text: system }],
      messages: [{ role: 'user' as const, content: userMessage }],
    };

    const attempt = async (): Promise<{ ok: true; text: string } | { ok: false; status: number }> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ANTHROPIC_TIMEOUT_MS);
      try {
        const res = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_API_VERSION,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!res.ok) return { ok: false, status: res.status };
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        return { ok: true, text: data?.content?.[0]?.text ?? '' };
      } catch {
        return { ok: false, status: 0 };
      } finally {
        clearTimeout(timer);
      }
    };

    const r1 = await attempt();
    if (r1.ok) return r1.text;
    if (r1.status === 429 || r1.status >= 500 || r1.status === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      const r2 = await attempt();
      if (r2.ok) return r2.text;
    }
    this.logger.warn(`Assistant Anthropic call failed (status ${r1.status})`);
    return null;
  }
}
