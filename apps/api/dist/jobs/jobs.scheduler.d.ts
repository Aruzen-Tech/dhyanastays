import { Queue } from 'bullmq';
export declare class JobsScheduler {
    private readonly holdExpiryQueue;
    private readonly balanceDueQueue;
    private readonly payoutEligibilityQueue;
    private readonly weeklyPayoutQueue;
    private readonly logger;
    constructor(holdExpiryQueue: Queue, balanceDueQueue: Queue, payoutEligibilityQueue: Queue, weeklyPayoutQueue: Queue);
    scheduleHoldExpiry(): Promise<void>;
    scheduleBalanceDue(): Promise<void>;
    schedulePayoutEligibility(): Promise<void>;
    scheduleWeeklyPayout(): Promise<void>;
}
