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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/services/audit.service");
const state_machine_1 = require("../booking/state-machine");
let AdminService = class AdminService {
    constructor(prisma, auditService, stateMachine) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.stateMachine = stateMachine;
        this.SETTING_DEFAULTS = {
            platformFeePercent: 10,
            cancellationThresholdFull: 48,
            cancellationThresholdPartial: 10,
            holdExpiryMinutes: 15,
            maxGuestsGlobal: 20,
            minBookingLeadHours: 0,
        };
    }
    async getStats() {
        const [totalUsers, totalGuests, totalHosts, totalAdmins, pendingHosts, totalListings, approvedListings, pendingListings, rejectedListings, totalBookings, confirmedBookings, completedBookings, cancelledBookings, pendingPaymentBookings, revenueAgg, eligiblePayoutAgg, paidPayoutAgg, recentBookings, recentAudit,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: client_1.UserRole.GUEST } }),
            this.prisma.user.count({ where: { role: client_1.UserRole.HOST } }),
            this.prisma.user.count({ where: { role: client_1.UserRole.ADMIN } }),
            this.prisma.host.count({ where: { verificationStatus: 'PENDING' } }),
            this.prisma.listing.count(),
            this.prisma.listing.count({ where: { status: 'APPROVED' } }),
            this.prisma.listing.count({ where: { status: 'PENDING_APPROVAL' } }),
            this.prisma.listing.count({ where: { status: 'REJECTED' } }),
            this.prisma.booking.count(),
            this.prisma.booking.count({
                where: { status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'] } },
            }),
            this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
            this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
            this.prisma.booking.count({ where: { status: 'PAYMENT_PENDING' } }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: 'CAPTURED' },
            }),
            this.prisma.payoutLine.aggregate({
                _sum: { amount: true },
                where: { status: 'ELIGIBLE' },
            }),
            this.prisma.payoutLine.aggregate({
                _sum: { amount: true },
                where: { status: 'PAID' },
            }),
            this.prisma.booking.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    listing: { select: { title: true, city: true, state: true } },
                    guest: { select: { fullName: true, email: true } },
                },
            }),
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
    async getUsers(page, limit, role, search) {
        const where = {};
        if (role && Object.values(client_1.UserRole).includes(role)) {
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
    async deactivateUser(userId, actorId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.role === client_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Cannot deactivate another admin account');
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
    async activateUser(userId, actorId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
        });
        await this.auditService.log(actorId, 'USER_ACTIVATED', 'User', userId, {
            email: user.email,
        });
        return updated;
    }
    async getAuditLog(page, limit, action, resourceType) {
        const where = {};
        if (action)
            where.action = action;
        if (resourceType)
            where.resourceType = resourceType;
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
    async getRevenueAnalytics(from, to, groupBy) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        const results = await this.prisma.$queryRaw `
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
    async getListingDetail(id) {
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
        if (!listing)
            throw new common_1.BadRequestException('Listing not found');
        const totalRevenue = listing.bookings.reduce((sum, b) => sum + b.payments.reduce((s, p) => s + p.amount, 0), 0);
        return {
            ...listing,
            totalRevenue,
            bookingCount: listing.bookings.length,
        };
    }
    async validateRefundBooking(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                listing: { select: { title: true } },
                guest: { select: { fullName: true, email: true } },
                payments: { where: { status: 'CAPTURED' } },
                refunds: true,
            },
        });
        if (!booking)
            throw new common_1.BadRequestException('Booking not found');
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
    async getRefunds(page, limit) {
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
    async createRefund(actorId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: {
                payments: { where: { status: 'CAPTURED' } },
                refunds: true,
            },
        });
        if (!booking)
            throw new common_1.BadRequestException('Booking not found');
        const totalPaid = booking.payments.reduce((s, p) => s + p.amount, 0);
        const totalRefunded = booking.refunds.reduce((s, r) => s + r.amount, 0);
        const maxRefundable = totalPaid - totalRefunded;
        if (dto.amount > maxRefundable) {
            throw new common_1.BadRequestException(`Refund amount exceeds maximum refundable (${maxRefundable} paise)`);
        }
        const refund = await this.prisma.$transaction(async (tx) => {
            const r = await tx.refund.create({
                data: {
                    bookingId: dto.bookingId,
                    amount: dto.amount,
                    reason: dto.reason,
                },
            });
            if (dto.amount + totalRefunded >= totalPaid) {
                const fresh = await tx.booking.findUnique({ where: { id: dto.bookingId } });
                if (fresh) {
                    await this.stateMachine.transition(tx, fresh, 'ADMIN_FULL_REFUND_ISSUED', {
                        actorId,
                        metadata: {
                            refundId: r.id,
                            totalRefundedPaise: dto.amount + totalRefunded,
                            totalPaidPaise: totalPaid,
                        },
                    });
                }
            }
            await tx.ledgerEvent.create({
                data: {
                    bookingId: dto.bookingId,
                    type: 'REFUND_ISSUED',
                    amount: dto.amount,
                    metadata: { reason: dto.reason, actorId, isAdminRefund: true },
                },
            });
            await this.auditService.log(actorId, 'ADMIN_REFUND_ISSUED', 'Refund', r.id, { bookingId: dto.bookingId, amount: dto.amount, reason: dto.reason }, tx);
            return r;
        });
        return refund;
    }
    async getSettings() {
        const existing = await this.prisma.systemConfig.findMany();
        if (existing.length === 0) {
            const entries = Object.entries(this.SETTING_DEFAULTS).map(([key, value]) => ({
                key,
                value: value,
            }));
            await this.prisma.systemConfig.createMany({ data: entries });
            return this.prisma.systemConfig.findMany();
        }
        return existing;
    }
    async updateSettings(actorId, updates) {
        for (const { key, value } of updates) {
            await this.prisma.systemConfig.upsert({
                where: { key },
                create: { key, value: value, updatedBy: actorId },
                update: { value: value, updatedBy: actorId },
            });
            await this.auditService.log(actorId, 'SETTING_UPDATED', 'SystemConfig', key, {
                key,
                newValue: value,
            });
        }
        return this.prisma.systemConfig.findMany();
    }
    async getCalendarBookings(month, listingId) {
        const [year, mon] = month.split('-').map(Number);
        const startOfMonth = new Date(year, mon - 1, 1);
        const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);
        const where = {
            startsAt: { lte: endOfMonth },
            endsAt: { gte: startOfMonth },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
        };
        if (listingId)
            where.listingId = listingId;
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
            const totalRevenue = allBookings.reduce((sum, b) => sum + b.payments.reduce((s, p) => s + p.amount, 0), 0);
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
    async bulkApproveListings(actorId, ids) {
        let count = 0;
        for (const id of ids) {
            try {
                await this.prisma.listing.update({
                    where: { id, status: 'PENDING_APPROVAL' },
                    data: { status: 'APPROVED' },
                });
                await this.auditService.log(actorId, 'LISTING_APPROVED', 'Listing', id, { bulk: true });
                count++;
            }
            catch {
            }
        }
        return { count };
    }
    async bulkDeactivateUsers(actorId, ids) {
        const result = await this.prisma.user.updateMany({
            where: { id: { in: ids }, role: { not: 'ADMIN' }, isActive: true },
            data: { isActive: false },
        });
        for (const id of ids) {
            await this.auditService.log(actorId, 'USER_DEACTIVATED', 'User', id, { bulk: true });
        }
        return { count: result.count };
    }
    async bulkCompleteBookings(actorId, ids) {
        let count = 0;
        for (const id of ids) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    const fresh = await tx.booking.findUnique({ where: { id } });
                    if (!fresh)
                        return;
                    if (!['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(fresh.status))
                        return;
                    await this.stateMachine.transition(tx, fresh, 'STAY_COMPLETED', { actorId, metadata: { bulk: true } });
                    count++;
                });
                await this.auditService.log(actorId, 'BOOKING_COMPLETED', 'Booking', id, { bulk: true });
            }
            catch (err) {
                console.warn(`Bulk complete skipped ${id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return { count };
    }
    async globalSearch(q) {
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
    async getAdminActivity(page, limit, adminId) {
        const adminUsers = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true },
        });
        const adminIds = adminUsers.map((u) => u.id);
        const where = {
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
    async submitApplication(dto, applicantId) {
        const existing = await this.prisma.staffApplication.findFirst({
            where: { email: dto.email, status: client_1.ApplicationStatus.PENDING },
        });
        if (existing) {
            throw new common_1.ConflictException('A pending application already exists for this email address');
        }
        return this.prisma.staffApplication.create({
            data: {
                applicantId: applicantId ?? null,
                email: dto.email,
                fullName: dto.fullName,
                requestedLevel: dto.requestedLevel,
                requestedService: dto.requestedService ?? null,
                clusterId: dto.clusterId ?? null,
                propertyId: dto.propertyId ?? null,
                justification: dto.justification,
            },
        });
    }
    async getApplications(page, limit, status) {
        const where = {};
        if (status)
            where.status = status;
        const [applications, total] = await Promise.all([
            this.prisma.staffApplication.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.staffApplication.count({ where }),
        ]);
        return { applications, total, page, limit };
    }
    async reviewApplication(id, actorId, dto) {
        const app = await this.prisma.staffApplication.findUnique({ where: { id } });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        if (app.status !== client_1.ApplicationStatus.PENDING) {
            throw new common_1.BadRequestException('Application is no longer pending');
        }
        if (dto.decision === 'APPROVED') {
            return this.prisma.$transaction(async (tx) => {
                const updated = await tx.staffApplication.update({
                    where: { id },
                    data: {
                        status: client_1.ApplicationStatus.APPROVED,
                        reviewedBy: actorId,
                        reviewNotes: dto.reviewNotes ?? null,
                        reviewedAt: new Date(),
                    },
                });
                if (app.applicantId) {
                    await tx.user.update({
                        where: { id: app.applicantId },
                        data: { role: client_1.UserRole.ADMIN, kind: client_1.UserKind.STAFF },
                    });
                    await tx.staffRole.upsert({
                        where: { userId: app.applicantId },
                        create: {
                            userId: app.applicantId,
                            level: app.requestedLevel,
                            serviceType: app.requestedService ?? undefined,
                            clusterId: app.clusterId ?? undefined,
                            propertyId: app.propertyId ?? undefined,
                            createdBy: actorId,
                        },
                        update: {
                            level: app.requestedLevel,
                            serviceType: app.requestedService ?? undefined,
                            clusterId: app.clusterId ?? undefined,
                            propertyId: app.propertyId ?? undefined,
                            createdBy: actorId,
                            revokedAt: null,
                        },
                    });
                }
                await this.auditService.log(actorId, 'STAFF_APPLICATION_APPROVED', 'StaffApplication', id, { applicantId: app.applicantId, level: app.requestedLevel, email: app.email }, tx);
                return updated;
            });
        }
        const updated = await this.prisma.staffApplication.update({
            where: { id },
            data: {
                status: client_1.ApplicationStatus.REJECTED,
                reviewedBy: actorId,
                reviewNotes: dto.reviewNotes ?? null,
                reviewedAt: new Date(),
            },
        });
        await this.auditService.log(actorId, 'STAFF_APPLICATION_REJECTED', 'StaffApplication', id, { email: app.email, level: app.requestedLevel, notes: dto.reviewNotes });
        return updated;
    }
    async getStaff(page, limit, search) {
        const where = { role: client_1.UserRole.ADMIN };
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [staff, total] = await Promise.all([
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
                    kind: true,
                    isActive: true,
                    createdAt: true,
                    staffRole: {
                        select: {
                            level: true,
                            serviceType: true,
                            clusterId: true,
                            propertyId: true,
                            createdAt: true,
                            revokedAt: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { staff, total, page, limit };
    }
    async assignStaffRole(userId, actorId, dto) {
        if (userId === actorId) {
            throw new common_1.BadRequestException('Cannot modify your own role');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { role: client_1.UserRole.ADMIN, kind: client_1.UserKind.STAFF },
            });
            const staffRole = await tx.staffRole.upsert({
                where: { userId },
                create: {
                    userId,
                    level: dto.level,
                    serviceType: dto.serviceType ?? undefined,
                    clusterId: dto.clusterId ?? undefined,
                    propertyId: dto.propertyId ?? undefined,
                    createdBy: actorId,
                },
                update: {
                    level: dto.level,
                    serviceType: dto.serviceType ?? undefined,
                    clusterId: dto.clusterId ?? undefined,
                    propertyId: dto.propertyId ?? undefined,
                    createdBy: actorId,
                    revokedAt: null,
                },
            });
            await this.auditService.log(actorId, 'STAFF_ROLE_ASSIGNED', 'User', userId, { level: dto.level, email: user.email }, tx);
            return staffRole;
        });
    }
    async revokeStaffRole(userId, actorId) {
        if (userId === actorId) {
            throw new common_1.BadRequestException('Cannot revoke your own role');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { staffRole: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.role !== client_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('User does not have a staff role');
        }
        if (user.staffRole?.level === client_1.AdminLevel.L1) {
            throw new common_1.BadRequestException('Cannot revoke another L1 Super Admin. Contact your infrastructure team.');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { role: client_1.UserRole.GUEST, kind: client_1.UserKind.GUEST },
            });
            if (user.staffRole) {
                await tx.staffRole.update({
                    where: { userId },
                    data: { revokedAt: new Date() },
                });
            }
            await this.auditService.log(actorId, 'STAFF_ROLE_REVOKED', 'User', userId, { email: user.email, previousLevel: user.staffRole?.level }, tx);
            return { revoked: true };
        });
    }
    async changeUserKind(userId, actorId, dto) {
        if (userId === actorId) {
            throw new common_1.BadRequestException('Cannot change your own role');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                staffRole: true,
                ownerProfile: true,
                investorProfile: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.staffRole?.level === client_1.AdminLevel.L1 && dto.kind !== client_1.UserKind.STAFF) {
            throw new common_1.BadRequestException('Cannot demote another L1 Super Admin. Contact your infrastructure team.');
        }
        if (dto.kind === client_1.UserKind.STAFF && !dto.level) {
            throw new common_1.BadRequestException('level is required when kind = STAFF');
        }
        const before = {
            role: user.role,
            kind: user.kind,
            staffLevel: user.staffRole?.level ?? null,
            hasOwnerProfile: !!user.ownerProfile,
            hasInvestorProfile: !!user.investorProfile,
        };
        const legacyRole = dto.kind === client_1.UserKind.STAFF
            ? client_1.UserRole.ADMIN
            : dto.kind === client_1.UserKind.OWNER
                ? client_1.UserRole.HOST
                : client_1.UserRole.GUEST;
        return this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { kind: dto.kind, role: legacyRole },
            });
            if (dto.kind === client_1.UserKind.STAFF) {
                await tx.staffRole.upsert({
                    where: { userId },
                    create: {
                        userId,
                        level: dto.level,
                        serviceType: dto.serviceType ?? null,
                        clusterId: dto.clusterId ?? null,
                        propertyId: dto.propertyId ?? null,
                        createdBy: actorId,
                    },
                    update: {
                        level: dto.level,
                        serviceType: dto.serviceType ?? null,
                        clusterId: dto.clusterId ?? null,
                        propertyId: dto.propertyId ?? null,
                        createdBy: actorId,
                        revokedAt: null,
                    },
                });
            }
            else if (user.staffRole && !user.staffRole.revokedAt) {
                await tx.staffRole.update({
                    where: { userId },
                    data: { revokedAt: new Date() },
                });
            }
            if (dto.kind === client_1.UserKind.OWNER && !user.ownerProfile) {
                await tx.ownerProfile.create({
                    data: { userId, legalName: user.fullName },
                });
            }
            if (dto.kind === client_1.UserKind.INVESTOR && !user.investorProfile) {
                await tx.investorProfile.create({
                    data: { userId, legalName: user.fullName },
                });
            }
            const after = {
                role: legacyRole,
                kind: dto.kind,
                staffLevel: dto.kind === client_1.UserKind.STAFF ? (dto.level ?? null) : null,
                hasOwnerProfile: dto.kind === client_1.UserKind.OWNER || before.hasOwnerProfile,
                hasInvestorProfile: dto.kind === client_1.UserKind.INVESTOR || before.hasInvestorProfile,
            };
            await tx.roleChangeAudit.create({
                data: {
                    targetUserId: userId,
                    actorUserId: actorId,
                    before,
                    after,
                    reason: dto.reason,
                },
            });
            await this.auditService.log(actorId, 'USER_KIND_CHANGED', 'User', userId, { email: user.email, before, after, reason: dto.reason }, tx);
            return {
                userId,
                kind: dto.kind,
                role: legacyRole,
                staffLevel: after.staffLevel,
            };
        });
    }
    async getUserRoleHistory(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                kind: true,
                createdAt: true,
                staffRole: { select: { level: true, revokedAt: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const history = await this.prisma.roleChangeAudit.findMany({
            where: { targetUserId: userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const actorIds = Array.from(new Set(history.map((h) => h.actorUserId)));
        const actors = actorIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: actorIds } },
                select: { id: true, email: true, fullName: true },
            })
            : [];
        const actorMap = new Map(actors.map((a) => [a.id, a]));
        return {
            user,
            history: history.map((h) => ({
                id: h.id,
                actor: actorMap.get(h.actorUserId) ?? {
                    id: h.actorUserId,
                    email: null,
                    fullName: null,
                },
                before: h.before,
                after: h.after,
                reason: h.reason,
                createdAt: h.createdAt,
            })),
        };
    }
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
            const inRange = futureBookings.filter((b) => b.startsAt > prevCutoff && b.startsAt <= bucket.cutoff);
            prevCutoff = bucket.cutoff;
            let confirmedRevenue = 0;
            let expectedDeposits = 0;
            let expectedBalance = 0;
            for (const b of inRange) {
                const snap = b.priceSnapshot;
                const total = snap?.total ?? 0;
                const deposit = snap?.depositAmount ?? 0;
                const balance = snap?.balanceAmount ?? 0;
                if (b.status === 'CONFIRMED_PAID') {
                    confirmedRevenue += total;
                }
                else if (b.status === 'CONFIRMED_DEPOSIT') {
                    expectedDeposits += deposit;
                    expectedBalance += balance;
                }
                else if (b.status === 'BALANCE_DUE') {
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        state_machine_1.BookingStateMachine])
], AdminService);
//# sourceMappingURL=admin.service.js.map