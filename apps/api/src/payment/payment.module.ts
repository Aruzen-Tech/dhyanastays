import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  providers: [PaymentService, RazorpayService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
