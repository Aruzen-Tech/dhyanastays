import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { HostAnalyticsService } from './host-analytics.service';

@Roles(UserRole.HOST)
@Controller()
export class HostAnalyticsController {
  constructor(private readonly hostAnalytics: HostAnalyticsService) {}

  @Get('host/analytics/stats')
  getStats(@CurrentUser() user: RequestUser) {
    return this.hostAnalytics.getStats(user.sub);
  }

  @Get('host/analytics/revenue')
  getRevenue(
    @CurrentUser() user: RequestUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.hostAnalytics.getRevenue(user.sub, from, to, groupBy);
  }

  @Get('host/analytics/listing-performance')
  getListingPerformance(@CurrentUser() user: RequestUser) {
    return this.hostAnalytics.getListingPerformance(user.sub);
  }

  @Get('host/analytics/forecast')
  getForecast(@CurrentUser() user: RequestUser) {
    return this.hostAnalytics.getForecast(user.sub);
  }

  @Get('host/bookings/calendar')
  getCalendarBookings(
    @CurrentUser() user: RequestUser,
    @Query('month') month: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.hostAnalytics.getCalendarBookings(user.sub, month, listingId);
  }

  @Get('host/bookings/list')
  getBookings(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.hostAnalytics.getBookings(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  @Get('host/notifications')
  getNotifications(
    @CurrentUser() user: RequestUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.hostAnalytics.getNotifications(user.sub, unreadOnly === 'true');
  }

  @Post('host/notifications/:id/read')
  markNotificationRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.hostAnalytics.markNotificationRead(user.sub, id);
  }

  @Post('host/notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: RequestUser) {
    return this.hostAnalytics.markAllNotificationsRead(user.sub);
  }
}
