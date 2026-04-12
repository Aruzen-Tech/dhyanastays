import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AdminNotificationService } from './admin-notification.service';
import { RateLimitService } from './rate-limit.service';
import { CreateAdminRefundDto } from './dto/create-admin-refund.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BulkIdsDto } from './dto/bulk-ids.dto';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly notificationService: AdminNotificationService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  /** GET /api/admin/stats — aggregated platform metrics */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  /** GET /api/admin/users?page=1&limit=20&role=GUEST — paginated user list */
  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      role as UserRole | undefined,
      search,
    );
  }

  /** POST /api/admin/users/:id/deactivate — deactivate a user account */
  @Post('users/:id/deactivate')
  deactivateUser(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    return this.adminService.deactivateUser(id, actor.sub);
  }

  /** POST /api/admin/users/:id/activate — reactivate a user account */
  @Post('users/:id/activate')
  activateUser(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    return this.adminService.activateUser(id, actor.sub);
  }

  /** GET /api/admin/audit-log?page=1&limit=30&action=LISTING_APPROVED — paginated audit log */
  @Get('audit-log')
  getAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.adminService.getAuditLog(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
      action,
      resourceType,
    );
  }

  // ── Feature 1: Revenue Analytics ──
  @Get('analytics/revenue')
  getRevenue(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: string,
  ) {
    return this.adminService.getRevenueAnalytics(from, to, (groupBy || 'day') as 'day' | 'week' | 'month');
  }

  // ── Feature 2: Listing Detail ──
  @Get('listings/:id')
  getListingDetail(@Param('id') id: string) {
    return this.adminService.getListingDetail(id);
  }

  // ── Feature 3: Refunds ──

  /** GET /api/admin/refunds/validate/:bookingId — pre-validate booking before issuing refund */
  @Get('refunds/validate/:bookingId')
  validateRefundBooking(@Param('bookingId') bookingId: string) {
    return this.adminService.validateRefundBooking(bookingId);
  }

  @Get('refunds')
  getRefunds(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getRefunds(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('refunds')
  createRefund(@CurrentUser() actor: RequestUser, @Body() dto: CreateAdminRefundDto) {
    return this.adminService.createRefund(actor.sub, dto);
  }

  // ── Feature 4: System Settings ──
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@CurrentUser() actor: RequestUser, @Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(actor.sub, dto.updates);
  }

  // ── Feature 6: Booking Calendar ──
  @Get('bookings/calendar')
  getCalendarBookings(
    @Query('month') month: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.adminService.getCalendarBookings(month, listingId);
  }

  // ── Feature 7: Host Performance ──
  @Get('hosts/performance')
  getHostPerformance() {
    return this.adminService.getHostPerformance();
  }

  // ── Feature 8: Notifications ──
  @Get('notifications')
  getNotifications(@Query('unreadOnly') unreadOnly?: string) {
    return this.notificationService.getNotifications(unreadOnly === 'true');
  }

  @Post('notifications/:id/read')
  markNotificationRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead() {
    return this.notificationService.markAllRead();
  }

  // ── Feature 9: Bulk Actions ──
  @Post('listings/bulk-approve')
  bulkApproveListings(@CurrentUser() actor: RequestUser, @Body() dto: BulkIdsDto) {
    return this.adminService.bulkApproveListings(actor.sub, dto.ids);
  }

  @Post('users/bulk-deactivate')
  bulkDeactivateUsers(@CurrentUser() actor: RequestUser, @Body() dto: BulkIdsDto) {
    return this.adminService.bulkDeactivateUsers(actor.sub, dto.ids);
  }

  @Post('bookings/bulk-complete')
  bulkCompleteBookings(@CurrentUser() actor: RequestUser, @Body() dto: BulkIdsDto) {
    return this.adminService.bulkCompleteBookings(actor.sub, dto.ids);
  }

  // ── Feature 10: Global Search ──
  @Get('search')
  globalSearch(@Query('q') q: string) {
    return this.adminService.globalSearch(q || '');
  }

  // ── Feature 11: Admin Activity ──
  @Get('activity')
  getAdminActivity(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
  ) {
    return this.adminService.getAdminActivity(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
      adminId,
    );
  }

  // ── Feature 12: Rate Limiter Stats ──
  @Get('rate-limits/stats')
  getRateLimitStats() {
    return this.rateLimitService.getStats();
  }

  // ── Feature 13: Revenue Forecast ──
  @Get('analytics/forecast')
  getForecast() {
    return this.adminService.getRevenueForecast();
  }
}
