import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Setting defaults (used by getSettings) ──
  private readonly SETTING_DEFAULTS: Record<string, unknown> = {
    platformFeePercent: 10,
    cancellationThresholdFull: 48,
    cancellationThresholdPartial: 10,
    holdExpiryMinutes: 15,
    maxGuestsGlobal: 20,
    minBookingLeadHours: 0,
  };

  /** Aggregated platform metrics for the admin dashboard */
  async getStats() {
    const [
      totalUsers,
      totalGuests,
      totalHosts,
      totalAdmins,
      pendingHosts,
      totalListings,
      approvedListings,
      pendingListings,
      rejectedListings,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      pendingPaymentBookings,
      revenueAgg,
      eligiblePayoutAgg,
      paidPayoutAgg,
      recentBookings,
      recentAudit,
    ] = await Promise.all([
      // ── Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.GUEST } }),
      this.prisma.user.count({ where: { role: UserRole.HOST } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.host.count({ where: { verificationStatus: 'PENDING' } }),

      // ── Listings
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'APPROVED' } }),
      this.prisma.listing.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.listing.count({ where: { status: 'REJECTED' } }),

      // ── Bookings
      this.prisma.booking.count(),
      this.prisma.booking.count({
        where: { status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'] } },
      }),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      this.prisma.booking.count({ where: { status: 'PAYMENT_PENDING' } }),

      // ── Revenue (sum of all payments with status CAPTURED)
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'CAPTURED' },
      }),

      // ── Payouts
      this.prisma.payoutLine.aggregate({
        _sum: { amount: true },
        where: { status: 'ELIGIBLE' },
      }),
      this.prisma.payoutLine.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),

      // ── Recent bookings (last 5)
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { title: true, city: true, state: true } },
          guest: { select: { fullName: true, email: true } },
        },
      }),

      // ── Recent audit log (last 10)
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        guests: totalGuests,
        hosts: totalHosts,
        admins: totalAdmins,
        pendingHosts,
      },
      listings: {
        total: totalListings,
        approved: approvedListings,
        pending: pendingListings,
        rejected: rejectedListings,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        pendingPayment: pendingPaymentBookings,
      },
      revenue: {
        totalCollected: revenueAgg._sum.amount ?? 0,
        // Platform fee is 10% of total collected (stored in priceSnapshot, not on Payment)
        platformFees: Math.round((revenueAgg._sum.amount ?? 0) * 0.1),
      },
      payouts: {
        eligibleAmount: eligiblePayoutAgg._sum.amount ?? 0,
        paidAmount: paidPayoutAgg._sum.amount ?? 0,
      },
      recentBookings,
      recentAudit,
    };
  }

  /** Paginated user list with optional role filter and search */
  async getUsers(page: number, limit: number, role?: UserRole, search?: string) {
    const where: Record<string, unknown> = {};
    if (role && Object.values(UserRole).includes(role)) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          hostProfile: {
            select: {
              id: true,
              verificationStatus: true,
              payoutEnabled: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  /** Deactivate a user account */
  async deactivateUser(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot deactivate another admin account');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.auditService.log(actorId, 'USER_DEACTIVATED', 'User', userId, {
      email: user.email,
    });

    return updated;
  }

  /** Reactivate a user account */
  async activateUser(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.auditService.log(actorId, 'USER_ACTIVATED', 'User', userId, {
      email: user.email,
    });

    return updated;
  }

  /** Paginated audit log with optional filters */
  async getAuditLog(
    page: number,
    limit: number,
    action?: string,
    resourceType?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page, limit };
  }

  // ── Feature 1: Revenue Analytics ──
  async getRevenueAnalytics(from: string, to: string, groupBy: 'day' | 'week' | 'month') {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const results: Array<{ period: Date; total_collected: bigint; booking_count: bigint }> =
      await this.prisma.$queryRaw`
        SELECT
          date_trunc(${groupBy}, "createdAt") AS period,
          COALESCE(SUM(amount), 0) AS total_collected,
          COUNT(DISTINCT "bookingId") AS booking_count
        FROM "Payment"
        WHERE status = 'CAPTURED'
          AND "createdAt" >= ${fromDate}
          AND "createdAt" <= ${toDate}
        GROUP BY period
        ORDER BY period
      `;

    return results.map((r) => {
      const totalCollected = Number(r.total_collected);
      const platformFees = Math.round(totalCollected * 0.1);
      return {
        period: r.period.toISOString().slice(0, 10),
        totalCollected,
        platformFees,
        hostShare: totalCollected - platformFees,
        bookingCount: Number(r.booking_count),
      };
    });
  }

  // ── Feature 2: Listing Detail ──
  async getListingDetail(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        rateRules: true,
        seasonalRates: { orderBy: { startsAt: 'asc' } },
        availabilityBlocks: { orderBy: { startsAt: 'asc' } },
        host: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            guest: { select: { fullName: true, email: true } },
            payments: { where: { status: 'CAPTURED' } },
          },
        },
      },
    });

    if (!listing) throw new BadRequestException('Listing not found');

    const totalRevenue = listing.bookings.reduce(
      (sum, b) => sum + b.payments.reduce((s, p) => s + p.amount, 0),
      0,
    );

    return {
      ...listing,
      totalRevenue,
      bookingCount: listing.bookings.length,
    };
  }

  // ── Feature 3: Refunds ──

  /** Pre-validate a booking before issuing a refund — returns max refundable amount */
  async validateRefundBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { title: true } },
        guest: { select: { fullName: true, email: true } },
        payments: { where: { status: 'CAPTURED' } },
        refunds: true,
      },
    });
    if (!booking) throw new BadRequestException('Booking not found');

    const totalPaid = booking.payments.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = booking.refunds.reduce((s, r) => s + r.amount, 0);
    const maxRefundable = totalPaid - totalRefunded;

    return {
      bookingId,
      status: booking.status,
      listingTitle: booking.listing?.title ?? '',
      guestName: booking.guest?.fullName ?? '',
      guestEmail: booking.guest?.email ?? '',
      totalPaid,
      totalRefunded,
      maxRefundable,
    };
  }

  async getRefunds(page: number, limit: number) {
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              listing: { select: { title: true } },
              guest: { select: { fullName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.refund.count(),
    ]);
    return { refunds, total, page, limit };
  }

  async createRefund(actorId: string, dto: { bookingId: string; amount: number; reason: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        payments: { where: { status: 'CAPTURED' } },
        refunds: true,
      },
    });

    if (!booking) throw new BadRequestException('Booking not found');

    const totalPaid = booking.payments.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = booking.refunds.reduce((s, r) => s + r.amount, 0);
    const maxRefundable = totalPaid - totalRefunded;

    if (dto.amount > maxRefundable) {
      throw new BadRequestException(
        `Refund amount exceeds maximum refundable (${maxRefundable} paise)`,
      );
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: {
          bookingId: dto.bookingId,
          amount: dto.amount,
          reason: dto.reason,
        },
      });

      // If fully refunded, update booking status
      if (dto.amount + totalRefunded >= totalPaid) {
        await tx.booking.update({
          where: { id: dto.bookingId },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.ledgerEvent.create({
        data: {
          bookingId: dto.bookingId,
          type: 'REFUND_ISSUED',
          amount: dto.amount,
          metadata: { reason: dto.reason, actorId, isAdminRefund: true },
        },
      });

      await this.auditService.log(
        actorId,
        'ADMIN_REFUND_ISSUED',
        'Refund',
        r.id,
        { bookingId: dto.bookingId, amount: dto.amount, reason: dto.reason },
        tx,
      );

      return r;
    });

    return refund;
  }

  // ── Feature 4: System Settings ──
  async getSettings() {
    const existing = await this.prisma.systemConfig.findMany();
    if (existing.length === 0) {
      // Seed defaults
      const entries = Object.entries(this.SETTING_DEFAULTS).map(([key, value]) => ({
        key,
        value: value as any,
      }));
      await this.prisma.systemConfig.createMany({ data: entries });
      return this.prisma.systemConfig.findMany();
    }
    return existing;
  }

  async updateSettings(actorId: string, updates: Array<{ key: string; value: unknown }>) {
    for (const { key, value } of updates) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: value as any, updatedBy: actorId },
        update: { value: value as any, updatedBy: actorId },
      });

      await this.auditService.log(actorId, 'SETTING_UPDATED', 'SystemConfig', key, {
        key,
        newValue: value,
      });
    }
    return this.prisma.systemConfig.findMany();
  }

  // ── Feature 6: Calendar Bookings ──
  async getCalendarBookings(month: string, listingId?: string) {
    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);

    const where: any = {
      startsAt: { lte: endOfMonth },
      endsAt: { gte: startOfMonth },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    };
    if (listingId) where.listingId = listingId;

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        listing: { select: { title: true } },
        guest: { select: { fullName: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      listingId: b.listingId,
      listingTitle: b.listing.title,
      guestName: b.guest.fullName,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
    }));
  }

  // ── Feature 7: Host Performance ──
  async getHostPerformance() {
    const hosts = await this.prisma.host.findMany({
      where: { verificationStatus: 'APPROVED' },
      include: {
        user: { select: { fullName: true, email: true } },
        listings: {
          include: {
            bookings: {
              include: {
                payments: { where: { status: 'CAPTURED' } },
              },
            },
          },
        },
      },
    });

    return hosts.map((h) => {
      const allBookings = h.listings.flatMap((l) => l.bookings);
      const completedBookings = allBookings.filter((b) => b.status === 'COMPLETED');
      const totalRevenue = allBookings.reduce(
        (sum, b) => sum + b.payments.reduce((s, p) => s + p.amount, 0),
        0,
      );

      return {
        hostId: h.id,
        hostName: h.user.fullName,
        hostEmail: h.user.email,
        totalListings: h.listings.length,
        approvedListings: h.listings.filter((l) => l.status === 'APPROVED').length,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        occupancyRate: allBookings.length > 0
          ? Math.round((completedBookings.length / allBookings.length) * 100)
          : 0,
        totalRevenue,
        avgBookingValue: allBookings.length > 0
          ? Math.round(totalRevenue / allBookings.length)
          : 0,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  // ── Feature 9: Bulk Actions ──
  async bulkApproveListings(actorId: string, ids: string[]) {
    let count = 0;
    for (const id of ids) {
      try {
        await this.prisma.listing.update({
          where: { id, status: 'PENDING_APPROVAL' },
          data: { status: 'APPROVED' },
        });
        await this.auditService.log(actorId, 'LISTING_APPROVED', 'Listing', id, { bulk: true });
        count++;
      } catch {
        // skip if not found or not in correct status
      }
    }
    return { count };
  }

  async bulkDeactivateUsers(actorId: string, ids: string[]) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids }, role: { not: 'ADMIN' }, isActive: true },
      data: { isActive: false },
    });
    for (const id of ids) {
      await this.auditService.log(actorId, 'USER_DEACTIVATED', 'User', id, { bulk: true });
    }
    return { count: result.count };
  }

  async bulkCompleteBookings(actorId: string, ids: string[]) {
    const result = await this.prisma.booking.updateMany({
      where: {
        id: { in: ids },
        status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'] },
      },
      data: { status: 'COMPLETED' },
    });
    for (const id of ids) {
      await this.auditService.log(actorId, 'BOOKING_COMPLETED', 'Booking', id, { bulk: true });
    }
    return { count: result.count };
  }

  // ── Feature 10: Global Search ──
  async globalSearch(q: string) {
    if (!q || q.length < 2) {
      return { users: [], bookings: [], listings: [], hosts: [] };
    }

    const [users, bookings, listings, hosts] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, fullName: true, email: true, role: true },
        take: 5,
      }),
      this.prisma.booking.findMany({
        where: { id: { startsWith: q } },
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          listing: { select: { title: true } },
        },
        take: 5,
      }),
      this.prisma.listing.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, city: true, status: true },
        take: 5,
      }),
      this.prisma.host.findMany({
        where: {
          user: {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        select: {
          id: true,
          userId: true,
          verificationStatus: true,
          user: { select: { fullName: true, email: true } },
        },
        take: 5,
      }),
    ]);

    return {
      users,
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        listingTitle: b.listing.title,
      })),
      listings,
      hosts: hosts.map((h) => ({
        id: h.id,
        userId: h.userId,
        fullName: h.user.fullName,
        email: h.user.email,
        verificationStatus: h.verificationStatus,
      })),
    };
  }

  // ── Feature 11: Admin Activity ──
  async getAdminActivity(page: number, limit: number, adminId?: string) {
    const adminUsers = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    const where: any = {
      actorUserId: adminId ? adminId : { in: adminIds },
    };

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page, limit };
  }

  // ── Feature 13: Revenue Forecast ──
  async getRevenueForecast() {
    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 86400000);
    const day60 = new Date(now.getTime() + 60 * 86400000);
    const day90 = new Date(now.getTime() + 90 * 86400000);

    const futureBookings = await this.prisma.booking.findMany({
      where: {
        startsAt: { gt: now },
        status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT', 'BALANCE_DUE'] },
      },
      select: {
        startsAt: true,
        status: true,
        priceSnapshot: true,
      },
    });

    const buckets = [
      { period: 'Next 30 days', cutoff: day30 },
      { period: '31-60 days', cutoff: day60 },
      { period: '61-90 days', cutoff: day90 },
    ];

    let prevCutoff = now;
    return buckets.map((bucket) => {
      const inRange = futureBookings.filter(
        (b) => b.startsAt > prevCutoff && b.startsAt <= bucket.cutoff,
      );
      prevCutoff = bucket.cutoff;

      let confirmedRevenue = 0;
      let expectedDeposits = 0;
      let expectedBalance = 0;

      for (const b of inRange) {
        const snap = b.priceSnapshot as any;
        const total = snap?.total ?? 0;
        const deposit = snap?.depositAmount ?? 0;
        const balance = snap?.balanceAmount ?? 0;

        if (b.status === 'CONFIRMED_PAID') {
          confirmedRevenue += total;
        } else if (b.status === 'CONFIRMED_DEPOSIT') {
          expectedDeposits += deposit;
          expectedBalance += balance;
        } else if (b.status === 'BALANCE_DUE') {
          expectedBalance += balance;
        }
      }

      return {
        period: bucket.period,
        confirmedRevenue,
        expectedDeposits,
        expectedBalance,
        bookingCount: inRange.length,
      };
    });
  }
}
