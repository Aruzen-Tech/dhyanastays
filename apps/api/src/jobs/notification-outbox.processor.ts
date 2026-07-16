import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OutboxService } from '../notification/outbox.service';
import { OutboxDispatcher } from '../notification/outbox-dispatcher.service';
import { QUEUE_NOTIFICATION_OUTBOX } from './jobs.constants';

/**
 * Claims up to 50 PENDING outbox rows per tick and dispatches them. Each
 * row's failure handling is local — one bad row doesn't poison the batch.
 */
@Processor(QUEUE_NOTIFICATION_OUTBOX)
export class NotificationOutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationOutboxProcessor.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly dispatcher: OutboxDispatcher,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const rows = await this.outbox.claimPending();
    if (rows.length === 0) return;

    this.logger.debug(`Dispatching ${rows.length} outbox rows`);
    for (const row of rows) {
      await this.dispatcher.dispatch(row);
    }
  }
}
