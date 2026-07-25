import { HoldService } from './hold.service';

/**
 * Focused unit tests for the resume-on-return behaviour. The full create path
 * runs inside a SERIALIZABLE transaction (exercised by the integration suite);
 * the resume + active-hold reads happen before the transaction and are covered
 * directly here.
 */
const prismaMock = {
  hold: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};
const pricingMock = { quote: jest.fn() };
const auditMock = { log: jest.fn().mockResolvedValue(undefined) };

function svc() {
  return new HoldService(
    prismaMock as never,
    pricingMock as never,
    auditMock as never,
  );
}

const dto = {
  listingId: 'L1',
  checkIn: '2026-08-12',
  checkOut: '2026-08-15',
  guests: 2,
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
};

describe('HoldService resume behaviour', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resumes the guest\'s own live hold for the same dates without re-quoting', async () => {
    prismaMock.hold.findUnique.mockResolvedValue(null); // no idempotency match
    const existing = {
      id: 'hold-1',
      guestId: 'G1',
      listingId: 'L1',
      startsAt: new Date('2026-08-12'),
      endsAt: new Date('2026-08-15'),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    };
    prismaMock.hold.findFirst.mockResolvedValue(existing);

    const result = await svc().createHold('G1', dto as never);

    expect(result).toBe(existing);
    expect(pricingMock.quote).not.toHaveBeenCalled(); // resumed, not re-priced
    expect(auditMock.log).toHaveBeenCalledWith(
      'G1',
      'HOLD_RESUMED',
      'hold',
      'hold-1',
      expect.objectContaining({ listingId: 'L1' }),
    );
    // The own-hold lookup excludes holds already turned into bookings.
    expect(prismaMock.hold.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ guestId: 'G1', booking: null }),
      }),
    );
  });

  it('returns the existing hold on an idempotency-key replay', async () => {
    const existing = { id: 'hold-2', guestId: 'G1' };
    prismaMock.hold.findUnique.mockResolvedValue(existing);
    const result = await svc().createHold('G1', dto as never);
    expect(result).toBe(existing);
    expect(pricingMock.quote).not.toHaveBeenCalled();
  });

  it('getActiveHold returns the caller\'s current live un-booked hold', async () => {
    const active = { id: 'hold-3', guestId: 'G1', listingId: 'L1' };
    prismaMock.hold.findFirst.mockResolvedValue(active);
    const result = await svc().getActiveHold('G1', 'L1');
    expect(result).toBe(active);
    expect(prismaMock.hold.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          listingId: 'L1',
          guestId: 'G1',
          booking: null,
        }),
      }),
    );
  });
});
