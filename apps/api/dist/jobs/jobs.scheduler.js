"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var JobsScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsScheduler = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_2 = require("bullmq");
const jobs_constants_1 = require("./jobs.constants");
function bucketJobId(name, intervalMs) {
    return `${name}-${Math.floor(Date.now() / intervalMs)}`;
}
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
let JobsScheduler = JobsScheduler_1 = class JobsScheduler {
    constructor(holdExpiryQueue, balanceDueQueue, payoutEligibilityQueue, weeklyPayoutQueue, payLaterDunningQueue, notificationOutboxQueue, conciergeSlaQueue, investorDistributionQueue, paymentReconQueue, autoCompleteQueue) {
        this.holdExpiryQueue = holdExpiryQueue;
        this.balanceDueQueue = balanceDueQueue;
        this.payoutEligibilityQueue = payoutEligibilityQueue;
        this.weeklyPayoutQueue = weeklyPayoutQueue;
        this.payLaterDunningQueue = payLaterDunningQueue;
        this.notificationOutboxQueue = notificationOutboxQueue;
        this.conciergeSlaQueue = conciergeSlaQueue;
        this.investorDistributionQueue = investorDistributionQueue;
        this.paymentReconQueue = paymentReconQueue;
        this.autoCompleteQueue = autoCompleteQueue;
        this.logger = new common_1.Logger(JobsScheduler_1.name);
    }
    async scheduleHoldExpiry() {
        await this.holdExpiryQueue.add('expire', {}, {
            jobId: bucketJobId('hold-expiry', MINUTE),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async scheduleBalanceDue() {
        await this.balanceDueQueue.add('check', {}, {
            jobId: bucketJobId('balance-due', 15 * MINUTE),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async schedulePayoutEligibility() {
        await this.payoutEligibilityQueue.add('mark', {}, {
            jobId: bucketJobId('payout-eligibility', HOUR),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async scheduleWeeklyPayout() {
        this.logger.log('Enqueuing weekly-payout job');
        await this.weeklyPayoutQueue.add('run', {}, {
            jobId: bucketJobId('weekly-payout', 7 * DAY),
            removeOnComplete: 10, removeOnFail: 20, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async schedulePayLaterOverdueSweep() {
        await this.payLaterDunningQueue.add('overdue', { mode: 'overdue' }, {
            jobId: bucketJobId('pay-later-overdue', HOUR),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async schedulePayLaterReminders() {
        await this.payLaterDunningQueue.add('reminders', { mode: 'reminders' }, {
            jobId: bucketJobId('pay-later-reminders', 6 * HOUR),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async scheduleNotificationOutbox() {
        await this.notificationOutboxQueue.add('dispatch', {}, {
            jobId: bucketJobId('notification-outbox', 30 * 1000),
            removeOnComplete: 100, removeOnFail: 50, attempts: 1,
        });
    }
    async scheduleConciergeSlaSweep() {
        await this.conciergeSlaQueue.add('sweep', {}, {
            jobId: bucketJobId('concierge-sla', HOUR),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async scheduleInvestorMonthlyClose() {
        this.logger.log('Enqueuing investor monthly distribution close');
        await this.investorDistributionQueue.add('monthly-close', {}, {
            jobId: bucketJobId('investor-distribution', 30 * DAY),
            removeOnComplete: 24, removeOnFail: 24, attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
        });
    }
    async schedulePaymentRecon() {
        await this.paymentReconQueue.add('reconcile', {}, {
            jobId: bucketJobId('payment-recon', 15 * MINUTE),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
    async scheduleAutoComplete() {
        await this.autoCompleteQueue.add('complete', {}, {
            jobId: bucketJobId('auto-complete', HOUR),
            removeOnComplete: 100, removeOnFail: 50, attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
};
exports.JobsScheduler = JobsScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleHoldExpiry", null);
__decorate([
    (0, schedule_1.Cron)('0 */15 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleBalanceDue", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "schedulePayoutEligibility", null);
__decorate([
    (0, schedule_1.Cron)('30 3 * * 1'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleWeeklyPayout", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "schedulePayLaterOverdueSweep", null);
__decorate([
    (0, schedule_1.Cron)('0 0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "schedulePayLaterReminders", null);
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleNotificationOutbox", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleConciergeSlaSweep", null);
__decorate([
    (0, schedule_1.Cron)('0 0 2 1 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleInvestorMonthlyClose", null);
__decorate([
    (0, schedule_1.Cron)('0 */15 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "schedulePaymentRecon", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsScheduler.prototype, "scheduleAutoComplete", null);
exports.JobsScheduler = JobsScheduler = JobsScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_HOLD_EXPIRY)),
    __param(1, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_BALANCE_DUE)),
    __param(2, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY)),
    __param(3, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_WEEKLY_PAYOUT)),
    __param(4, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_PAY_LATER_DUNNING)),
    __param(5, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_NOTIFICATION_OUTBOX)),
    __param(6, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_CONCIERGE_SLA)),
    __param(7, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_INVESTOR_DISTRIBUTION)),
    __param(8, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_PAYMENT_RECON)),
    __param(9, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_AUTO_COMPLETE)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], JobsScheduler);
//# sourceMappingURL=jobs.scheduler.js.map