import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService],
})
export class PayoutModule {}
