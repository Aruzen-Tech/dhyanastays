import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { AdminLevel, UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListingService } from '../listing/listing.service';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly listingService: ListingService,
  ) {}

  /**
   * Guest creates a booking from a valid hold.
   * Roles: GUEST
   *
   * Idempotency: the IdempotencyInterceptor caches the response by
   * X-Idempotency-Key header. Replays return the cached response without
   * re-executing — defends against double-clicks and network retries.
   * `Booking.holdId @unique` provides a DB-level backstop for the same case.
   */
  @Roles(UserRole.GUEST)
  @UseInterceptors(IdempotencyInterceptor)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(user.sub, dto);
  }

  /**
   * GET /bookings — returns all bookings for the authenticated guest.
   * Must be declared before GET :id to avoid route shadowing.
   */
  @Roles(UserRole.GUEST)
  @Get()
  getMyBookings(@CurrentUser() user: RequestUser) {
    return this.bookingService.getMyBookings(user.sub);
  }

  /**
   * GET /bookings/host — returns all bookings for the authenticated host's listings.
   * Must be declared before GET :id to avoid route shadowing.
   */
  @Roles(UserRole.HOST)
  @Get('host')
  getHostBookings(@CurrentUser() user: RequestUser) {
    return this.bookingService.getHostBookings(user.sub);
  }

  /**
   * Host records that the on-arrival payment was collected at the property,
   * moving a pay-on-arrival booking to CONFIRMED_PAID.
   */
  @Roles(UserRole.HOST)
  @Post(':id/collect-on-arrival')
  collectOnArrival(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { method?: string },
  ) {
    return this.bookingService.collectOnArrival(user.sub, id, body?.method);
  }

  /**
   * Get booking details (guest sees own, admin sees all).
   */
  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookingService.getBookingById(id, user.sub, user.role);
  }

  /**
   * Guest gets preparation guide for a confirmed booking.
   */
  @Roles(UserRole.GUEST)
  @Get(':id/preparation')
  getPreparation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.listingService.getPreparationForBooking(user.sub, id);
  }

  /**
   * Guest, the listing's host, or an admin cancels a booking.
   */
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(id, user.sub, user.role, dto);
  }

  // ── Manual lifecycle ops (listing's host, or admin) ────────────────────────

  /** Confirm a PAYMENT_PENDING booking whose payment was taken offline. */
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Post(':id/confirm')
  confirmManual(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { method?: string },
  ) {
    return this.bookingService.manualConfirm(user.sub, user.role, id, body?.method);
  }

  /**
   * Manually transition a guest to CHECKED_IN (no QR scan). Distinct from the
   * guest self-check-in (`/check-in`, which only records arrival details).
   */
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Post(':id/mark-checked-in')
  markCheckedIn(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookingService.manualCheckIn(user.sub, user.role, id);
  }

  /**
   * Host (own listing) or admin marks a booking completed after checkout.
   * Accepts CONFIRMED_* and CHECKED_IN.
   */
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Post(':id/complete')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookingService.manualComplete(user.sub, user.role, id);
  }

  /**
   * Admin: get all bookings (paginated).
   */
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/all')
  getAllBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.bookingService.getAllBookings(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      status,
      search,
    );
  }
}
