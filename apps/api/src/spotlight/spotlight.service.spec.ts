import { BadRequestException } from '@nestjs/common';
import { SpotlightService } from './spotlight.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    spotlightStay: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    listing: { findUnique: jest.fn() },
    review: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    ...overrides,
  };
}

function listingRow(over: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    title: 'The Palm Grove Retreat',
    description: 'Listing description.',
    city: 'Pondicherry',
    state: 'Tamil Nadu',
    status: 'APPROVED',
    media: [{ url: 'https://img/1.jpg' }],
    rateRules: [{ baseNightlyRate: 850000 }],
    ...over,
  };
}

describe('SpotlightService', () => {
  describe('getPublicFeed', () => {
    it('maps rows to the PromotedStay shape with badge/tagline/description fallbacks', async () => {
      const prisma = makePrisma();
      prisma.spotlightStay.findMany.mockResolvedValue([
        { id: 's1', listingId: 'l1', badge: null, tagline: null, media: [], listing: listingRow() },
        {
          id: 's2',
          listingId: 'l2',
          badge: 'Guest Favourite',
          tagline: 'Wake to birdsong.',
          media: [],
          listing: listingRow({ id: 'l2', title: 'Misty Hills', city: 'Munnar', state: 'Kerala' }),
        },
      ]);
      prisma.review.groupBy.mockResolvedValue([
        { listingId: 'l1', _avg: { rating: 4.85 }, _count: { _all: 128 } },
      ]);
      const service = new SpotlightService(prisma as never);

      const feed = await service.getPublicFeed();

      expect(feed[0]).toMatchObject({
        id: 's1',
        listingId: 'l1',
        title: 'The Palm Grove Retreat',
        location: 'Pondicherry, Tamil Nadu',
        description: 'Listing description.', // falls back to listing description
        badge: 'Featured Stay', // falls back to default
        nightlyRate: 850000,
        rating: 4.9, // rounded to 1 dp
        reviewCount: 128,
      });
      expect(feed[1]).toMatchObject({
        badge: 'Guest Favourite',
        description: 'Wake to birdsong.', // tagline wins over listing description
        rating: 0, // no reviews aggregated
        reviewCount: 0,
      });
    });
  });

  describe('add', () => {
    it('rejects a listing already in the spotlight', async () => {
      const prisma = makePrisma();
      prisma.listing.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.spotlightStay.findUnique.mockResolvedValue({ id: 's1', listingId: 'l1' });
      const service = new SpotlightService(prisma as never);

      await expect(service.add({ listingId: 'l1' }, 'admin1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.spotlightStay.create).not.toHaveBeenCalled();
    });

    it('appends after the current max sortOrder', async () => {
      const prisma = makePrisma();
      prisma.listing.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.spotlightStay.findUnique.mockResolvedValue(null);
      prisma.spotlightStay.findFirst.mockResolvedValue({ sortOrder: 4 });
      prisma.spotlightStay.create.mockResolvedValue({ id: 's9' });
      const service = new SpotlightService(prisma as never);

      await service.add({ listingId: 'l1', badge: '  ' }, 'admin1');

      expect(prisma.spotlightStay.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ listingId: 'l1', sortOrder: 5, badge: null }),
        }),
      );
    });
  });

  describe('reorder', () => {
    it('rejects an id list that does not cover every row exactly once', async () => {
      const prisma = makePrisma();
      prisma.spotlightStay.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const service = new SpotlightService(prisma as never);

      await expect(service.reorder(['a'])).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('writes sortOrder = index for a complete list', async () => {
      const prisma = makePrisma();
      prisma.spotlightStay.findMany
        .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]) // membership check
        .mockResolvedValueOnce([]); // listAll() after
      const service = new SpotlightService(prisma as never);

      await service.reorder(['b', 'a']);

      expect(prisma.spotlightStay.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'b' }, data: { sortOrder: 0 } }),
      );
      expect(prisma.spotlightStay.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a' }, data: { sortOrder: 1 } }),
      );
    });
  });
});
