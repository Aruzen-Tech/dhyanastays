import { NotFoundException } from '@nestjs/common';
import { CrmService } from './crm.service';

/** Minimal Prisma mock — only the delegates CrmService touches. */
function makePrisma(overrides: Record<string, unknown> = {}) {
  const prisma = {
    $transaction: (arr: Promise<unknown>[]) => Promise.all(arr),
    user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    booking: { groupBy: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    payment: { findMany: jest.fn(), aggregate: jest.fn() },
    review: { aggregate: jest.fn(), findMany: jest.fn() },
    guestIssue: { count: jest.fn(), findMany: jest.fn() },
    message: { count: jest.fn(), findMany: jest.fn() },
    crmActivity: { findMany: jest.fn(), create: jest.fn() },
    crmContactProfile: { upsert: jest.fn() },
    ...overrides,
  };
  return prisma;
}

describe('CrmService', () => {
  describe('listContacts', () => {
    it('computes bookingsCount + lifetime value (CAPTURED payments) per contact', async () => {
      const prisma = makePrisma();
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          fullName: 'Asha',
          email: 'asha@x.com',
          phone: null,
          avatarUrl: null,
          role: 'GUEST',
          createdAt: new Date(),
          crmProfile: { ownerId: null, doNotContact: false, source: null, leadScore: null },
          crmTags: [{ tag: { id: 't1', name: 'VIP', color: '#111' } }],
        },
      ]);
      prisma.booking.groupBy.mockResolvedValue([
        { guestId: 'u1', _count: { _all: 2 }, _max: { createdAt: new Date('2026-01-01') } },
      ]);
      prisma.payment.findMany.mockResolvedValue([
        { amount: 1000, booking: { guestId: 'u1' } },
        { amount: 500, booking: { guestId: 'u1' } },
      ]);

      const service = new CrmService(prisma as never);
      const res = await service.listContacts({});

      expect(res.total).toBe(1);
      expect(res.data[0].bookingsCount).toBe(2);
      expect(res.data[0].totalSpentPaise).toBe(1500);
      expect(res.data[0].tags).toEqual([{ id: 't1', name: 'VIP', color: '#111' }]);
      // only CAPTURED payments are queried
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'CAPTURED' }) }),
      );
    });

    it('filters to guests + hosts by default', async () => {
      const prisma = makePrisma();
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);

      const service = new CrmService(prisma as never);
      await service.listContacts({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: { in: ['GUEST', 'HOST'] } }) }),
      );
    });
  });

  describe('getTimeline', () => {
    it('merges CRM + derived events, newest first', async () => {
      const prisma = makePrisma();
      prisma.crmActivity.findMany.mockResolvedValue([
        { id: 'a1', type: 'NOTE', summary: 'Added a note', occurredAt: new Date('2026-03-01'), metadata: null },
      ]);
      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          status: 'CONFIRMED_PAID',
          startsAt: new Date(),
          endsAt: new Date(),
          createdAt: new Date('2026-03-05'),
          listing: { title: 'Forest Villa' },
        },
      ]);
      prisma.message.findMany.mockResolvedValue([]);
      prisma.guestIssue.findMany.mockResolvedValue([]);
      prisma.review.findMany.mockResolvedValue([
        { id: 'r1', rating: 5, createdAt: new Date('2026-02-01'), listing: { title: 'Forest Villa' } },
      ]);

      const service = new CrmService(prisma as never);
      const items = await service.getTimeline('u1');

      expect(items.map((i) => i.kind)).toEqual(['booking', 'crm', 'review']);
      expect(items[0].id).toBe('booking:b1');
      expect(items[2].summary).toContain('5★');
    });
  });

  describe('getContact360', () => {
    it('throws when the contact does not exist', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = new CrmService(prisma as never);
      await expect(service.getContact360('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('assembles KPIs from aggregates', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Asha',
        email: 'asha@x.com',
        phone: null,
        avatarUrl: null,
        role: 'GUEST',
        createdAt: new Date(),
        crmProfile: null,
        crmTags: [],
      });
      prisma.booking.count.mockResolvedValue(3);
      prisma.booking.findFirst.mockResolvedValue({ createdAt: new Date('2026-04-01'), startsAt: new Date() });
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 42000 } });
      prisma.review.aggregate.mockResolvedValue({ _count: { _all: 2 }, _avg: { rating: 4.5 } });
      prisma.guestIssue.count.mockResolvedValue(1);
      prisma.message.count.mockResolvedValue(7);

      const service = new CrmService(prisma as never);
      const res = await service.getContact360('u1');

      expect(res.kpis).toEqual({
        bookingsCount: 3,
        totalSpentPaise: 42000,
        lastBookingAt: new Date('2026-04-01'),
        reviewsCount: 2,
        avgRating: 4.5,
        openIssues: 1,
        messagesSent: 7,
      });
    });
  });

  describe('updateProfile', () => {
    it('upserts the profile and logs a CONTACT_UPDATED activity', async () => {
      const prisma = makePrisma();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.crmContactProfile.upsert.mockResolvedValue({ userId: 'u1', doNotContact: true });

      const service = new CrmService(prisma as never);
      await service.updateProfile('u1', { doNotContact: true }, 'admin1');

      expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
      expect(prisma.crmActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CONTACT_UPDATED', actorId: 'admin1' }),
        }),
      );
    });
  });
});
