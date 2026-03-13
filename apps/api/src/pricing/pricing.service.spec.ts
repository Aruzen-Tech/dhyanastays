import { PricingService } from './pricing.service';

/**
 * Unit tests for PricingService.
 * PrismaService is mocked as a plain object — no DB required.
 * The `as unknown as` cast is intentional: PrismaClient types are generated
 * and may not be visible to the TS language server until after `prisma generate`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePrisma(listingResult: any) {
  return {
    listing: {
      findFirst: jest.fn().mockResolvedValue(listingResult),
    },
  };
}

const BASE_LISTING = {
  id: 'listing-1',
  status: 'APPROVED',
  rateRules: [{ baseNightlyRate: 5000, cleaningFee: 500, minNights: 1, maxGuests: 4 }],
  seasonalRates: [],
};

describe('PricingService', () => {
  describe('quote()', () => {
    it('calculates total for 3 nights at base rate with no seasonal override', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(BASE_LISTING) as any);

      const result = await service.quote({
        listingId: 'listing-1',
        checkIn: '2025-12-01',
        checkOut: '2025-12-04', // 3 nights
        guests: 2,
      });

      // 3 nights × 5000 = 15000 subtotal + 500 cleaning = 15500
      // platform fee = 10% of 15500 = 1550
      // total = 17050
      expect(result.nights).toBe(3);
      expect(result.subtotal).toBe(15000);
      expect(result.cleaningFee).toBe(500);
      expect(result.platformFee).toBe(1550);
      expect(result.total).toBe(17050);
      expect(result.depositAmount).toBe(Math.round(17050 * 0.5));
      expect(result.balanceAmount).toBe(17050 - Math.round(17050 * 0.5));
      expect(result.currency).toBe('INR');
    });

    it('uses seasonal rate when it overlaps the stay', async () => {
      const listingWithSeasonal = {
        ...BASE_LISTING,
        rateRules: [{ baseNightlyRate: 5000, cleaningFee: 0, minNights: 1, maxGuests: 4 }],
        seasonalRates: [
          {
            startsAt: new Date('2025-12-20'),
            endsAt: new Date('2025-12-31'),
            nightlyRate: 8000,
          },
        ],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(listingWithSeasonal) as any);

      const result = await service.quote({
        listingId: 'listing-1',
        checkIn: '2025-12-24',
        checkOut: '2025-12-26', // 2 nights
        guests: 2,
      });

      // 2 nights × 8000 = 16000 + 0 cleaning = 16000
      // platform fee = 10% = 1600
      // total = 17600
      expect(result.nights).toBe(2);
      expect(result.subtotal).toBe(16000);
      expect(result.platformFee).toBe(1600);
      expect(result.total).toBe(17600);
    });

    it('throws NotFoundException if listing not found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(null) as any);

      await expect(
        service.quote({
          listingId: 'no-listing',
          checkIn: '2025-12-01',
          checkOut: '2025-12-03',
          guests: 1,
        }),
      ).rejects.toThrow('Listing not found or not available');
    });

    it('throws BadRequestException if checkOut is not after checkIn', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(BASE_LISTING) as any);

      await expect(
        service.quote({
          listingId: 'listing-1',
          checkIn: '2025-12-05',
          checkOut: '2025-12-03',
          guests: 1,
        }),
      ).rejects.toThrow('checkOut must be after checkIn');
    });

    it('throws BadRequestException if guests exceed maxGuests', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(BASE_LISTING) as any);

      await expect(
        service.quote({
          listingId: 'listing-1',
          checkIn: '2025-12-01',
          checkOut: '2025-12-03',
          guests: 10, // maxGuests is 4
        }),
      ).rejects.toThrow('max 4 guests');
    });

    it('throws BadRequestException if stay is below minNights', async () => {
      const listingMinNights3 = {
        ...BASE_LISTING,
        rateRules: [{ baseNightlyRate: 5000, cleaningFee: 0, minNights: 3, maxGuests: 4 }],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(listingMinNights3) as any);

      await expect(
        service.quote({
          listingId: 'listing-1',
          checkIn: '2025-12-01',
          checkOut: '2025-12-02', // 1 night, min is 3
          guests: 2,
        }),
      ).rejects.toThrow('Minimum stay is 3 nights');
    });

    it('produces correct per-night breakdown array', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new PricingService(makePrisma(BASE_LISTING) as any);

      const result = await service.quote({
        listingId: 'listing-1',
        checkIn: '2025-12-01',
        checkOut: '2025-12-03', // 2 nights
        guests: 1,
      });

      expect(result.nightlyBreakdown).toHaveLength(2);
      expect(result.nightlyBreakdown[0].date).toBe('2025-12-01');
      expect(result.nightlyBreakdown[0].rate).toBe(5000);
      expect(result.nightlyBreakdown[1].date).toBe('2025-12-02');
    });
  });

  describe('computeRefundAmount()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new PricingService(makePrisma(null) as any);
    const totalPaid = 10000;

    it('returns 100% refund when cancelled ≥48h before check-in', () => {
      const checkIn = new Date(Date.now() + 72 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(10000);
    });

    it('returns 50% refund when cancelled <48h but >10h before check-in', () => {
      const checkIn = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(5000);
    });

    it('returns 0% refund when cancelled ≤10h before check-in', () => {
      const checkIn = new Date(Date.now() + 5 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(0);
    });

    it('returns 0% refund when check-in has already passed', () => {
      const checkIn = new Date(Date.now() - 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(0);
    });

    it('returns 100% for exactly 48h before check-in', () => {
      const checkIn = new Date(Date.now() + 48 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(10000);
    });

    it('returns 50% for exactly 47h before check-in', () => {
      const checkIn = new Date(Date.now() + 47 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(totalPaid, checkIn)).toBe(5000);
    });

    it('rounds 50% correctly for odd amounts', () => {
      const checkIn = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(service.computeRefundAmount(10001, checkIn)).toBe(5001);
    });
  });
});
