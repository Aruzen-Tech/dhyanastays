import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminLevel, ApplicationStatus, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminService } from './admin.service';
import { AdminNotificationService } from './admin-notification.service';
import { RateLimitService } from './rate-limit.service';
import { CreateAdminRefundDto } from './dto/create-admin-refund.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BulkIdsDto } from './dto/bulk-ids.dto';
import { ApplyStaffDto } from './dto/apply-staff.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { ChangeUserKindDto } from './dto/change-user-kind.dto';

@AdminLevelGuard(AdminLevel.L2)
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

  /**
   * POST /api/admin/users/:id/role
   * L1 Super Admin — change a user's kind (GUEST/OWNER/INVESTOR/STAFF)
   * with a required reason. Writes a RoleChangeAudit row.
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Post('users/:id/role')
  changeUserKind(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ChangeUserKindDto,
  ) {
    return this.adminService.changeUserKind(id, actor.sub, dto);
  }

  /**
   * GET /api/admin/users/:id/role-history
   * L1 + L2 — returns the RoleChangeAudit timeline for a user.
   */
  @AdminLevelGuard(AdminLevel.L1, AdminLevel.L2)
  @Get('users/:id/role-history')
  getUserRoleHistory(@Param('id') id: string) {
    return this.adminService.getUserRoleHistory(id);
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

  // ── Staff / Admin Registration ────────────────────────────────────────────

  /**
   * POST /api/admin/staff/apply
   * Public endpoint — anyone can submit an application for a staff role.
   * Authenticated users automatically have their applicantId attached.
   */
  @Public()
  @Post('staff/apply')
  submitStaffApplication(
    @Body() dto: ApplyStaffDto,
    @CurrentUser() actor?: RequestUser,
  ) {
    return this.adminService.submitApplication(dto, actor?.sub);
  }

  /**
   * GET /api/admin/staff/applications?status=PENDING&page=1&limit=20
   * L1 Super Admin only — lists all incoming applications.
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Get('staff/applications')
  getApplications(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const validStatuses = Object.values(ApplicationStatus);
    const statusFilter = validStatuses.includes(status as ApplicationStatus)
      ? (status as ApplicationStatus)
      : undefined;
    return this.adminService.getApplications(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      statusFilter,
    );
  }

  /**
   * PATCH /api/admin/staff/applications/:id/review
   * L1 Super Admin only — approve or reject an application.
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Patch('staff/applications/:id/review')
  reviewApplication(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.adminService.reviewApplication(id, actor.sub, dto);
  }

  /**
   * GET /api/admin/staff?search=&page=1&limit=20
   * L1 Super Admin only — lists all current staff members.
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Get('staff')
  getStaff(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getStaff(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  /**
   * POST /api/admin/staff/:userId/assign
   * L1 Super Admin only — directly assign a staff role to an existing user.
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Post('staff/:userId/assign')
  assignStaffRole(
    @CurrentUser() actor: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: AssignStaffRoleDto,
  ) {
    return this.adminService.assignStaffRole(userId, actor.sub, dto);
  }

  /**
   * DELETE /api/admin/staff/:userId
   * L1 Super Admin only — revoke a user's staff role (cannot revoke L1).
   */
  @AdminLevelGuard(AdminLevel.L1)
  @Delete('staff/:userId')
  revokeStaffRole(
    @CurrentUser() actor: RequestUser,
    @Param('userId') userId: string,
  ) {
    return this.adminService.revokeStaffRole(userId, actor.sub);
  }
}
