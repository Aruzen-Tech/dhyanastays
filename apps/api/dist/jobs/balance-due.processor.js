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
var BalanceDueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceDueProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const booking_service_1 = require("../booking/booking.service");
const jobs_constants_1 = require("./jobs.constants");
let BalanceDueProcessor = BalanceDueProcessor_1 = class BalanceDueProcessor extends bullmq_1.WorkerHost {
    constructor(bookingService) {
        super();
        this.bookingService = bookingService;
        this.logger = new common_1.Logger(BalanceDueProcessor_1.name);
    }
    async process(job) {
        this.logger.debug(`Processing balance-due job ${job.id}`);
        const transitioned = await this.bookingService.transitionToBalanceDue();
        if (transitioned > 0) {
            this.logger.log(`Balance due: transitioned ${transitioned} bookings to BALANCE_DUE`);
        }
        const cancelled = await this.bookingService.autoCancelUnpaidBalance();
        if (cancelled > 0) {
            this.logger.log(`Balance due: auto-cancelled ${cancelled} unpaid bookings`);
        }
    }
};
exports.BalanceDueProcessor = BalanceDueProcessor;
exports.BalanceDueProcessor = BalanceDueProcessor = BalanceDueProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_BALANCE_DUE),
    __metadata("design:paramtypes", [booking_service_1.BookingService])
], BalanceDueProcessor);
//# sourceMappingURL=balance-due.processor.js.map