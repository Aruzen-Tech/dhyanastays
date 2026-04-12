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
var WeeklyPayoutProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeeklyPayoutProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const payout_service_1 = require("../payout/payout.service");
const jobs_constants_1 = require("./jobs.constants");
let WeeklyPayoutProcessor = WeeklyPayoutProcessor_1 = class WeeklyPayoutProcessor extends bullmq_1.WorkerHost {
    constructor(payoutService) {
        super();
        this.payoutService = payoutService;
        this.logger = new common_1.Logger(WeeklyPayoutProcessor_1.name);
    }
    async process(job) {
        this.logger.log(`Processing weekly payout batch job ${job.id}`);
        try {
            const result = await this.payoutService.runWeeklyBatch('system');
            this.logger.log(`Weekly payout batch complete: batchId=${result.batchId} ` +
                `total=INR ${result.totalAmount} lines=${result.lineCount} hosts=${result.hostCount}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Weekly payout batch skipped: ${message}`);
        }
    }
};
exports.WeeklyPayoutProcessor = WeeklyPayoutProcessor;
exports.WeeklyPayoutProcessor = WeeklyPayoutProcessor = WeeklyPayoutProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_WEEKLY_PAYOUT),
    __metadata("design:paramtypes", [payout_service_1.PayoutService])
], WeeklyPayoutProcessor);
//# sourceMappingURL=weekly-payout.processor.js.map