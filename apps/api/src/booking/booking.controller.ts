import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * Guest creates a booking from a valid hold.
   * Roles: GUEST
   */
  @Roles(UserRole.GUEST)
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
   * Get booking details (guest sees own, admin sees all).
   */
  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookingService.getBookingById(id, user.sub, user.role);
  }

  /**
   * Guest or Admin cancels a booking.
   */
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(id, user.sub, user.role, dto);
  }

  /**
   * Admin marks booking as completed after checkout.
   */
  @Roles(UserRole.ADMIN)
  @Post(':id/complete')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookingService.completeBooking(id, user.sub);
  }

  /**
   * Admin: get all bookings (paginated).
   */
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  getAllBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingService.getAllBookings(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
