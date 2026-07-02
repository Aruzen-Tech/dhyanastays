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
var InvestorDistributionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestorDistributionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const investor_service_1 = require("../investor/investor.service");
const jobs_constants_1 = require("./jobs.constants");
let InvestorDistributionProcessor = InvestorDistributionProcessor_1 = class InvestorDistributionProcessor extends bullmq_1.WorkerHost {
    constructor(investor) {
        super();
        this.investor = investor;
        this.logger = new common_1.Logger(InvestorDistributionProcessor_1.name);
    }
    async process(_job) {
        const result = await this.investor.runMonthlyClose();
        this.logger.log(`Investor distribution close period=${result.period} investors=${result.computed}`);
        return result;
    }
};
exports.InvestorDistributionProcessor = InvestorDistributionProcessor;
exports.InvestorDistributionProcessor = InvestorDistributionProcessor = InvestorDistributionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_INVESTOR_DISTRIBUTION),
    __metadata("design:paramtypes", [investor_service_1.InvestorService])
], InvestorDistributionProcessor);
//# sourceMappingURL=investor-distribution.processor.js.map