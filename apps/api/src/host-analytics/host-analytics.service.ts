import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HostAnalyticsService {
  private readonly logger = new Logger(HostAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quick stats overview for the host dashboard.
   */
  async getStats(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return null;

    const [listings, bookings, payoutAgg] = await Promise.all([
      this.prisma.listing.findMany({
        where: { hostId: host.id },
        select: { id: true, status: true },
      }),
      this.prisma.booking.findMany({
        where: { listing: { hostId: host.id } },
        select: { id: true, status: true, priceSnapshot: true, startsAt: true, endsAt: true },
      }),
      this.prisma.payoutLine.aggregate({
        where: { hostId: host.id, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const activeListings = listings.filter((l) => l.status === 'APPROVED').length;
    const totalListings = listings.length;
    const confirmedStatuses = ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT', 'COMPLETED', 'BALANCE_DUE'];
    const confirmedBookings = bookings.filter((b) => confirmedStatuses.includes(b.status));
    const totalRevenue = confirmedBookings.reduce((sum, b) => {
      const snap = b.priceSnapshot as any;
      return sum + (snap?.total ?? 0);
    }, 0);

    // Calculate occupancy: days booked / (active listings * 30 days) for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentBookings = confirmedBookings.filter(
      (b) => new Date(b.endsAt) >= thirtyDaysAgo && new Date(b.startsAt) <= now,
    );
    let bookedDays = 0;
    for (const b of recentBookings) {
      const start = new Date(b.startsAt) < thirtyDaysAgo ? thirtyDaysAgo : new Date(b.startsAt);
      const end = new Date(b.endsAt) > now ? now : new Date(b.endsAt);
      bookedDays += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    }
    const totalPossibleDays = activeListings * 30;
    const occupancyRate = totalPossibleDays > 0 ? Math.round((bookedDays / totalPossibleDays) * 100) : 0;

    // Upcoming check-ins (next 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCheckins = bookings.filter(
      (b) =>
        confirmedStatuses.includes(b.status) &&
        new Date(b.startsAt) >= now &&
        new Date(b.startsAt) <= sevenDaysFromNow,
    ).length;

    return {
      totalListings,
      activeListings,
      totalBookings: confirmedBookings.length,
      totalRevenue,
      totalEarned: payoutAgg._sum.amount ?? 0,
      occupancyRate,
      upcomingCheckins,
    };
  }

  /**
   * Revenue over time for the host, grouped by day/week/month.
   */
  async getRevenue(userId: string, from: string, to: string, groupBy: 'day' | 'week' | 'month') {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return [];

    const listingIds = await this.prisma.listing.findMany({
      where: { hostId: host.id },
      select: { id: true },
    });
    const ids = listingIds.map((l) => l.id);
    if (ids.length === 0) return [];

    const interval = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';

    const rows: Array<{ period: Date; revenue: bigint; count: bigint }> = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('${interval}', b."createdAt") AS period,
              COALESCE(SUM((b."priceSnapshot"->>'total')::int), 0) AS revenue,
              COUNT(b.id) AS count
       FROM "Booking" b
       WHERE b."listingId" = ANY($1)
         AND b.status IN ('CONFIRMED_PAID','CONFIRMED_DEPOSIT','COMPLETED','BALANCE_DUE')
         AND b."createdAt" >= $2::timestamp
         AND b."createdAt" <= $3::timestamp
       GROUP BY period
       ORDER BY period`,
      ids,
      new Date(from),
      new Date(to),
    );

    return rows.map((r) => ({
      period: r.period.toISOString(),
      revenue: Number(r.revenue),
      bookings: Number(r.count),
    }));
  }

  /**
   * Per-listing performance: bookings, revenue, occupancy rate.
   */
  async getListingPerformance(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return [];

    const listings = await this.prisma.listing.findMany({
      where: { hostId: host.id },
      include: {
        rateRules: true,
        bookings: {
          where: { status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT', 'COMPLETED', 'BALANCE_DUE'] } },
          select: { id: true, priceSnapshot: true, startsAt: true, endsAt: true, status: true },
        },
        _count: { select: { bookings: true } },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return listings.map((l) => {
      const totalRevenue = l.bookings.reduce((sum, b) => {
        const snap = b.priceSnapshot as any;
        return sum + (snap?.total ?? 0);
      }, 0);

      const recentBookings = l.bookings.filter(
        (b) => new Date(b.endsAt) >= thirtyDaysAgo && new Date(b.startsAt) <= now,
      );
      let bookedDays = 0;
      for (const b of recentBookings) {
        const start = new Date(b.startsAt) < thirtyDaysAgo ? thirtyDaysAgo : new Date(b.startsAt);
        const end = new Date(b.endsAt) > now ? now : new Date(b.endsAt);
        bookedDays += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      }
      const occupancy = Math.round((bookedDays / 30) * 100);

      return {
        listingId: l.id,
        title: l.title,
        city: l.city,
        state: l.state,
        status: l.status,
        baseRate: l.rateRules[0]?.baseNightlyRate ?? 0,
        totalBookings: l.bookings.length,
        totalRevenue,
        occupancyRate: occupancy,
        bookedDays30: bookedDays,
      };
    });
  }

  /**
   * Revenue forecast from confirmed future bookings.
   */
  async getForecast(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return [];

    const now = new Date();
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        listing: { hostId: host.id },
        status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT', 'BALANCE_DUE'] },
        startsAt: { gte: now },
      },
      include: { listing: { select: { title: true } } },
      orderBy: { startsAt: 'asc' },
    });

    // Group into 30/60/90 day buckets
    const buckets = [
      { label: 'Next 30 days', days: 30, revenue: 0, bookings: 0 },
      { label: '30-60 days', days: 60, revenue: 0, bookings: 0 },
      { label: '60-90 days', days: 90, revenue: 0, bookings: 0 },
    ];

    for (const b of futureBookings) {
      const daysAway = Math.ceil((new Date(b.startsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const snap = b.priceSnapshot as any;
      const total = snap?.total ?? 0;
      // Platform fee is 10%, host gets 90%
      const hostShare = Math.round(total * 0.9);

      if (daysAway <= 30) {
        buckets[0].revenue += hostShare;
        buckets[0].bookings += 1;
      } else if (daysAway <= 60) {
        buckets[1].revenue += hostShare;
        buckets[1].bookings += 1;
      } else if (daysAway <= 90) {
        buckets[2].revenue += hostShare;
        buckets[2].bookings += 1;
      }
    }

    return buckets;
  }

  /**
   * Calendar view of bookings for a host's listings in a given month.
   */
  async getCalendarBookings(userId: string, month: string, listingId?: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return [];

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    const where: any = {
      listing: { hostId: host.id },
      startsAt: { lte: end },
      endsAt: { gte: start },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    };
    if (listingId) where.listingId = listingId;

    return this.prisma.booking.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true, city: true } },
        guest: { select: { fullName: true, email: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /**
   * Get recent bookings for host (paginated).
   */
  async getBookings(userId: string, page: number, limit: number, status?: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return { bookings: [], total: 0, page, limit };

    const where: any = { listing: { hostId: host.id } };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true, city: true, state: true } },
          guest: { select: { fullName: true, email: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit };
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async createNotification(
    hostId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {},
  ) {
    return this.prisma.hostNotification.create({
      data: { hostId, type, title, message, metadata: metadata as any },
    });
  }

  async getNotifications(userId: string, unreadOnly: boolean) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return [];

    return this.prisma.hostNotification.findMany({
      where: { hostId: host.id, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return null;

    return this.prisma.hostNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) return { count: 0 };

    const result = await this.prisma.hostNotification.updateMany({
      where: { hostId: host.id, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
