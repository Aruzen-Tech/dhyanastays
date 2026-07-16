import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PayLaterService } from '../pay-later/pay-later.service';
import { BookingService } from '../booking/booking.service';
export declare class PayLaterDunningProcessor extends WorkerHost {
    private readonly payLaterService;
    private readonly bookingService;
    private readonly logger;
    constructor(payLaterService: PayLaterService, bookingService: BookingService);
    process(job: Job): Promise<void>;
}
