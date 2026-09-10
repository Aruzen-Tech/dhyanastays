import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RoutePayoutService } from '../payout/route-payout.service';
import { QUEUE_ROUTE_TRANSFER } from './jobs.constants';

/**
 * Route settlement worker.
 *
 * `create` splits captured payments to hosts' linked accounts (held in the
 * aggregator's escrow until check-in + 24h). `reconcile` polls transfers that
 * haven't reached a terminal state, so a missed webhook can't leave a payout
 * stuck. Both are no-ops while the `payout_route` flag is off.
 *
 * Deliberately kept out of the payment-capture transaction: creating a transfer
 * is a network call, and network I/O inside a SERIALIZABLE booking transaction
 * would hold locks across an external round-trip.
 */
@Processor(QUEUE_ROUTE_TRANSFER)
export class RouteTransferProcessor extends WorkerHost {
  private readonly logger = new Logger(RouteTransferProcessor.name);

  constructor(private readonly routePayout: RoutePayoutService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const mode = (job.data as { mode?: string })?.mode ?? 'create';

    if (mode === 'reconcile') {
      const count = await this.routePayout.reconcileOpenTransfers();
      if (count > 0) this.logger.log(`Route reconcile: refreshed ${count} transfer(s)`);
      return;
    }

    const res = await this.routePayout.createDueTransfers();
    if (res.created > 0 || res.failed > 0) {
      this.logger.log(
        `Route transfers: ${res.created} created, ${res.skipped} skipped, ${res.failed} failed`,
      );
    }
  }
}
