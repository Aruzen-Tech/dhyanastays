import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutAccountController } from './payout-account.controller';
import { PayoutService } from './payout.service';
import { PayoutAccountService } from './payout-account.service';
import { RouteService } from './route.service';
import { RoutePayoutService } from './route-payout.service';
import { PayoutTaxService } from './payout-tax.service';
import { HostBalanceService } from './host-balance.service';
import { PayoutCancellationService } from './payout-cancellation.service';

@Module({
  providers: [
    PayoutService,
    PayoutAccountService,
    RouteService,
    RoutePayoutService,
    PayoutTaxService,
    HostBalanceService,
    PayoutCancellationService,
  ],
  controllers: [PayoutController, PayoutAccountController],
  exports: [
    PayoutService,
    PayoutAccountService,
    RoutePayoutService,
    HostBalanceService,
    PayoutTaxService,
  ],
})
export class PayoutModule {}
