import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StayPassService } from '../stay-pass/stay-pass.service';
import { QUEUE_TICKET_RENDER } from './jobs.constants';

/**
 * Stay Pass render worker — reconciliation sweep (same pattern as the
 * notification outbox): renders tickets for newly-confirmed bookings, retries
 * FAILED renders, and voids tickets for cancelled bookings. Every step is
 * idempotent (deterministic renders, one Ticket per booking), so at-least-once
 * delivery and replays are safe.
 */
@Processor(QUEUE_TICKET_RENDER)
export class TicketRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketRenderProcessor.name);

  constructor(private readonly stayPass: StayPassService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing ticket-render sweep ${job.id}`);
    await this.stayPass.sweep();
  }
}
