"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HostAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HostAnalyticsService = HostAnalyticsService_1 = class HostAnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(HostAnalyticsService_1.name);
    }
    async getStats(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return null;
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
            const snap = b.priceSnapshot;
            return sum + (snap?.total ?? 0);
        }, 0);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentBookings = confirmedBookings.filter((b) => new Date(b.endsAt) >= thirtyDaysAgo && new Date(b.startsAt) <= now);
        let bookedDays = 0;
        for (const b of recentBookings) {
            const start = new Date(b.startsAt) < thirtyDaysAgo ? thirtyDaysAgo : new Date(b.startsAt);
            const end = new Date(b.endsAt) > now ? now : new Date(b.endsAt);
            bookedDays += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
        }
        const totalPossibleDays = activeListings * 30;
        const occupancyRate = totalPossibleDays > 0 ? Math.round((bookedDays / totalPossibleDays) * 100) : 0;
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingCheckins = bookings.filter((b) => confirmedStatuses.includes(b.status) &&
            new Date(b.startsAt) >= now &&
            new Date(b.startsAt) <= sevenDaysFromNow).length;
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
    async getRevenue(userId, from, to, groupBy) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return [];
        const listingIds = await this.prisma.listing.findMany({
            where: { hostId: host.id },
            select: { id: true },
        });
        const ids = listingIds.map((l) => l.id);
        if (ids.length === 0)
            return [];
        const interval = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
        const rows = await this.prisma.$queryRawUnsafe(`SELECT date_trunc('${interval}', b."createdAt") AS period,
              COALESCE(SUM((b."priceSnapshot"->>'total')::int), 0) AS revenue,
              COUNT(b.id) AS count
       FROM "Booking" b
       WHERE b."listingId" = ANY($1)
         AND b.status IN ('CONFIRMED_PAID','CONFIRMED_DEPOSIT','COMPLETED','BALANCE_DUE')
         AND b."createdAt" >= $2::timestamp
         AND b."createdAt" <= $3::timestamp
       GROUP BY period
       ORDER BY period`, ids, new Date(from), new Date(to));
        return rows.map((r) => ({
            period: r.period.toISOString(),
            revenue: Number(r.revenue),
            bookings: Number(r.count),
        }));
    }
    async getListingPerformance(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return [];
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
                const snap = b.priceSnapshot;
                return sum + (snap?.total ?? 0);
            }, 0);
            const recentBookings = l.bookings.filter((b) => new Date(b.endsAt) >= thirtyDaysAgo && new Date(b.startsAt) <= now);
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
    async getForecast(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return [];
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
        const buckets = [
            { label: 'Next 30 days', days: 30, revenue: 0, bookings: 0 },
            { label: '30-60 days', days: 60, revenue: 0, bookings: 0 },
            { label: '60-90 days', days: 90, revenue: 0, bookings: 0 },
        ];
        for (const b of futureBookings) {
            const daysAway = Math.ceil((new Date(b.startsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            const snap = b.priceSnapshot;
            const total = snap?.total ?? 0;
            const hostShare = Math.round(total * 0.9);
            if (daysAway <= 30) {
                buckets[0].revenue += hostShare;
                buckets[0].bookings += 1;
            }
            else if (daysAway <= 60) {
                buckets[1].revenue += hostShare;
                buckets[1].bookings += 1;
            }
            else if (daysAway <= 90) {
                buckets[2].revenue += hostShare;
                buckets[2].bookings += 1;
            }
        }
        return buckets;
    }
    async getCalendarBookings(userId, month, listingId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return [];
        const [year, mon] = month.split('-').map(Number);
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 0, 23, 59, 59);
        const where = {
            listing: { hostId: host.id },
            startsAt: { lte: end },
            endsAt: { gte: start },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
        };
        if (listingId)
            where.listingId = listingId;
        return this.prisma.booking.findMany({
            where,
            include: {
                listing: { select: { id: true, title: true, city: true } },
                guest: { select: { fullName: true, email: true } },
            },
            orderBy: { startsAt: 'asc' },
        });
    }
    async getBookings(userId, page, limit, status) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return { bookings: [], total: 0, page, limit };
        const where = { listing: { hostId: host.id } };
        if (status)
            where.status = status;
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
    async createNotification(hostId, type, title, message, metadata = {}) {
        return this.prisma.hostNotification.create({
            data: { hostId, type, title, message, metadata: metadata },
        });
    }
    async getNotifications(userId, unreadOnly) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return [];
        return this.prisma.hostNotification.findMany({
            where: { hostId: host.id, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markNotificationRead(userId, id) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return null;
        return this.prisma.hostNotification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    async markAllNotificationsRead(userId) {
        const host = await this.prisma.host.findUnique({ where: { userId } });
        if (!host)
            return { count: 0 };
        const result = await this.prisma.hostNotification.updateMany({
            where: { hostId: host.id, isRead: false },
            data: { isRead: true },
        });
        return { count: result.count };
    }
};
exports.HostAnalyticsService = HostAnalyticsService;
exports.HostAnalyticsService = HostAnalyticsService = HostAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HostAnalyticsService);
//# sourceMappingURL=host-analytics.service.js.map