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
var PayLaterDunningProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayLaterDunningProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const pay_later_service_1 = require("../pay-later/pay-later.service");
const booking_service_1 = require("../booking/booking.service");
const jobs_constants_1 = require("./jobs.constants");
let PayLaterDunningProcessor = PayLaterDunningProcessor_1 = class PayLaterDunningProcessor extends bullmq_1.WorkerHost {
    constructor(payLaterService, bookingService) {
        super();
        this.payLaterService = payLaterService;
        this.bookingService = bookingService;
        this.logger = new common_1.Logger(PayLaterDunningProcessor_1.name);
    }
    async process(job) {
        const mode = job.data?.mode;
        if (mode === 'reminders') {
            const sent = await this.payLaterService.sendDueReminders();
            if (sent > 0) {
                this.logger.log(`Pay Later: sent ${sent} reminders`);
            }
            return;
        }
        const { markedOverdue, defaulted } = await this.payLaterService.processOverdue();
        if (markedOverdue > 0) {
            this.logger.log(`Pay Later: marked ${markedOverdue} plans OVERDUE`);
        }
        for (const { planId, bookingId } of defaulted) {
            try {
                await this.bookingService.cancelDefaultedPayLater(bookingId);
                this.logger.log(`Pay Later: cancelled booking ${bookingId} for defaulted plan ${planId}`);
            }
            catch (err) {
                this.logger.error(`Pay Later: failed to cancel booking ${bookingId} for plan ${planId}: ${String(err)}`);
            }
        }
    }
};
exports.PayLaterDunningProcessor = PayLaterDunningProcessor;
exports.PayLaterDunningProcessor = PayLaterDunningProcessor = PayLaterDunningProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_PAY_LATER_DUNNING),
    __metadata("design:paramtypes", [pay_later_service_1.PayLaterService,
        booking_service_1.BookingService])
], PayLaterDunningProcessor);
//# sourceMappingURL=pay-later-dunning.processor.js.map