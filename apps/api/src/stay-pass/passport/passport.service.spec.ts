import { PassportService } from './passport.service';

/**
 * Stay Passport tests: two-phase stamping (entry on check-in → sealed on
 * check-out), idempotency, the never-scanned backstop, and the passport
 * aggregation (stats + collection-set progress).
 */

const BOOKING = {
  id: 'booking-1',
  guestId: 'guest-1',
  listingId: 'listing-1',
  startsAt: new Date('2026-08-14T00:00:00Z'),
  endsAt: new Date('2026-08-17T00:00:00Z'),
  listing: { title: 'Canopy Villa', city: 'Auroville' },
};

function makeService(over: { existingStamp?: unknown } = {}) {
  const upserts: Array<{ where: unknown; create: unknown; update: unknown }> = [];
  const prisma = {
    booking: { findUnique: jest.fn().mockResolvedValue(BOOKING) },
    passportStamp: {
      findUnique: jest.fn().mockResolvedValue(over.existingStamp ?? null),
      upsert: jest.fn().mockImplementation(async (args: unknown) => {
        upserts.push(args as never);
        return {};
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const themes = {
    resolveForListing: jest.fn().mockResolvedValue({
      id: 'forest_villa',
      version: 1,
      displayName: 'Forest villa',
      tokens: { stamp_shape: 'hex' },
    }),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const svc = new PassportService(prisma as never, themes as never, audit as never);
  return { svc, prisma, themes, audit, upserts };
}

describe('PassportService', () => {
  it('mints an ENTRY stamp on check-in with checkedInAt set', async () => {
    const { svc, upserts, audit } = makeService();
    await svc.mintOnCheckin('booking-1');
    expect(upserts).toHaveLength(1);
    const create = upserts[0].create as { checkedInAt: Date; propertyName: string; nights: number };
    expect(create.checkedInAt).toBeInstanceOf(Date);
    expect(create.propertyName).toBe('Canopy Villa');
    expect(create.nights).toBe(3);
    expect(audit.log).toHaveBeenCalledWith(
      null, 'PASSPORT_STAMP_ENTRY', 'passport_stamp', 'booking-1', expect.anything(),
    );
  });

  it('seals the stamp on completion (sets completedAt)', async () => {
    const { svc, upserts } = makeService({
      existingStamp: { bookingId: 'booking-1', checkedInAt: new Date(), completedAt: null },
    });
    const sealed = await svc.sealOnComplete('booking-1');
    expect(sealed).toBe(true);
    const update = upserts[0].update as { completedAt: Date };
    expect(update.completedAt).toBeInstanceOf(Date);
  });

  it('is idempotent — re-sealing an already-sealed stamp is a no-op', async () => {
    const { svc, upserts } = makeService({
      existingStamp: { bookingId: 'booking-1', checkedInAt: new Date(), completedAt: new Date() },
    });
    const sealed = await svc.sealOnComplete('booking-1');
    expect(sealed).toBe(false);
    expect(upserts).toHaveLength(0);
  });

  it('backstop: seals a never-scanned stay at completion (checkedInAt null)', async () => {
    const { svc, upserts } = makeService(); // no existing stamp
    const sealed = await svc.sealOnComplete('booking-1');
    expect(sealed).toBe(true);
    const create = upserts[0].create as { checkedInAt: Date | null; completedAt: Date };
    expect(create.checkedInAt).toBeNull();
    expect(create.completedAt).toBeInstanceOf(Date);
  });

  it('aggregates the passport: stats + Curator’s Circuit progress', async () => {
    const { svc, prisma } = makeService();
    (prisma.passportStamp.findMany as jest.Mock).mockResolvedValue([
      { id: 's1', bookingId: 'b1', themeId: 'forest_villa', propertyName: 'A', city: 'X', nights: 3, stayStart: new Date('2026-08-14'), stayEnd: new Date('2026-08-17'), checkedInAt: new Date(), completedAt: new Date(), mintedAt: new Date() },
      { id: 's2', bookingId: 'b2', themeId: 'heritage', propertyName: 'B', city: 'Y', nights: 2, stayStart: new Date('2026-09-01'), stayEnd: new Date('2026-09-03'), checkedInAt: new Date(), completedAt: null, mintedAt: new Date() },
    ]);
    const p = await svc.getPassport('guest-1');
    expect(p.stats.totalStamps).toBe(2);
    expect(p.stats.sealedStamps).toBe(1);
    expect(p.stats.totalNights).toBe(5);
    expect(p.stats.distinctThemes).toBe(2);
    const circuit = p.collections[0];
    expect(circuit.required).toBe(5);
    expect(circuit.collected).toBe(2); // forest_villa + heritage
    expect(circuit.complete).toBe(false);
    expect(p.stamps[0].state).toBe('SEALED');
    expect(p.stamps[1].state).toBe('ENTRY');
    expect(p.stamps[0].memoryLine).toContain('3 nights');
  });
});
