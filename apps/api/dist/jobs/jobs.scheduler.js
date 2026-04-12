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
let JobsScheduler = JobsScheduler_1 = class JobsScheduler {
    constructor(holdExpiryQueue, balanceDueQueue, payoutEligibilityQueue, weeklyPayoutQueue) {
        this.holdExpiryQueue = holdExpiryQueue;
        this.balanceDueQueue = balanceDueQueue;
        this.payoutEligibilityQueue = payoutEligibilityQueue;
        this.weeklyPayoutQueue = weeklyPayoutQueue;
        this.logger = new common_1.Logger(JobsScheduler_1.name);
    }
    async scheduleHoldExpiry() {
        this.logger.debug('Enqueuing hold-expiry job');
        await this.holdExpiryQueue.add('expire', {}, { removeOnComplete: 100, removeOnFail: 50 });
    }
    async scheduleBalanceDue() {
        this.logger.debug('Enqueuing balance-due job');
        await this.balanceDueQueue.add('check', {}, { removeOnComplete: 100, removeOnFail: 50 });
    }
    async schedulePayoutEligibility() {
        this.logger.debug('Enqueuing payout-eligibility job');
        await this.payoutEligibilityQueue.add('mark', {}, { removeOnComplete: 100, removeOnFail: 50 });
    }
    async scheduleWeeklyPayout() {
        this.logger.log('Enqueuing weekly-payout job');
        await this.weeklyPayoutQueue.add('run', {}, { removeOnComplete: 10, removeOnFail: 20 });
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
exports.JobsScheduler = JobsScheduler = JobsScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_HOLD_EXPIRY)),
    __param(1, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_BALANCE_DUE)),
    __param(2, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY)),
    __param(3, (0, bullmq_1.InjectQueue)(jobs_constants_1.QUEUE_WEEKLY_PAYOUT)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], JobsScheduler);
//# sourceMappingURL=jobs.scheduler.js.map