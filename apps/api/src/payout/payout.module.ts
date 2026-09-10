import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutAccountController } from './payout-account.controller';
import { PayoutService } from './payout.service';
import { PayoutAccountService } from './payout-account.service';
import { RouteService } from './route.service';
import { RoutePayoutService } from './route-payout.service';

@Module({
  providers: [PayoutService, PayoutAccountService, RouteService, RoutePayoutService],
  controllers: [PayoutController, PayoutAccountController],
  exports: [PayoutService, PayoutAccountService, RoutePayoutService],
})
export class PayoutModule {}
