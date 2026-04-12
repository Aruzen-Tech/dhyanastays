import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { GuestService } from './guest.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';

@Controller('guest')
@Roles(UserRole.GUEST)
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.guestService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.guestService.updateProfile(user.sub, dto);
  }

  // ─── Preferences ─────────────────────────────────────────────────────────

  @Get('preferences')
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.guestService.getPreferences(user.sub);
  }

  @Put('preferences')
  upsertPreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertPreferencesDto,
  ) {
    return this.guestService.upsertPreferences(user.sub, dto);
  }

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  @Get('stats')
  getStats(@CurrentUser() user: RequestUser) {
    return this.guestService.getDashboardStats(user.sub);
  }

  // ─── Loyalty Tier ─────────────────────────────────────────────────────────

  @Get('loyalty')
  getLoyaltyTier(@CurrentUser() user: RequestUser) {
    return this.guestService.getLoyaltyTier(user.sub);
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  @Get('wishlist')
  getWishlist(@CurrentUser() user: RequestUser) {
    return this.guestService.getWishlist(user.sub);
  }

  @Post('wishlist/:listingId')
  addToWishlist(
    @CurrentUser() user: RequestUser,
    @Param('listingId') listingId: string,
  ) {
    return this.guestService.addToWishlist(user.sub, listingId);
  }

  @Delete('wishlist/:listingId')
  removeFromWishlist(
    @CurrentUser() user: RequestUser,
    @Param('listingId') listingId: string,
  ) {
    return this.guestService.removeFromWishlist(user.sub, listingId);
  }

  @Get('wishlist/check/:listingId')
  isWishlisted(
    @CurrentUser() user: RequestUser,
    @Param('listingId') listingId: string,
  ) {
    return this.guestService.isWishlisted(user.sub, listingId);
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  @Post('reviews')
  createReview(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.guestService.createReview(user.sub, dto);
  }

  @Get('reviews')
  getMyReviews(@CurrentUser() user: RequestUser) {
    return this.guestService.getMyReviews(user.sub);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @Get('notifications')
  getNotifications(
    @CurrentUser() user: RequestUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.guestService.getNotifications(user.sub, unreadOnly === 'true');
  }

  @Get('notifications/unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.guestService.getUnreadCount(user.sub);
  }

  @Post('notifications/:id/read')
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.guestService.markNotificationRead(user.sub, id);
  }

  @Post('notifications/read-all')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.guestService.markAllNotificationsRead(user.sub);
  }
}

// Public endpoint for listing reviews (no auth required)
@Controller('listings')
export class ListingReviewsController {
  constructor(private readonly guestService: GuestService) {}

  @Public()
  @Get(':id/reviews')
  getListingReviews(@Param('id') id: string) {
    return this.guestService.getListingReviews(id);
  }
}
