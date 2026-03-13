import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control/access-control.service';
import { AuditService } from './services/audit.service';
import { LedgerService } from './services/ledger.service';

@Global()
@Module({
  providers: [AuditService, LedgerService, AccessControlService],
  exports: [AuditService, LedgerService, AccessControlService],
})
export class CommonModule {}
