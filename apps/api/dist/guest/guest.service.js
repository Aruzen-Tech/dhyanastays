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
exports.GuestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GuestService = class GuestService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        bookings: true,
                        reviews: true,
                        wishlists: true,
                    },
                },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateProfile(userId, dto) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.fullName !== undefined && { fullName: dto.fullName }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                role: true,
            },
        });
    }
    async getPreferences(userId) {
        const pref = await this.prisma.guestPreference.findUnique({
            where: { userId },
        });
        return pref ?? null;
    }
    async upsertPreferences(userId, dto) {
        return this.prisma.guestPreference.upsert({
            where: { userId },
            create: { userId, ...dto },
            update: { ...dto },
        });
    }
    async getWishlist(userId) {
        return this.prisma.wishlist.findMany({
            where: { userId },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        city: true,
                        state: true,
                        status: true,
                        media: { take: 1, orderBy: { sortOrder: 'asc' } },
                        rateRules: { take: 1, select: { baseNightlyRate: true, maxGuests: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addToWishlist(userId, listingId) {
        const listing = await this.prisma.listing.findFirst({
            where: { id: listingId, status: 'APPROVED' },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        return this.prisma.wishlist.upsert({
            where: { userId_listingId: { userId, listingId } },
            create: { userId, listingId },
            update: {},
        });
    }
    async removeFromWishlist(userId, listingId) {
        const item = await this.prisma.wishlist.findUnique({
            where: { userId_listingId: { userId, listingId } },
        });
        if (!item)
            throw new common_1.NotFoundException('Not in wishlist');
        await this.prisma.wishlist.delete({
            where: { userId_listingId: { userId, listingId } },
        });
        return { success: true };
    }
    async isWishlisted(userId, listingId) {
        const item = await this.prisma.wishlist.findUnique({
            where: { userId_listingId: { userId, listingId } },
        });
        return { wishlisted: !!item };
    }
    async createReview(userId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (booking.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Can only review completed stays');
        }
        const existingReview = await this.prisma.review.findUnique({
            where: { bookingId: dto.bookingId },
        });
        if (existingReview) {
            throw new common_1.BadRequestException('Review already submitted for this booking');
        }
        return this.prisma.review.create({
            data: {
                bookingId: dto.bookingId,
                userId,
                listingId: booking.listingId,
                rating: dto.rating,
                comment: dto.comment,
            },
        });
    }
    async getMyReviews(userId) {
        return this.prisma.review.findMany({
            where: { userId },
            include: {
                listing: { select: { id: true, title: true, city: true, state: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getListingReviews(listingId) {
        const reviews = await this.prisma.review.findMany({
            where: { listingId },
            include: {
                user: { select: { fullName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return { reviews, avgRating: Math.round(avgRating * 10) / 10, count: reviews.length };
    }
    async getNotifications(userId, unreadOnly = false) {
        return this.prisma.guestNotification.findMany({
            where: {
                userId,
                ...(unreadOnly && { isRead: false }),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markNotificationRead(userId, notificationId) {
        const notification = await this.prisma.guestNotification.findUnique({
            where: { id: notificationId },
        });
        if (!notification || notification.userId !== userId) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.guestNotification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
    async markAllNotificationsRead(userId) {
        await this.prisma.guestNotification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { success: true };
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.guestNotification.count({
            where: { userId, isRead: false },
        });
        return { count };
    }
    async getLoyaltyTier(userId) {
        const completedStays = await this.prisma.booking.count({
            where: { guestId: userId, status: 'COMPLETED' },
        });
        let tier;
        let nextTier;
        let staysToNext;
        let platformFeeDiscount;
        if (completedStays >= 6) {
            tier = 'SAGE';
            nextTier = null;
            staysToNext = 0;
            platformFeeDiscount = 0.15;
        }
        else if (completedStays >= 3) {
            tier = 'PRACTITIONER';
            nextTier = 'SAGE';
            staysToNext = 6 - completedStays;
            platformFeeDiscount = 0.10;
        }
        else {
            tier = 'SEEKER';
            nextTier = 'PRACTITIONER';
            staysToNext = 3 - completedStays;
            platformFeeDiscount = 0;
        }
        const tierMeta = {
            SEEKER: {
                label: 'Seeker',
                icon: '🌱',
                description: 'Begin your wellness journey',
                color: '#6b7280',
            },
            PRACTITIONER: {
                label: 'Practitioner',
                icon: '🧘',
                description: 'Deepening your practice',
                color: '#059669',
            },
            SAGE: {
                label: 'Sage',
                icon: '✨',
                description: 'Wisdom through experience',
                color: '#7c3aed',
            },
        };
        return {
            tier,
            ...tierMeta[tier],
            completedStays,
            nextTier,
            staysToNext,
            platformFeeDiscount,
            benefits: this.getTierBenefits(tier),
        };
    }
    getTierBenefits(tier) {
        const base = ['Access to all retreat listings', 'Preparation guides', 'Guest messaging'];
        if (tier === 'SEEKER')
            return base;
        if (tier === 'PRACTITIONER')
            return [...base, '10% off platform fee', 'Priority support', 'Early access to new listings'];
        return [
            ...base,
            '15% off platform fee',
            'Dedicated support',
            'Early access to new listings',
            'Exclusive Sage-only retreats',
            'Invite to annual Dhyana retreat',
        ];
    }
    async getDashboardStats(userId) {
        const now = new Date();
        const [totalBookings, upcomingStays, completedStays, totalSpent] = await Promise.all([
            this.prisma.booking.count({ where: { guestId: userId } }),
            this.prisma.booking.count({
                where: {
                    guestId: userId,
                    startsAt: { gte: now },
                    status: { in: ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'] },
                },
            }),
            this.prisma.booking.count({
                where: { guestId: userId, status: 'COMPLETED' },
            }),
            this.prisma.payment.aggregate({
                where: {
                    booking: { guestId: userId },
                    status: 'CAPTURED',
                },
                _sum: { amount: true },
            }),
        ]);
        return {
            totalBookings,
            upcomingStays,
            completedStays,
            totalSpent: totalSpent._sum.amount ?? 0,
        };
    }
};
exports.GuestService = GuestService;
exports.GuestService = GuestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuestService);
//# sourceMappingURL=guest.service.js.map