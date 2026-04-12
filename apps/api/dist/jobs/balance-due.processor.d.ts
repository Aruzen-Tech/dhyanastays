import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingService } from '../booking/booking.service';
export declare class BalanceDueProcessor extends WorkerHost {
    private readonly bookingService;
    private readonly logger;
    constructor(bookingService: BookingService);
    process(job: Job): Promise<void>;
}
