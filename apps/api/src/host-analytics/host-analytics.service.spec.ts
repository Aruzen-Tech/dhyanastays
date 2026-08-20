import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostAnalyticsService } from './host-analytics.service';

type BroadPrismaMock = {
  host: {
    findUnique: jest.Mock;
  };
  listing: {
    findMany: jest.Mock;
  };
  booking: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  payoutLine: {
    aggregate: jest.Mock;
  };
  hostNotification: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $queryRawUnsafe: jest.Mock;
};

describe('HostAnalyticsService', () => {
  let service: HostAnalyticsService;
  let prisma: BroadPrismaMock;

  beforeEach(() => {
    prisma = {
      host: {
        findUnique: jest.fn(),
      },
      listing: {
        findMany: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      payoutLine: {
        aggregate: jest.fn(),
      },
      hostNotification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    service = new HostAnalyticsService(prisma as unknown as PrismaService);
  });

  describe('getListingPerformance', () => {
    it('uses the first rate rule as the base rate', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          title: 'Stay',
          city: 'Coorg',
          state: 'Karnataka',
          status: 'APPROVED',
          rateRules: [{ baseNightlyRate: 7500 }, { baseNightlyRate: 9000 }],
          bookings: [],
          _count: {
            bookings: 0,
          },
        },
      ]);

      const result = await service.getListingPerformance('user-1');

      expect(result[0].baseRate).toBe(7500);
    });

    it('returns zero base rate when no rate rules exist', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          title: 'Stay',
          city: 'Coorg',
          state: 'Karnataka',
          status: 'APPROVED',
          rateRules: [],
          bookings: [],
          _count: {
            bookings: 0,
          },
        },
      ]);

      const result = await service.getListingPerformance('user-1');

      expect(result[0].baseRate).toBe(0);
    });

    it('calculates revenue from the booking price snapshots', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          title: 'Stay',
          city: 'Coorg',
          state: 'Karnataka',
          status: 'APPROVED',
          rateRules: [],
          bookings: [
            {
              id: 'booking-1',
              priceSnapshot: { total: 10000 },
              startsAt: new Date(),
              endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              status: 'CONFIRMED_PAID',
            },
            {
              id: 'booking-2',
              priceSnapshot: { total: 15000 },
              startsAt: new Date(),
              endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              status: 'COMPLETED',
            },
          ],
          _count: {
            bookings: 2,
          },
        },
      ]);

      const result = await service.getListingPerformance('user-1');

      expect(result[0].totalBookings).toBe(2);
      expect(result[0].totalRevenue).toBe(25000);
    });

    it('calculates booked days and occupancy for the last 30 days', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      const now = new Date();
      const day = 24 * 60 * 60 * 1000;

      prisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          title: 'Mountain Stay',
          city: 'Coorg',
          state: 'Karnataka',
          status: 'APPROVED',
          rateRules: [],
          bookings: [
            // 3 days completely inside the 30-day window.
            {
              id: 'booking-1',
              status: 'CONFIRMED_PAID',
              priceSnapshot: { total: 10000 },
              startsAt: new Date(now.getTime() - 10 * day),
              endsAt: new Date(now.getTime() - 7 * day),
            },

            // Starts before the 30-day window and overlaps it by 2 days.
            {
              id: 'booking-2',
              status: 'CONFIRMED_PAID',
              priceSnapshot: { total: 15000 },
              startsAt: new Date(now.getTime() - 32 * day),
              endsAt: new Date(now.getTime() - 28 * day),
            },

            // Ends after now, contributing only the days up to now.
            {
              id: 'booking-3',
              status: 'BALANCE_DUE',
              priceSnapshot: { total: 20000 },
              startsAt: new Date(now.getTime() - 2 * day),
              endsAt: new Date(now.getTime() + 3 * day),
            },

            // Completely outside the 30-day window.
            {
              id: 'booking-4',
              status: 'COMPLETED',
              priceSnapshot: { total: 5000 },
              startsAt: new Date(now.getTime() - 40 * day),
              endsAt: new Date(now.getTime() - 35 * day),
            },
          ],
          _count: {
            bookings: 4,
          },
        },
      ]);

      const result = await service.getListingPerformance('user-1');

      expect(result[0].bookedDays30).toBe(7);
      expect(result[0].occupancyRate).toBe(23);
    });
  });

  describe('getRevenue', () => {
    it('returns revenue grouped by day for the authenticated host', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);

      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          period: new Date('2026-08-10T00:00:00.000Z'),
          revenue: BigInt(25000),
          count: BigInt(2),
        },
      ]);

      const result = await service.getRevenue(
        'user-1',
        '2026-08-01T00:00:00.000Z',
        '2026-08-31T23:59:59.999Z',
        'day',
      );

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`date_trunc('day'`),
        ['listing-1'],
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-31T23:59:59.999Z'),
      );

      expect(result).toEqual([
        {
          period: '2026-08-10T00:00:00.000Z',
          revenue: 25000,
          bookings: 2,
        },
      ]);
    });

    it('uses week grouping when requested', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);

      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getRevenue(
        'user-1',
        '2026-08-01T00:00:00.000Z',
        '2026-08-31T23:59:59.999Z',
        'week',
      );

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`date_trunc('week'`),
        ['listing-1'],
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-31T23:59:59.999Z'),
      );
    });

    it('uses month grouping when requested', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);

      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getRevenue(
        'user-1',
        '2026-08-01T00:00:00.000Z',
        '2026-08-31T23:59:59.999Z',
        'month',
      );

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`date_trunc('month'`),
        ['listing-1'],
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-31T23:59:59.999Z'),
      );
    });

    it('includes only revenue-bearing booking statuses in the query', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([{ id: 'listing-1' }]);

      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getRevenue(
        'user-1',
        '2026-08-01T00:00:00.000Z',
        '2026-08-31T23:59:59.999Z',
        'day',
      );

      const query = prisma.$queryRawUnsafe.mock.calls[0][0];

      expect(query).toContain(
        `b.status IN ('CONFIRMED_PAID','CONFIRMED_DEPOSIT','COMPLETED','BALANCE_DUE')`,
      );
    });
  });

  describe('getStats', () => {
    it('counts only confirmed bookings toward total bookings and revenue', async () => {
      const now = new Date();

      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          status: 'APPROVED',
        },
      ]);

      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'confirmed',
          status: 'CONFIRMED_PAID',
          priceSnapshot: { total: 10000 },
          startsAt: now,
          endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        {
          id: 'pending',
          status: 'PAYMENT_PENDING',
          priceSnapshot: { total: 50000 },
          startsAt: now,
          endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        {
          id: 'cancelled',
          status: 'CANCELLED',
          priceSnapshot: { total: 50000 },
          startsAt: now,
          endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      ]);

      prisma.payoutLine.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      const result = await service.getStats('user-1');

      expect(result?.totalBookings).toBe(1);
      expect(result?.totalRevenue).toBe(10000);
    });

    it('uses only paid payout lines for total earned', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([]);

      prisma.booking.findMany.mockResolvedValue([]);

      prisma.payoutLine.aggregate.mockResolvedValue({
        _sum: { amount: 42000 },
      });

      const result = await service.getStats('user-1');

      expect(prisma.payoutLine.aggregate).toHaveBeenCalledWith({
        where: {
          hostId: 'host-1',
          status: 'PAID',
        },
        _sum: {
          amount: true,
        },
      });

      expect(result?.totalEarned).toBe(42000);
    });

    it('returns zero values when the host has no listings or bookings', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.listing.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);

      prisma.payoutLine.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getStats('user-1');

      expect(result).toEqual({
        totalListings: 0,
        activeListings: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalEarned: 0,
        occupancyRate: 0,
        upcomingCheckins: 0,
      });
    });
  });

  describe('getBookings', () => {
    it('returns paginated bookings for the authenticated host', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.booking.findMany.mockResolvedValue([
        { id: 'booking-1' },
        { id: 'booking-2' },
      ]);
      prisma.booking.count.mockResolvedValue(5);

      const result = await service.getBookings('user-1', 2, 2);

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          listing: {
            hostId: 'host-1',
          },
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              city: true,
              state: true,
            },
          },
          guest: {
            select: {
              fullName: true,
              email: true,
            },
          },
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 2,
        take: 2,
      });
      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: {
          listing: {
            hostId: 'host-1',
          },
        },
      });
      expect(result).toEqual({
        bookings: [{ id: 'booking-1' }, { id: 'booking-2' }],
        total: 5,
        page: 2,
        limit: 2,
      });
    });

    it('applies the booking status filter when provided', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.booking.count.mockResolvedValue(0);

      await service.getBookings('user-1', 1, 20, 'CONFIRMED_PAID');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            listing: {
              hostId: 'host-1',
            },
            status: 'CONFIRMED_PAID',
          },
        }),
      );
      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: {
          listing: {
            hostId: 'host-1',
          },
          status: 'CONFIRMED_PAID',
        },
      });
    });

    it('returns an empty result when the user is not a host', async () => {
      prisma.host.findUnique.mockResolvedValue(null);

      const result = await service.getBookings('user-without-host', 1, 20);

      expect(result).toEqual({
        bookings: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      expect(prisma.booking.findMany).not.toHaveBeenCalled();
      expect(prisma.booking.count).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications and markAllNotificationsRead', () => {
    it('returns unread notifications for the authenticated host', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.hostNotification.findMany.mockResolvedValue([
        {
          id: 'notification-1',
          hostId: 'host-1',
          isRead: false,
          title: 'New booking',
        },
      ]);

      const result = await service.getNotifications('user-1', true);

      expect(prisma.hostNotification.findMany).toHaveBeenCalledWith({
        where: {
          hostId: 'host-1',
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0].isRead).toBe(false);
    });

    it('returns an empty list when the user is not a host', async () => {
      prisma.host.findUnique.mockResolvedValue(null);

      const result = await service.getNotifications('user-without-host', false);

      expect(result).toEqual([]);

      expect(prisma.hostNotification.findMany).not.toHaveBeenCalled();
    });

    it('marks all unread notifications as read for the authenticated host', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });

      prisma.hostNotification.updateMany.mockResolvedValue({
        count: 3,
      });

      const result = await service.markAllNotificationsRead('user-1');

      expect(prisma.hostNotification.updateMany).toHaveBeenCalledWith({
        where: {
          hostId: 'host-1',
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      expect(result).toEqual({
        count: 3,
      });
    });

    it('returns zero when the user is not a host', async () => {
      prisma.host.findUnique.mockResolvedValue(null);

      const result = await service.markAllNotificationsRead(
        'user-without-host',
      );

      expect(result).toEqual({
        count: 0,
      });

      expect(prisma.hostNotification.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('markNotificationRead', () => {
    it('marks a host notification as read', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.hostNotification.findFirst.mockResolvedValue({
        id: 'notification-1',
        hostId: 'host-1',
        isRead: false,
        title: 'New booking',
      });
      prisma.hostNotification.update.mockResolvedValue({
        id: 'notification-1',
        hostId: 'host-1',
        isRead: true,
        title: 'New booking',
      });

      const result = await service.markNotificationRead(
        'user-1',
        'notification-1',
      );

      expect(prisma.hostNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
          hostId: 'host-1',
        },
      });
      expect(prisma.hostNotification.update).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });

    it('rejects access to another host notification', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.hostNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markNotificationRead('user-1', 'notification-from-host-2'),
      ).rejects.toThrow(new NotFoundException('Notification not found'));

      expect(prisma.hostNotification.update).not.toHaveBeenCalled();
    });

    it('is idempotent when the notification is already read', async () => {
      prisma.host.findUnique.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
      });
      prisma.hostNotification.findFirst.mockResolvedValue({
        id: 'notification-1',
        hostId: 'host-1',
        isRead: true,
        title: 'New booking',
      });

      const result = await service.markNotificationRead(
        'user-1',
        'notification-1',
      );

      expect(prisma.hostNotification.update).not.toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('rejects when the authenticated user is not a host', async () => {
      prisma.host.findUnique.mockResolvedValue(null);

      await expect(
        service.markNotificationRead('user-without-host', 'notification-1'),
      ).rejects.toThrow(new NotFoundException('Host not found'));

      expect(prisma.hostNotification.findFirst).not.toHaveBeenCalled();
      expect(prisma.hostNotification.update).not.toHaveBeenCalled();
    });
  });
});
