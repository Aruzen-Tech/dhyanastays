import { Queue } from 'bullmq';
export declare class JobsScheduler {
    private readonly holdExpiryQueue;
    private readonly balanceDueQueue;
    private readonly payoutEligibilityQueue;
    private readonly weeklyPayoutQueue;
    private readonly payLaterDunningQueue;
    private readonly notificationOutboxQueue;
    private readonly conciergeSlaQueue;
    private readonly investorDistributionQueue;
    private readonly paymentReconQueue;
    private readonly autoCompleteQueue;
    private readonly logger;
    constructor(holdExpiryQueue: Queue, balanceDueQueue: Queue, payoutEligibilityQueue: Queue, weeklyPayoutQueue: Queue, payLaterDunningQueue: Queue, notificationOutboxQueue: Queue, conciergeSlaQueue: Queue, investorDistributionQueue: Queue, paymentReconQueue: Queue, autoCompleteQueue: Queue);
    scheduleHoldExpiry(): Promise<void>;
    scheduleBalanceDue(): Promise<void>;
    schedulePayoutEligibility(): Promise<void>;
    scheduleWeeklyPayout(): Promise<void>;
    schedulePayLaterOverdueSweep(): Promise<void>;
    schedulePayLaterReminders(): Promise<void>;
    scheduleNotificationOutbox(): Promise<void>;
    scheduleConciergeSlaSweep(): Promise<void>;
    scheduleInvestorMonthlyClose(): Promise<void>;
    schedulePaymentRecon(): Promise<void>;
    scheduleAutoComplete(): Promise<void>;
}
