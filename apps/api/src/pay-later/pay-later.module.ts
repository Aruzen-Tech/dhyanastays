import { forwardRef, Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { PayLaterService } from './pay-later.service';
import { PayLaterController } from './pay-later.controller';

@Module({
  imports: [NotificationModule, forwardRef(() => PaymentModule)],
  controllers: [PayLaterController],
  providers: [PayLaterService],
  exports: [PayLaterService],
})
export class PayLaterModule {}
