import { RequestUser } from '../common/decorators/current-user.decorator';
import { GuestService } from './guest.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
export declare class GuestController {
    private readonly guestService;
    constructor(guestService: GuestService);
    getProfile(user: RequestUser): Promise<{
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
    updateProfile(user: RequestUser, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        phone: string | null;
        avatarUrl: string | null;
    }>;
    getPreferences(user: RequestUser): Promise<{
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
    upsertPreferences(user: RequestUser, dto: UpsertPreferencesDto): Promise<{
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
    getStats(user: RequestUser): Promise<{
        totalBookings: number;
        upcomingStays: number;
        completedStays: number;
        totalSpent: number;
    }>;
    getLoyaltyTier(user: RequestUser): Promise<{
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
    getWishlist(user: RequestUser): Promise<({
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
    addToWishlist(user: RequestUser, listingId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        listingId: string;
    }>;
    removeFromWishlist(user: RequestUser, listingId: string): Promise<{
        success: boolean;
    }>;
    isWishlisted(user: RequestUser, listingId: string): Promise<{
        wishlisted: boolean;
    }>;
    createReview(user: RequestUser, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        listingId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
    }>;
    getMyReviews(user: RequestUser): Promise<({
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
    getNotifications(user: RequestUser, unreadOnly?: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }[]>;
    getUnreadCount(user: RequestUser): Promise<{
        count: number;
    }>;
    markRead(user: RequestUser, id: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        isRead: boolean;
    }>;
    markAllRead(user: RequestUser): Promise<{
        success: boolean;
    }>;
}
export declare class ListingReviewsController {
    private readonly guestService;
    constructor(guestService: GuestService);
    getListingReviews(id: string): Promise<{
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
}
