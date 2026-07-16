import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PricingService, PLATFORM_FEE_RATE } from './pricing.service';

const baseListing = {
  id: 'lst_1',
  status: 'APPROVED',
  rateRules: [
    {
      baseNightlyRate: 500000, // ₹5,000
      maxGuests: 4,
      minNights: 1,
      cleaningFee: 100000, // ₹1,000
    },
  ],
  seasonalRates: [] as { startsAt: Date; endsAt: Date; nightlyRate: number }[],
};

function makePrisma(listing = baseListing) {
  return {
    listing: {
      findFirst: jest.fn().mockResolvedValue(listing),
    },
  };
}

function makeSigner() {
  return {
    sign: jest.fn().mockReturnValue('mock-hmac'),
    verify: jest.fn().mockReturnValue(true),
  };
}

describe('PricingService', () => {
  let service: PricingService;
  let signer: ReturnType<typeof makeSigner>;

  beforeEach(() => {
    signer = makeSigner();
    service = new PricingService(
      makePrisma() as never,
      signer as never,
      { buildSnapshotLines: jest.fn().mockResolvedValue([]) } as never,
      { getMembership: jest.fn().mockResolvedValue({ tier: 'EXPLORER' }) } as never,
    );
  });

  it('calculates a 3-night quote correctly', async () => {
    const snapshot = await service.quote({
      listingId: 'lst_1',
      checkIn: '2026-04-01',
      checkOut: '2026-04-04',
      guests: 2,
    });

    expect(snapshot.nights).toBe(3);
    expect(snapshot.subtotal).toBe(1500000); // 3 * ₹5,000
    expect(snapshot.cleaningFee).toBe(100000);
    // Platform fee: 10% of (subtotal + cleaning) = 10% of ₹16,000 = ₹1,600
    expect(snapshot.platformFee).toBe(160000);
    // GST 18% on platform fee + add-on commission (no add-ons here): 18% of ₹1,600 = ₹288
    expect(snapshot.gstRate).toBe(0.18);
    expect(snapshot.gstAmount).toBe(28800);
    // Total = subtotal + cleaning + platform fee + GST = ₹17,888
    expect(snapshot.total).toBe(1788800);
    expect(snapshot.depositAmount).toBe(894400); // 50%
    expect(snapshot.balanceAmount).toBe(894400);
    expect(snapshot.hmac).toBe('mock-hmac');
    // Snapshot has a 30-min TTL set by SNAPSHOT_TTL_MS
    expect(typeof snapshot.expiresAt).toBe('string');
    expect(new Date(snapshot.expiresAt).getTime()).toBeGreaterThan(Date.now() + 25 * 60 * 1000);
    expect(signer.sign).toHaveBeenCalledTimes(1);
  });

  it('applies seasonal rates when applicable', async () => {
    const listing = {
      ...baseListing,
      seasonalRates: [
        {
          startsAt: new Date('2026-04-01'),
          endsAt: new Date('2026-04-03'),
          nightlyRate: 800000, // ₹8,000 for first 2 nights
        },
      ],
    };
    service = new PricingService(
      makePrisma(listing) as never,
      signer as never,
      { buildSnapshotLines: jest.fn().mockResolvedValue([]) } as never,
      { getMembership: jest.fn().mockResolvedValue({ tier: 'EXPLORER' }) } as never,
    );

    const snapshot = await service.quote({
      listingId: 'lst_1',
      checkIn: '2026-04-01',
      checkOut: '2026-04-04',
      guests: 1,
    });

    // 2 nights @ ₹8,000 + 1 night @ ₹5,000
    expect(snapshot.subtotal).toBe(2100000);
    expect(snapshot.nightlyBreakdown).toHaveLength(3);
    expect(snapshot.nightlyBreakdown[0].rate).toBe(800000);
    expect(snapshot.nightlyBreakdown[2].rate).toBe(500000);
  });

  it('rejects checkOut before checkIn', async () => {
    await expect(
      service.quote({
        listingId: 'lst_1',
        checkIn: '2026-04-05',
        checkOut: '2026-04-01',
        guests: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects guests exceeding maxGuests', async () => {
    await expect(
      service.quote({
        listingId: 'lst_1',
        checkIn: '2026-04-01',
        checkOut: '2026-04-02',
        guests: 10,
      }),
    ).rejects.toThrow('max 4 guests');
  });

  it('rejects listing not found', async () => {
    const prisma = makePrisma();
    prisma.listing.findFirst.mockResolvedValue(null);
    service = new PricingService(
      prisma as never,
      signer as never,
      { buildSnapshotLines: jest.fn().mockResolvedValue([]) } as never,
      { getMembership: jest.fn().mockResolvedValue({ tier: 'EXPLORER' }) } as never,
    );

    await expect(
      service.quote({
        listingId: 'lst_missing',
        checkIn: '2026-04-01',
        checkOut: '2026-04-02',
        guests: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('enforces platform fee rate at 10%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.1);
  });

  describe('computeRefundAmount', () => {
    it('returns 100% refund when ≥48h before check-in', () => {
      const checkIn = new Date('2026-04-10T14:00:00Z');
      const cancelledAt = new Date('2026-04-08T10:00:00Z'); // 52h before
      expect(service.computeRefundAmount(100000, checkIn, cancelledAt)).toBe(100000);
    });

    it('returns 50% refund when 10–48h before check-in', () => {
      const checkIn = new Date('2026-04-10T14:00:00Z');
      const cancelledAt = new Date('2026-04-09T14:00:00Z'); // 24h before
      expect(service.computeRefundAmount(100000, checkIn, cancelledAt)).toBe(50000);
    });

    it('returns 0% refund when ≤10h before check-in', () => {
      const checkIn = new Date('2026-04-10T14:00:00Z');
      const cancelledAt = new Date('2026-04-10T08:00:00Z'); // 6h before
      expect(service.computeRefundAmount(100000, checkIn, cancelledAt)).toBe(0);
    });

    it('returns 100% at exactly 48h boundary', () => {
      const checkIn = new Date('2026-04-10T14:00:00Z');
      const cancelledAt = new Date('2026-04-08T14:00:00Z'); // exactly 48h
      expect(service.computeRefundAmount(100000, checkIn, cancelledAt)).toBe(100000);
    });

    it('returns 0% at exactly 10h boundary', () => {
      const checkIn = new Date('2026-04-10T14:00:00Z');
      const cancelledAt = new Date('2026-04-10T04:00:00Z'); // exactly 10h
      expect(service.computeRefundAmount(100000, checkIn, cancelledAt)).toBe(0);
    });
  });
});
