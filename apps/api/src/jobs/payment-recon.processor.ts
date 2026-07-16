import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PaymentService } from '../payment/payment.service';
import { QUEUE_PAYMENT_RECON } from './jobs.constants';

/**
 * Reconciliation worker — picks up INITIATED payments older than 30 min and
 * queries Razorpay for their actual state. Recovers bookings stuck in
 * PAYMENT_PENDING when a webhook was lost in transit.
 */
@Processor(QUEUE_PAYMENT_RECON)
export class PaymentReconProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReconProcessor.name);

  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing payment-recon job ${job.id}`);
    const result = await this.paymentService.reconcileStalePayments(30);
    if (result.examined > 0) {
      this.logger.log(
        `Payment recon: examined=${result.examined} captured=${result.captured} failed=${result.failed} stillPending=${result.stillPending} errors=${result.errors}`,
      );
    }
  }
}
