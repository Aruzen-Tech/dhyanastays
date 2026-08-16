import { AssistantService } from './assistant.service';
import type { AskDto } from './dto/ask.dto';

function makeService(apiKey: string) {
  const config = { get: jest.fn().mockReturnValue(apiKey) };
  return new AssistantService(config as never);
}

const items: AskDto['items'] = [
  { label: 'Refunds', href: '/admin/refunds', description: 'issue booking refunds' },
  { label: 'Payouts', href: '/admin/payouts', description: 'host payouts' },
  { label: 'Users', href: '/admin/users', description: 'manage user accounts' },
];

/** Override the private Anthropic call with a canned response. */
function stubAnthropic(service: AssistantService, value: string | null) {
  (service as unknown as { callAnthropic: () => Promise<string | null> }).callAnthropic = jest
    .fn()
    .mockResolvedValue(value);
}

describe('AssistantService', () => {
  describe('no API key → deterministic keyword fallback', () => {
    it('matches features by keyword and marks source=search', async () => {
      const service = makeService('');
      const res = await service.ask('ADMIN', { message: 'how do I issue a refund', items });

      expect(res.source).toBe('search');
      expect(res.suggestions[0].href).toBe('/admin/refunds');
    });

    it('returns no suggestions for an unmatched query', async () => {
      const service = makeService('');
      const res = await service.ask('ADMIN', { message: 'quantum teleportation', items });

      expect(res.source).toBe('search');
      expect(res.suggestions).toHaveLength(0);
    });
  });

  describe('with API key → AI path', () => {
    it('drops suggestions whose href is not in the caller catalog (anti-hallucination)', async () => {
      const service = makeService('sk-test');
      stubAnthropic(
        service,
        JSON.stringify({
          answer: 'Head to Refunds.',
          suggestions: [
            { label: 'Refunds', href: '/admin/refunds', why: 'issue it here' },
            { label: 'Hacked', href: '/admin/DOES_NOT_EXIST', why: 'nope' },
          ],
        }),
      );

      const res = await service.ask('ADMIN', { message: 'refund a booking', items });

      expect(res.source).toBe('ai');
      expect(res.answer).toBe('Head to Refunds.');
      expect(res.suggestions).toHaveLength(1);
      expect(res.suggestions[0].href).toBe('/admin/refunds');
    });

    it('falls back to keyword search when the AI call fails', async () => {
      const service = makeService('sk-test');
      stubAnthropic(service, null);

      const res = await service.ask('ADMIN', { message: 'payouts', items });

      expect(res.source).toBe('search');
      expect(res.suggestions[0].href).toBe('/admin/payouts');
    });

    it('falls back when the AI returns unparseable text', async () => {
      const service = makeService('sk-test');
      stubAnthropic(service, 'sorry, I only speak prose today');

      const res = await service.ask('ADMIN', { message: 'users', items });

      expect(res.source).toBe('search');
      expect(res.suggestions[0].href).toBe('/admin/users');
    });
  });
});
