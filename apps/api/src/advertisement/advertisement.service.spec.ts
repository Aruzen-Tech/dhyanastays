import { NotFoundException } from '@nestjs/common';
import { AdvertisementService } from './advertisement.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    advertisement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
    },
    ...overrides,
  };
}

describe('AdvertisementService', () => {
  describe('getActive', () => {
    it('queries the placement with an active + schedule-window filter and maps to the public shape', async () => {
      const prisma = makePrisma();
      prisma.advertisement.findMany.mockResolvedValue([
        {
          id: 'a1',
          title: 'Monsoon Week',
          body: 'Save 20%',
          imageUrl: null,
          ctaLabel: 'Explore',
          ctaHref: '/experiences',
          accentColor: '#123456',
          frequency: 'session',
          placement: 'explore_billboard',
          // counters intentionally present on the row but must not leak:
          impressionCount: 9,
          clickCount: 2,
        },
      ]);
      const service = new AdvertisementService(prisma as never);

      const feed = await service.getActive('explore_billboard');

      const where = prisma.advertisement.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ placement: 'explore_billboard', isActive: true });
      expect(Array.isArray(where.AND)).toBe(true); // start/end window clauses
      expect(feed[0]).toEqual({
        id: 'a1',
        title: 'Monsoon Week',
        body: 'Save 20%',
        imageUrl: null,
        ctaLabel: 'Explore',
        ctaHref: '/experiences',
        accentColor: '#123456',
        frequency: 'session',
        placement: 'explore_billboard',
      });
      expect(feed[0]).not.toHaveProperty('impressionCount');
    });
  });

  describe('create', () => {
    it('trims text, blanks empties to null, and parses schedule strings to dates', async () => {
      const prisma = makePrisma();
      prisma.advertisement.create.mockResolvedValue({ id: 'a9' });
      const service = new AdvertisementService(prisma as never);

      await service.create(
        { title: '  Hi  ', body: '  ', frequency: 'daily', startsAt: '2026-09-01T10:00', endsAt: '' },
        'admin1',
      );

      const data = prisma.advertisement.create.mock.calls[0][0].data;
      expect(data.title).toBe('Hi');
      expect(data.body).toBeNull();
      expect(data.frequency).toBe('daily');
      expect(data.startsAt).toBeInstanceOf(Date);
      expect(data.endsAt).toBeNull();
      expect(data.createdById).toBe('admin1');
    });
  });

  describe('update', () => {
    it('throws when the ad does not exist', async () => {
      const prisma = makePrisma();
      prisma.advertisement.findUnique.mockResolvedValue(null);
      const service = new AdvertisementService(prisma as never);

      await expect(service.update('nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.advertisement.update).not.toHaveBeenCalled();
    });

    it('only writes provided fields', async () => {
      const prisma = makePrisma();
      prisma.advertisement.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.advertisement.update.mockResolvedValue({ id: 'a1' });
      const service = new AdvertisementService(prisma as never);

      await service.update('a1', { isActive: false });

      expect(prisma.advertisement.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { isActive: false },
      });
    });
  });

  describe('recordImpression', () => {
    it('increments the counter via updateMany (never throws on a stale id)', async () => {
      const prisma = makePrisma();
      const service = new AdvertisementService(prisma as never);

      await service.recordImpression('a1');

      expect(prisma.advertisement.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { impressionCount: { increment: 1 } },
      });
    });
  });
});
