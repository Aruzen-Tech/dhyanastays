import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutAccountController } from './payout-account.controller';
import { PayoutService } from './payout.service';
import { PayoutAccountService } from './payout-account.service';

@Module({
  providers: [PayoutService, PayoutAccountService],
  controllers: [PayoutController, PayoutAccountController],
  exports: [PayoutService, PayoutAccountService],
})
export class PayoutModule {}
