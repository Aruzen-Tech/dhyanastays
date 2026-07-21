import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
export declare class GuestService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        phone: string | null;
        avatarUrl: string | null;
        _count: {
            bookings: number;
            wishlists: number;
            reviews: number;
        };
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        phone: string | null;
        avatarUrl: string | null;
    }>;
    getPreferences(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        notes: string | null;
        dietaryNeeds: string[];
        wellnessInterests: string[];
        accessibility: string | null;
        roomPreference: string | null;
        experienceLevel: string | null;
        arrivalPreference: string | null;
        emergencyContact: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    upsertPreferences(userId: string, dto: UpsertPreferencesDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        notes: string | null;
        dietaryNeeds: string[];
        wellnessInterests: string[];
        accessibility: string | null;
        roomPreference: string | null;
        experienceLevel: string | null;
        arrivalPreference: string | null;
        emergencyContact: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getWishlist(userId: string): Promise<({
        listing: {
            id: string;
            status: import("@prisma/client").$Enums.ListingStatus;
            title: string;
            city: string;
            state: string;
            media: {
                id: string;
                createdAt: Date;
                url: string;
                mediaType: string;
                sortOrder: number;
                listingId: string;
            }[];
            rateRules: {
                baseNightlyRate: number;
                maxGuests: number;
            }[];
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        listingId: string;
    })[]>;
    addToWishlist(userId: string, listingId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        listingId: string;
    }>;
    removeFromWishlist(userId: string, listingId: string): Promise<{
        success: boolean;
    }>;
    isWishlisted(userId: string, listingId: string): Promise<{
        wishlisted: boolean;
    }>;
    createReview(userId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        listingId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
    }>;
    getMyReviews(userId: string): Promise<({
        listing: {
            id: string;
            title: string;
            city: string;
            state: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        listingId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
    })[]>;
    getListingReviews(listingId: string): Promise<{
        reviews: ({
            user: {
                fullName: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            listingId: string;
            bookingId: string;
            rating: number;
            comment: string | null;
        })[];
        avgRating: number;
        count: number;
    }>;
    getNotifications(userId: string, unreadOnly?: boolean): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }[]>;
    markNotificationRead(userId: string, notificationId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }>;
    markAllNotificationsRead(userId: string): Promise<{
        success: boolean;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
    }>;
    getLoyaltyTier(userId: string): Promise<{
        completedStays: number;
        nextTier: string | null;
        staysToNext: number;
        platformFeeDiscount: number;
        benefits: string[];
        label: string;
        icon: string;
        description: string;
        color: string;
        tier: "SEEKER" | "PRACTITIONER" | "SAGE";
    } | {
        completedStays: number;
        nextTier: string | null;
        staysToNext: number;
        platformFeeDiscount: number;
        benefits: string[];
        label: string;
        icon: string;
        description: string;
        color: string;
        tier: "SEEKER" | "PRACTITIONER" | "SAGE";
    } | {
        completedStays: number;
        nextTier: string | null;
        staysToNext: number;
        platformFeeDiscount: number;
        benefits: string[];
        label: string;
        icon: string;
        description: string;
        color: string;
        tier: "SEEKER" | "PRACTITIONER" | "SAGE";
    }>;
    private getTierBenefits;
    getDashboardStats(userId: string): Promise<{
        totalBookings: number;
        upcomingStays: number;
        completedStays: number;
        totalSpent: number;
    }>;
}
