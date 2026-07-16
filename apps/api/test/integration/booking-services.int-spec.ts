/**
 * Service-level integration — real services against real Postgres.
 *
 * Exercises the actual production classes (not mocks):
 *   • PriceSnapshotSignerService — tamper detection on a real DB row
 *   • BookingStateMachine — statusHistory append + illegal-transition reject
 *     committed to and read back from Postgres.
 */
import { ConfigService } from '@nestjs/config';
import { PriceSnapshotSignerService } from '../../src/common/services/price-snapshot-signer.service';
import {
  BookingStateMachine,
  IllegalTransitionException,
} from '../../src/booking/state-machine';
import {
  prisma,
  setupFixtures,
  teardownFixtures,
  createPendingBooking,
  signSnapshot,
  Fixtures,
} from './harness';

jest.setTimeout(60000);

const SNAPSHOT_SECRET =
  process.env.PRICE_SNAPSHOT_SECRET ?? 'dev-snapshot-secret-min-32-characters!';

function makeSigner(): PriceSnapshotSignerService {
  const config = {
    get: (_key: string, def?: unknown) => SNAPSHOT_SECRET ?? def,
  } as unknown as ConfigService;
  return new PriceSnapshotSignerService(config);
}

let fx: Fixtures;

beforeAll(async () => {
  fx = await setupFixtures();
});

afterAll(async () => {
  await teardownFixtures();
  await prisma.$disconnect();
});

describe('Step 3: tampered priceSnapshot detection (real signer + real DB row)', () => {
  it('verify() PASSES for an untampered snapshot read back from the DB', async () => {
    const bookingId = await createPendingBooking(fx, {
      startsAt: new Date('2030-01-10'),
      endsAt: new Date('2030-01-13'),
      total: 1700000,
    });
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const snap = booking!.priceSnapshot as Record<string, unknown>;
    const signer = makeSigner();
    const { hmac, ...withoutHmac } = snap as { hmac: string };
    expect(signer.verify(withoutHmac, hmac)).toBe(true);
  });

  it('verify() FAILS after the snapshot total is mutated directly in the DB', async () => {
    const bookingId = await createPendingBooking(fx, {
      startsAt: new Date('2030-02-10'),
      endsAt: new Date('2030-02-13'),
      total: 1700000,
    });
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const snap = booking!.priceSnapshot as Record<string, unknown>;

    // Simulate a rogue write that changed the amount but left the old hmac.
    const tampered = { ...snap, total: 1 };
    await prisma.booking.update({
      where: { id: bookingId },
      data: { priceSnapshot: tampered as never },
    });

    const reread = await prisma.booking.findUnique({ where: { id: bookingId } });
    const rsnap = reread!.priceSnapshot as { hmac: string };
    const { hmac, ...withoutHmac } = rsnap;
    const signer = makeSigner();
    // The confirm path would throw TamperedSnapshotException on this.
    expect(signer.verify(withoutHmac, hmac)).toBe(false);
  });

  it('re-signing the tampered snapshot would NOT match the original signature', async () => {
    const signer = makeSigner();
    const base = {
      listingId: fx.listingId,
      checkIn: '2030-03-01',
      checkOut: '2030-03-04',
      total: 1700000,
    } as Record<string, unknown>;
    const sigA = signSnapshot(base);
    const sigB = signSnapshot({ ...base, total: 1 });
    expect(sigA).not.toBe(sigB);
    // Both are internally valid, proving the signer is deterministic + sensitive.
    expect(signer.verify(base, sigA)).toBe(true);
    expect(signer.verify({ ...base, total: 1 }, sigB)).toBe(true);
    expect(signer.verify({ ...base, total: 1 }, sigA)).toBe(false);
  });
});

describe('BookingStateMachine on real Postgres', () => {
  const sm = new BookingStateMachine();

  it('PAYMENT_CONFIRMED_FULL appends a statusHistory entry persisted to the DB', async () => {
    const bookingId = await createPendingBooking(fx, {
      startsAt: new Date('2030-04-10'),
      endsAt: new Date('2030-04-13'),
      total: 1700000,
      plan: 'FULL',
    });

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      await sm.transition(tx as never, booking as never, 'PAYMENT_CONFIRMED_FULL', {
        actorId: 'system:test',
        metadata: { paymentId: 'pay_int_1' },
      });
    });

    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after!.status).toBe('CONFIRMED_PAID');
    const history = after!.statusHistory as any[];
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      from: 'PAYMENT_PENDING',
      to: 'CONFIRMED_PAID',
      event: 'PAYMENT_CONFIRMED_FULL',
      actorId: 'system:test',
    });
    expect(history[0].metadata).toMatchObject({ paymentId: 'pay_int_1' });
  });

  it('rejects an illegal transition and leaves the DB row untouched', async () => {
    const bookingId = await createPendingBooking(fx, {
      startsAt: new Date('2030-05-10'),
      endsAt: new Date('2030-05-13'),
      total: 1700000,
      plan: 'FULL',
    });
    // Move it to COMPLETED first (legal: PAYMENT_PENDING is not — use two hops).
    await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: bookingId } });
      await sm.transition(tx as never, b as never, 'PAYMENT_CONFIRMED_FULL', {
        actorId: 'system:test',
      });
    });
    await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id: bookingId } });
      await sm.transition(tx as never, b as never, 'STAY_COMPLETED', {
        actorId: 'system:test',
      });
    });

    // COMPLETED is terminal — any further event must throw IllegalTransition.
    const before = await prisma.booking.findUnique({ where: { id: bookingId } });
    await expect(
      prisma.$transaction(async (tx) => {
        const b = await tx.booking.findUnique({ where: { id: bookingId } });
        return sm.transition(tx as never, b as never, 'PAYMENT_CONFIRMED_FULL', {
          actorId: 'system:test',
        });
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionException);

    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after!.status).toBe('COMPLETED');
    // statusHistory unchanged (2 legal hops, the illegal one didn't append).
    expect((after!.statusHistory as any[]).length).toBe(
      (before!.statusHistory as any[]).length,
    );
  });

  it('full lifecycle persists an ordered statusHistory: PENDING→DEPOSIT→BALANCE_DUE→PAID→COMPLETED', async () => {
    const bookingId = await createPendingBooking(fx, {
      startsAt: new Date('2030-06-10'),
      endsAt: new Date('2030-06-13'),
      total: 1700000,
      plan: 'DEPOSIT_50',
    });
    const hops: Array<[string, string]> = [
      ['PAYMENT_CONFIRMED_DEPOSIT', 'CONFIRMED_DEPOSIT'],
      ['BALANCE_DUE_TRIGGERED', 'BALANCE_DUE'],
      ['BALANCE_PAID', 'CONFIRMED_PAID'],
      ['STAY_COMPLETED', 'COMPLETED'],
    ];
    for (const [event] of hops) {
      await prisma.$transaction(async (tx) => {
        const b = await tx.booking.findUnique({ where: { id: bookingId } });
        await sm.transition(tx as never, b as never, event as never, {
          actorId: 'system:test',
        });
      });
    }
    const after = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(after!.status).toBe('COMPLETED');
    const history = after!.statusHistory as any[];
    expect(history.map((h) => h.to)).toEqual([
      'CONFIRMED_DEPOSIT',
      'BALANCE_DUE',
      'CONFIRMED_PAID',
      'COMPLETED',
    ]);
  });
});
