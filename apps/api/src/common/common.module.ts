import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control/access-control.service';
import { AuditService } from './services/audit.service';
import { LedgerService } from './services/ledger.service';
import { PriceSnapshotSignerService } from './services/price-snapshot-signer.service';
import { CapabilitiesService } from './services/capabilities.service';

@Global()
@Module({
  providers: [
    AuditService,
    LedgerService,
    AccessControlService,
    PriceSnapshotSignerService,
    CapabilitiesService,
  ],
  exports: [
    AuditService,
    LedgerService,
    AccessControlService,
    PriceSnapshotSignerService,
    CapabilitiesService,
  ],
})
export class CommonModule {}
