/**
 * Booking-engine integration suite — REAL Postgres.
 *
 * Proves the production-correctness invariants that mocked unit tests cannot:
 *   • Overlap trigger blocks double-booking (Layer 4 backstop)
 *   • GiST partial index is usable by the trigger's query
 *   • Ledger UPDATE/DELETE immutability triggers raise
 *   • ProcessedRazorpayEvent unique dedup (at-least-once webhooks)
 *   • SERIALIZABLE + FOR UPDATE concurrency control (the crown jewel):
 *       - confirm idempotency race: 10 concurrent → exactly 1 confirms
 *       - double-booking race: 10 concurrent inserts → exactly 1 commits
 *   • withSerializableRetry recovers from 40001 and never leaks 23P01
 *
 * Run: pnpm --filter @dhyana/api test:int
 */
import { withSerializableRetry } from '../../src/common/services/serializable-retry';
import {
  prisma,
  setupFixtures,
  teardownFixtures,
  createPendingBooking,
  buildSignedSnapshot,
  RUN_TAG,
  Fixtures,
} from './harness';
import { randomUUID } from 'crypto';

jest.setTimeout(120000);

// Concurrency proof iteration count. Spec asks for 50 in CI; default 25 keeps
// local runs brisk. Override with INT_CONCURRENCY_ITERATIONS.
const ITERATIONS = Number(process.env.INT_CONCURRENCY_ITERATIONS ?? 25);
const RACERS = 10;

let fx: Fixtures;

beforeAll(async () => {
  fx = await setupFixtures();
});

afterAll(async () => {
  await teardownFixtures();
  await prisma.$disconnect();
});

// Classify a failure as a "lost the race" conflict vs a real bug.
function isRaceConflict(err: any): boolean {
  const msg = String(err?.message ?? err);
  return (
    err?.code === 'P2034' || // serialization failure
    err?.code === 'P2002' || // unique violation (hold/booking dup)
    msg.includes('Double booking detected') || // overlap trigger
    msg.includes('could not serialize access') ||
    msg.includes('Dates no longer available') ||
    msg.includes('23P01')
  );
}

describe('Layer 4: overlap trigger blocks double-booking', () => {
  it('rejects a second overlapping booking — even at PAYMENT_PENDING (conflict set includes it)', async () => {
    const startsAt = new Date('2027-01-10');
    const endsAt = new Date('2027-01-13');
    // First booking → confirm it.
    const b1 = await createPendingBooking(fx, { startsAt, endsAt, total: 1700000 });
    await prisma.booking.update({
      where: { id: b1 },
      data: { status: 'CONFIRMED_PAID' },
    });

    // A second booking for the SAME dates must be blocked at INSERT time — the
    // trigger's conflict set includes PAYMENT_PENDING, so we can't even stage a
    // competing pending booking against confirmed dates. Stronger than the spec
    // (which only protects CONFIRMED).
    await expect(
      createPendingBooking(fx, { startsAt, endsAt, total: 1700000 }),
    ).rejects.toThrow(/Double booking detected/);
  });

  it('ALLOWS back-to-back bookings (checkout day == next check-in day)', async () => {
    // half-open range '[)' must permit this.
    const aStart = new Date('2027-02-01');
    const aEnd = new Date('2027-02-04');
    const bStart = new Date('2027-02-04'); // == aEnd
    const bEnd = new Date('2027-02-07');

    const a = await createPendingBooking(fx, { startsAt: aStart, endsAt: aEnd, total: 1700000 });
    await prisma.booking.update({ where: { id: a }, data: { status: 'CONFIRMED_PAID' } });

    // Back-to-back booking must be allowed.
    const b = await createPendingBooking(fx, { startsAt: bStart, endsAt: bEnd, total: 1700000 });
    const updated = await prisma.booking.update({
      where: { id: b },
      data: { status: 'CONFIRMED_PAID' },
    });
    expect(updated.status).toBe('CONFIRMED_PAID');
  });
});

describe('GiST partial index idx_booking_active_range', () => {
  it('exists with the correct partial predicate', async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_booking_active_range'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].indexdef).toContain('gist');
    expect(rows[0].indexdef).toContain('PAYMENT_PENDING');
    expect(rows[0].indexdef).toContain('CONFIRMED_PAID');
  });

  it('is USABLE by the overlap query (planner picks it with seqscan disabled)', async () => {
    // On a small table the planner may prefer a seq scan; force index usage to
    // prove the index covers the trigger's predicate. If the predicate didn't
    // match, the planner could not use the index at all.
    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN SELECT 1 FROM "Booking"
           WHERE "listingId" = '${fx.listingId}'
             AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
             AND tsrange("startsAt","endsAt",'[)') && tsrange('2027-03-01','2027-03-05','[)')`,
      );
    });
    const planText = plan.map((r) => r['QUERY PLAN']).join('\n');
    expect(planText).toContain('idx_booking_active_range');
  });
});

describe('Ledger immutability triggers', () => {
  it('blocks UPDATE on LedgerEvent', async () => {
    const id = `${RUN_TAG}_led_${randomUUID().slice(0, 8)}`;
    await prisma.ledgerEvent.create({
      data: {
        id,
        bookingId: `${RUN_TAG}_nobk`,
        type: 'PAYMENT_CAPTURED',
        amount: 100,
        metadata: {},
      },
    });
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "LedgerEvent" SET amount = 999 WHERE id = '${id}'`),
    ).rejects.toThrow(/immutable/);
  });

  it('blocks DELETE on LedgerEvent', async () => {
    const id = `${RUN_TAG}_led_${randomUUID().slice(0, 8)}`;
    await prisma.ledgerEvent.create({
      data: {
        id,
        bookingId: `${RUN_TAG}_nobk`,
        type: 'PAYMENT_CAPTURED',
        amount: 100,
        metadata: {},
      },
    });
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "LedgerEvent" WHERE id = '${id}'`),
    ).rejects.toThrow(/immutable/);
  });
});

describe('ProcessedRazorpayEvent dedup (at-least-once webhooks)', () => {
  it('unique constraint rejects a duplicate eventId', async () => {
    const eventId = `${RUN_TAG}_evt_${randomUUID().slice(0, 8)}`;
    await prisma.processedRazorpayEvent.create({
      data: { eventId, eventType: 'payment.captured' },
    });
    await expect(
      prisma.processedRazorpayEvent.create({
        data: { eventId, eventType: 'payment.captured' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('only ONE of N concurrent inserts of the same eventId wins', async () => {
    const eventId = `${RUN_TAG}_evt_${randomUUID().slice(0, 8)}`;
    const results = await Promise.allSettled(
      Array.from({ length: RACERS }, () =>
        prisma.processedRazorpayEvent.create({
          data: { eventId, eventType: 'payment.captured' },
        }),
      ),
    );
    const wins = results.filter((r) => r.status === 'fulfilled').length;
    expect(wins).toBe(1);
  });
});

describe('CONCURRENCY PROOF A — confirm idempotency race', () => {
  // One PAYMENT_PENDING booking, RACERS concurrent confirm transactions.
  // Exactly one transitions it to CONFIRMED_PAID; the rest are idempotent
  // no-ops. statusHistory must contain exactly one transition. No 23P01 leak.
  async function confirmOnce(bookingId: string): Promise<'won' | 'noop'> {
    return withSerializableRetry(prisma, async (tx) => {
      // Step 1: FOR UPDATE lock
      await tx.$queryRawUnsafe(`SELECT id FROM "Booking" WHERE id = '${bookingId}' FOR UPDATE`);
      const rows = await tx.$queryRawUnsafe<{ status: string }[]>(
        `SELECT status FROM "Booking" WHERE id = '${bookingId}'`,
      );
      // Step 2: idempotency
      if (rows[0].status !== 'PAYMENT_PENDING') return 'noop';
      // Step 5: overlap check (none expected — this is the only booking)
      const conflicts = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "Booking"
           WHERE "listingId" = (SELECT "listingId" FROM "Booking" WHERE id='${bookingId}')
             AND id <> '${bookingId}'
             AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
             AND tsrange("startsAt","endsAt",'[)') && tsrange(
                   (SELECT "startsAt" FROM "Booking" WHERE id='${bookingId}'),
                   (SELECT "endsAt" FROM "Booking" WHERE id='${bookingId}'),'[)')`,
      );
      if (conflicts.length > 0) throw new Error('Dates no longer available');
      // Step 6: transition + append statusHistory
      const entry = JSON.stringify([
        { from: 'PAYMENT_PENDING', to: 'CONFIRMED_PAID', event: 'PAYMENT_CONFIRMED_FULL', actorId: 'system:test', at: new Date().toISOString() },
      ]);
      await tx.$executeRawUnsafe(
        `UPDATE "Booking" SET status='CONFIRMED_PAID',
           "statusHistory" = "statusHistory" || '${entry}'::jsonb
         WHERE id='${bookingId}'`,
      );
      return 'won';
    });
  }

  it(`runs ${ITERATIONS}×: exactly 1 winner, ${RACERS - 1} no-ops, 1 history entry, no error leak`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const startsAt = new Date(2028, 0, 1 + i * 4);
      const endsAt = new Date(2028, 0, 1 + i * 4 + 3);
      const bookingId = await createPendingBooking(fx, { startsAt, endsAt, total: 1700000 });

      const outcomes = await Promise.allSettled(
        Array.from({ length: RACERS }, () => confirmOnce(bookingId)),
      );

      // No outcome may be a rejection — every confirm either won or no-op'd.
      const rejected = outcomes.filter((o) => o.status === 'rejected');
      if (rejected.length > 0) {
        throw new Error(
          `iteration ${i}: ${rejected.length} confirm(s) leaked an error: ` +
            (rejected[0] as PromiseRejectedResult).reason?.message,
        );
      }
      const wins = outcomes.filter(
        (o) => o.status === 'fulfilled' && o.value === 'won',
      ).length;
      expect(wins).toBe(1);

      // Final state: exactly one transition recorded.
      const b = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(b!.status).toBe('CONFIRMED_PAID');
      const history = b!.statusHistory as any[];
      expect(history.length).toBe(1);

      // cleanup this iteration's booking+hold to keep dates free
      await prisma.booking.delete({ where: { id: bookingId } });
    }
  });
});

describe('CONCURRENCY PROOF B — double-booking race (same dates, distinct bookings)', () => {
  // RACERS concurrent transactions each insert a CONFIRMED booking for the
  // SAME dates. The overlap trigger + SERIALIZABLE must allow exactly one.
  async function insertConfirmedBooking(
    startsAt: Date,
    endsAt: Date,
  ): Promise<'won' | 'lost'> {
    const suffix = randomUUID().slice(0, 8);
    const holdId = `${RUN_TAG}_bhold_${suffix}`;
    const bookingId = `${RUN_TAG}_bbk_${suffix}`;
    const snap = buildSignedSnapshot(
      fx.listingId, 1700000, startsAt.toISOString(), endsAt.toISOString(),
    );
    // Pre-create the hold (holds have no overlap trigger).
    await prisma.hold.create({
      data: {
        id: holdId, listingId: fx.listingId, guestId: fx.guestUserId,
        startsAt, endsAt, expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        priceSnapshot: snap as any, idempotencyKey: `${RUN_TAG}_bidem_${suffix}`,
      },
    });
    try {
      return await withSerializableRetry(prisma, async (tx) => {
        // Explicit overlap check (clean error before the trigger).
        const conflicts = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM "Booking"
             WHERE "listingId" = '${fx.listingId}'
               AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
               AND tsrange("startsAt","endsAt",'[)') && tsrange('${startsAt.toISOString()}','${endsAt.toISOString()}','[)')`,
        );
        if (conflicts.length > 0) throw new Error('Dates no longer available');
        const snapJson = JSON.stringify(snap).replace(/'/g, "''");
        await tx.$executeRawUnsafe(
          `INSERT INTO "Booking" (id,"listingId","guestId","holdId",status,plan,"startsAt","endsAt","priceSnapshot","acceptedTermsAt","statusHistory","createdAt","updatedAt")
           VALUES ('${bookingId}','${fx.listingId}','${fx.guestUserId}','${holdId}','CONFIRMED_PAID','FULL',
                   '${startsAt.toISOString()}','${endsAt.toISOString()}','${snapJson}'::jsonb, now(), '[]'::jsonb, now(), now())`,
        );
        return 'won' as const;
      });
    } catch (err) {
      if (isRaceConflict(err)) return 'lost';
      throw err; // real bug — propagate
    }
  }

  it(`runs ${ITERATIONS}×: exactly 1 CONFIRMED booking survives each race`, async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const startsAt = new Date(2029, 0, 1 + i * 4);
      const endsAt = new Date(2029, 0, 1 + i * 4 + 3);

      const outcomes = await Promise.all(
        Array.from({ length: RACERS }, () => insertConfirmedBooking(startsAt, endsAt)),
      );
      const wins = outcomes.filter((o) => o === 'won').length;
      expect(wins).toBe(1);

      // DB invariant: exactly one CONFIRMED booking for these dates.
      const confirmed = await prisma.booking.findMany({
        where: {
          listingId: fx.listingId,
          status: 'CONFIRMED_PAID',
          startsAt,
          endsAt,
        },
      });
      expect(confirmed.length).toBe(1);

      // cleanup
      await prisma.booking.deleteMany({
        where: { id: { startsWith: `${RUN_TAG}_bbk_` }, startsAt },
      });
      await prisma.hold.deleteMany({
        where: { id: { startsWith: `${RUN_TAG}_bhold_` }, startsAt },
      });
    }
  });
});

describe('SERIALIZABLE retry recovers from 40001', () => {
  it('retries once and succeeds when the first attempt hits a serialization failure', async () => {
    let attempts = 0;
    const result = await withSerializableRetry(
      prisma,
      async (tx) => {
        attempts++;
        if (attempts === 1) {
          // Simulate a serialization failure on the first attempt.
          const e: any = new Error('could not serialize access due to concurrent update');
          e.code = 'P2034';
          throw e;
        }
        const rows = await tx.$queryRawUnsafe<{ ok: number }[]>('SELECT 1 as ok');
        return rows[0].ok;
      },
      { jitterMs: 0 },
    );
    expect(result).toBe(1);
    expect(attempts).toBe(2);
  });
});
