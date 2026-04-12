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
var PayoutEligibilityProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutEligibilityProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const payout_service_1 = require("../payout/payout.service");
const jobs_constants_1 = require("./jobs.constants");
let PayoutEligibilityProcessor = PayoutEligibilityProcessor_1 = class PayoutEligibilityProcessor extends bullmq_1.WorkerHost {
    constructor(payoutService) {
        super();
        this.payoutService = payoutService;
        this.logger = new common_1.Logger(PayoutEligibilityProcessor_1.name);
    }
    async process(job) {
        this.logger.debug(`Processing payout-eligibility job ${job.id}`);
        const marked = await this.payoutService.markEligible();
        if (marked > 0) {
            this.logger.log(`Payout eligibility: marked ${marked} lines as ELIGIBLE`);
        }
    }
};
exports.PayoutEligibilityProcessor = PayoutEligibilityProcessor;
exports.PayoutEligibilityProcessor = PayoutEligibilityProcessor = PayoutEligibilityProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY),
    __metadata("design:paramtypes", [payout_service_1.PayoutService])
], PayoutEligibilityProcessor);
//# sourceMappingURL=payout-eligibility.processor.js.map