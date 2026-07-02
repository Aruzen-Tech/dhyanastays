import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { PayLaterService } from './pay-later.service';
import { PayInstalmentDto } from './dto/pay-instalment.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

/**
 * Guest-facing endpoints for Pay Later instalments. The plan itself is
 * created automatically when the first (booking-time) instalment captures —
 * see BookingService.confirmPayment.
 */
@FeatureGate('pay_later')
@Controller('bookings')
export class PayLaterController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payLater: PayLaterService,
    private readonly paymentService: PaymentService,
  ) {}

  @Roles(UserRole.GUEST)
  @Get(':id/pay-later')
  getPlan(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
  ) {
    return this.payLater.getPlanForBooking(bookingId, user.sub);
  }

  @Roles(UserRole.GUEST)
  @Post(':id/pay-later/:seq/pay')
  async payInstalment(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
    @Param('seq', ParseIntPipe) seq: number,
    @Body() dto: PayInstalmentDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { guestId: true, plan: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== user.sub) throw new ForbiddenException();
    if (booking.plan !== 'PAY_LATER') {
      throw new NotFoundException('Booking is not on a Pay Later plan');
    }

    return this.paymentService.initPayLaterInstalmentPayment(
      user.sub,
      bookingId,
      seq,
      dto.idempotencyKey,
    );
  }
}
