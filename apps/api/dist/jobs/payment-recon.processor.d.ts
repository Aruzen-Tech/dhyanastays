import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentService } from '../payment/payment.service';
export declare class PaymentReconProcessor extends WorkerHost {
    private readonly paymentService;
    private readonly logger;
    constructor(paymentService: PaymentService);
    process(job: Job): Promise<void>;
}
