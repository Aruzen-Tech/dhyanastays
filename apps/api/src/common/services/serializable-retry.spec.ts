import { Prisma, PrismaClient } from '@prisma/client';
import { withSerializableRetry, __internal } from './serializable-retry';

const { isSerializationFailure } = __internal;

// Minimal PrismaClient mock — just $transaction is exercised.
function makePrismaMock(
  txImpl: (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => Promise<unknown>,
): PrismaClient {
  return { $transaction: txImpl } as unknown as PrismaClient;
}

describe('withSerializableRetry', () => {
  describe('isSerializationFailure detection', () => {
    it('detects Prisma P2034', () => {
      expect(isSerializationFailure({ code: 'P2034' })).toBe(true);
    });
    it('detects raw meta.code 40001', () => {
      expect(isSerializationFailure({ meta: { code: '40001' } })).toBe(true);
    });
    it('detects "could not serialize access" message wording', () => {
      expect(
        isSerializationFailure({ message: 'could not serialize access due to ...' }),
      ).toBe(true);
    });
    it('rejects 23P01 (exclusion / overlap trigger)', () => {
      expect(isSerializationFailure({ code: '23P01' })).toBe(false);
      expect(isSerializationFailure({ meta: { code: '23P01' } })).toBe(false);
    });
    it('rejects unrelated errors', () => {
      expect(isSerializationFailure(new Error('boom'))).toBe(false);
      expect(isSerializationFailure({})).toBe(false);
      expect(isSerializationFailure(null)).toBe(false);
      expect(isSerializationFailure(undefined)).toBe(false);
    });
  });

  describe('happy path', () => {
    it('returns the inner function result without retry', async () => {
      let calls = 0;
      const prisma = makePrismaMock(async (fn) => {
        calls++;
        return fn({} as Prisma.TransactionClient);
      });
      const result = await withSerializableRetry(
        prisma,
        async () => 'ok' as const,
      );
      expect(result).toBe('ok');
      expect(calls).toBe(1);
    });

    it('passes isolationLevel: Serializable + timeout to $transaction', async () => {
      const captured: Array<{
        opts?: { isolationLevel?: unknown; timeout?: unknown };
      }> = [];
      const prisma = {
        $transaction: jest.fn().mockImplementation((fn, opts) => {
          captured.push({ opts });
          return fn({});
        }),
      } as unknown as PrismaClient;

      await withSerializableRetry(prisma, async () => 1, { timeoutMs: 5000 });
      expect(captured[0].opts).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000,
      });
    });
  });

  describe('retry behaviour', () => {
    it('retries exactly once on serialization failure then succeeds', async () => {
      let calls = 0;
      const prisma = makePrismaMock(async (fn) => {
        calls++;
        if (calls === 1) {
          throw { code: 'P2034' };
        }
        return fn({} as Prisma.TransactionClient);
      });
      const result = await withSerializableRetry(
        prisma,
        async () => 'recovered',
        { jitterMs: 0 },
      );
      expect(result).toBe('recovered');
      expect(calls).toBe(2);
    });

    it('rethrows after exhausting retries', async () => {
      let calls = 0;
      const prisma = makePrismaMock(async () => {
        calls++;
        throw { code: 'P2034' };
      });
      await expect(
        withSerializableRetry(prisma, async () => 'never', { jitterMs: 0 }),
      ).rejects.toMatchObject({ code: 'P2034' });
      // maxRetries default = 1 → 2 total attempts
      expect(calls).toBe(2);
    });

    it('does NOT retry on non-serialization errors', async () => {
      let calls = 0;
      const prisma = makePrismaMock(async () => {
        calls++;
        throw new Error('database died');
      });
      await expect(
        withSerializableRetry(prisma, async () => 'no', { jitterMs: 0 }),
      ).rejects.toThrow('database died');
      expect(calls).toBe(1);
    });

    it('does NOT retry on exclusion-constraint 23P01 (real conflict)', async () => {
      // 23P01 == real double-booking conflict caught by the trigger backstop.
      // Retry can't fix it — it must propagate.
      let calls = 0;
      const prisma = makePrismaMock(async () => {
        calls++;
        throw { code: '23P01', message: 'exclusion violation' };
      });
      await expect(
        withSerializableRetry(prisma, async () => 'no', { jitterMs: 0 }),
      ).rejects.toMatchObject({ code: '23P01' });
      expect(calls).toBe(1);
    });

    it('respects custom maxRetries', async () => {
      let calls = 0;
      const prisma = makePrismaMock(async () => {
        calls++;
        throw { code: 'P2034' };
      });
      await expect(
        withSerializableRetry(prisma, async () => 'no', {
          maxRetries: 3,
          jitterMs: 0,
        }),
      ).rejects.toMatchObject({ code: 'P2034' });
      // maxRetries=3 → 4 total attempts
      expect(calls).toBe(4);
    });

    it('caller body passes a fresh tx on each attempt', async () => {
      const txInstances: object[] = [];
      let txCounter = 0;
      const prisma = makePrismaMock(async (fn) => {
        const tx = { _id: ++txCounter } as unknown as Prisma.TransactionClient;
        txInstances.push(tx);
        if (txCounter === 1) throw { code: 'P2034' };
        return fn(tx);
      });
      await withSerializableRetry(prisma, async (tx) => {
        // Caller-visible tx changes between attempts; the inner function
        // re-reads through the new tx — see spec "Critical gotcha on retry scope".
        return (tx as unknown as { _id: number })._id;
      }, { jitterMs: 0 });
      expect(txInstances).toHaveLength(2);
      expect(txInstances[0]).not.toBe(txInstances[1]);
    });
  });
});
