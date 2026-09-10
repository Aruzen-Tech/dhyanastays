import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control/access-control.service';
import { AuditService } from './services/audit.service';
import { LedgerService } from './services/ledger.service';
import { PriceSnapshotSignerService } from './services/price-snapshot-signer.service';
import { CapabilitiesService } from './services/capabilities.service';
import { PayoutCryptoService } from './services/payout-crypto.service';

@Global()
@Module({
  providers: [
    AuditService,
    LedgerService,
    AccessControlService,
    PriceSnapshotSignerService,
    CapabilitiesService,
    PayoutCryptoService,
  ],
  exports: [
    AuditService,
    LedgerService,
    AccessControlService,
    PriceSnapshotSignerService,
    CapabilitiesService,
    PayoutCryptoService,
  ],
})
export class CommonModule {}
