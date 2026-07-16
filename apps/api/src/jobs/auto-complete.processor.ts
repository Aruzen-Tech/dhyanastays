import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BookingService } from '../booking/booking.service';
import { QUEUE_AUTO_COMPLETE } from './jobs.constants';

/**
 * Auto-complete worker — flips bookings whose stay ended 24h+ ago from
 * CONFIRMED_PAID/DEPOSIT to COMPLETED. Awards loyalty points and triggers
 * referral credit via BookingService.completeBooking.
 */
@Processor(QUEUE_AUTO_COMPLETE)
export class AutoCompleteProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoCompleteProcessor.name);

  constructor(private readonly bookingService: BookingService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing auto-complete job ${job.id}`);
    const completed = await this.bookingService.autoCompleteCheckedOut();
    if (completed > 0) {
      this.logger.log(`Auto-complete: completed ${completed} booking(s)`);
    }
  }
}
