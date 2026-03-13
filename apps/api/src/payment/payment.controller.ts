import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { InitPaymentDto } from './dto/init-payment.dto';
import { PaymentService } from './payment.service';
import { IsUUID } from 'class-validator';

class PayBalanceDto {
  @IsUUID()
  idempotencyKey!: string;
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Guest initiates a payment order.
   */
  @Roles(UserRole.GUEST)
  @Post('init')
  init(@CurrentUser() user: RequestUser, @Body() dto: InitPaymentDto) {
    return this.paymentService.initPayment(user.sub, dto);
  }

  /**
   * Razorpay webhook — must be @Public (no JWT) and receive raw body for signature verification.
   */
  @Public()
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') ?? '';
    return this.paymentService.handleWebhook(rawBody, signature);
  }

  /**
   * Guest pays the balance on a BALANCE_DUE booking.
   */
  @Roles(UserRole.GUEST)
  @Post('bookings/:bookingId/pay-balance')
  payBalance(
    @CurrentUser() user: RequestUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: PayBalanceDto,
  ) {
    return this.paymentService.payBalance(user.sub, bookingId, dto.idempotencyKey);
  }

  /**
   * LOCAL DEV ONLY — simulate payment capture (stub mode).
   * Transitions payment INITIATED → CAPTURED and booking → CONFIRMED_*.
   * Guarded by PaymentService.stubConfirm which rejects if not in stub mode.
   */
  @Roles(UserRole.GUEST)
  @Post('stub-confirm/:paymentId')
  stubConfirm(@Param('paymentId') paymentId: string) {
    return this.paymentService.stubConfirm(paymentId);
  }
}
