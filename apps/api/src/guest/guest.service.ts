import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
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
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

  // ─── Preferences ─────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const pref = await this.prisma.guestPreference.findUnique({
      where: { userId },
    });
    return pref ?? null;
  }

  async upsertPreferences(userId: string, dto: UpsertPreferencesDto) {
    return this.prisma.guestPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  async getWishlist(userId: string) {
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

  async addToWishlist(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: 'APPROVED' },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    return this.prisma.wishlist.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });
  }

  async removeFromWishlist(userId: string, listingId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (!item) throw new NotFoundException('Not in wishlist');

    await this.prisma.wishlist.delete({
      where: { userId_listingId: { userId, listingId } },
    });
    return { success: true };
  }

  async isWishlisted(userId: string, listingId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    return { wishlisted: !!item };
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  async createReview(userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId) throw new ForbiddenException('Not your booking');
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed stays');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existingReview) {
      throw new BadRequestException('Review already submitted for this booking');
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

  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getListingReviews(listingId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { listingId },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return { reviews, avgRating: Math.round(avgRating * 10) / 10, count: reviews.length };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async getNotifications(userId: string, unreadOnly = false) {
    return this.prisma.guestNotification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.guestNotification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.guestNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.guestNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.guestNotification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  // ─── Loyalty Tiers ───────────────────────────────────────────────────────

  async getLoyaltyTier(userId: string) {
    const completedStays = await this.prisma.booking.count({
      where: { guestId: userId, status: 'COMPLETED' },
    });

    // Tier thresholds
    let tier: 'SEEKER' | 'PRACTITIONER' | 'SAGE';
    let nextTier: string | null;
    let staysToNext: number;
    let platformFeeDiscount: number; // fractional discount e.g. 0.05 = 5% off platform fee

    if (completedStays >= 6) {
      tier = 'SAGE';
      nextTier = null;
      staysToNext = 0;
      platformFeeDiscount = 0.15; // 15% off platform fee
    } else if (completedStays >= 3) {
      tier = 'PRACTITIONER';
      nextTier = 'SAGE';
      staysToNext = 6 - completedStays;
      platformFeeDiscount = 0.10; // 10% off platform fee
    } else {
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

  private getTierBenefits(tier: 'SEEKER' | 'PRACTITIONER' | 'SAGE'): string[] {
    const base = ['Access to all retreat listings', 'Preparation guides', 'Guest messaging'];
    if (tier === 'SEEKER') return base;
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

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(userId: string) {
    const now = new Date();

    const [totalBookings, upcomingStays, completedStays, totalSpent] =
      await Promise.all([
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
}
