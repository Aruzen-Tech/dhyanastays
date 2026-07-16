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
var PaymentReconProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReconProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const payment_service_1 = require("../payment/payment.service");
const jobs_constants_1 = require("./jobs.constants");
let PaymentReconProcessor = PaymentReconProcessor_1 = class PaymentReconProcessor extends bullmq_1.WorkerHost {
    constructor(paymentService) {
        super();
        this.paymentService = paymentService;
        this.logger = new common_1.Logger(PaymentReconProcessor_1.name);
    }
    async process(job) {
        this.logger.debug(`Processing payment-recon job ${job.id}`);
        const result = await this.paymentService.reconcileStalePayments(30);
        if (result.examined > 0) {
            this.logger.log(`Payment recon: examined=${result.examined} captured=${result.captured} failed=${result.failed} stillPending=${result.stillPending} errors=${result.errors}`);
        }
    }
};
exports.PaymentReconProcessor = PaymentReconProcessor;
exports.PaymentReconProcessor = PaymentReconProcessor = PaymentReconProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_PAYMENT_RECON),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentReconProcessor);
//# sourceMappingURL=payment-recon.processor.js.map