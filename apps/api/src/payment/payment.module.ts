import { forwardRef, Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import { BookingModule } from '../booking/booking.module';
import { PayLaterModule } from '../pay-later/pay-later.module';

@Module({
  imports: [forwardRef(() => BookingModule), forwardRef(() => PayLaterModule)],
  providers: [PaymentService, RazorpayService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
