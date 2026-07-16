import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PayLaterService } from '../pay-later/pay-later.service';
import { BookingService } from '../booking/booking.service';
import { QUEUE_PAY_LATER_DUNNING } from './jobs.constants';

@Processor(QUEUE_PAY_LATER_DUNNING)
export class PayLaterDunningProcessor extends WorkerHost {
  private readonly logger = new Logger(PayLaterDunningProcessor.name);

  constructor(
    private readonly payLaterService: PayLaterService,
    private readonly bookingService: BookingService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const mode = (job.data as { mode?: string } | undefined)?.mode;

    if (mode === 'reminders') {
      const sent = await this.payLaterService.sendDueReminders();
      if (sent > 0) {
        this.logger.log(`Pay Later: sent ${sent} reminders`);
      }
      return;
    }

    // Default: overdue sweep
    const { markedOverdue, defaulted } =
      await this.payLaterService.processOverdue();
    if (markedOverdue > 0) {
      this.logger.log(`Pay Later: marked ${markedOverdue} plans OVERDUE`);
    }
    for (const { planId, bookingId } of defaulted) {
      try {
        await this.bookingService.cancelDefaultedPayLater(bookingId);
        this.logger.log(
          `Pay Later: cancelled booking ${bookingId} for defaulted plan ${planId}`,
        );
      } catch (err) {
        this.logger.error(
          `Pay Later: failed to cancel booking ${bookingId} for plan ${planId}: ${String(err)}`,
        );
      }
    }
  }
}
