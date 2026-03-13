import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BookingService } from '../booking/booking.service';
import { QUEUE_BALANCE_DUE } from './jobs.constants';

@Processor(QUEUE_BALANCE_DUE)
export class BalanceDueProcessor extends WorkerHost {
  private readonly logger = new Logger(BalanceDueProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing balance-due job ${job.id}`);

    // Transition CONFIRMED_DEPOSIT → BALANCE_DUE
    const transitioned = await this.bookingService.transitionToBalanceDue();
    if (transitioned > 0) {
      this.logger.log(`Balance due: transitioned ${transitioned} bookings to BALANCE_DUE`);
    }

    // Auto-cancel overdue BALANCE_DUE bookings
    const cancelled = await this.bookingService.autoCancelUnpaidBalance();
    if (cancelled > 0) {
      this.logger.log(`Balance due: auto-cancelled ${cancelled} unpaid bookings`);
    }
  }
}
