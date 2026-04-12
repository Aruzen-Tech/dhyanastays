"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = exports.QUEUE_WEEKLY_PAYOUT = exports.QUEUE_PAYOUT_ELIGIBILITY = exports.QUEUE_BALANCE_DUE = exports.QUEUE_HOLD_EXPIRY = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const hold_expiry_processor_1 = require("./hold-expiry.processor");
const balance_due_processor_1 = require("./balance-due.processor");
const payout_eligibility_processor_1 = require("./payout-eligibility.processor");
const weekly_payout_processor_1 = require("./weekly-payout.processor");
const jobs_scheduler_1 = require("./jobs.scheduler");
const hold_module_1 = require("../hold/hold.module");
const booking_module_1 = require("../booking/booking.module");
const payout_module_1 = require("../payout/payout.module");
const jobs_constants_1 = require("./jobs.constants");
Object.defineProperty(exports, "QUEUE_HOLD_EXPIRY", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_HOLD_EXPIRY; } });
Object.defineProperty(exports, "QUEUE_BALANCE_DUE", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_BALANCE_DUE; } });
Object.defineProperty(exports, "QUEUE_PAYOUT_ELIGIBILITY", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY; } });
Object.defineProperty(exports, "QUEUE_WEEKLY_PAYOUT", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_WEEKLY_PAYOUT; } });
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.registerQueue({ name: jobs_constants_1.QUEUE_HOLD_EXPIRY }, { name: jobs_constants_1.QUEUE_BALANCE_DUE }, { name: jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY }, { name: jobs_constants_1.QUEUE_WEEKLY_PAYOUT }),
            hold_module_1.HoldModule,
            booking_module_1.BookingModule,
            payout_module_1.PayoutModule,
        ],
        providers: [
            hold_expiry_processor_1.HoldExpiryProcessor,
            balance_due_processor_1.BalanceDueProcessor,
            payout_eligibility_processor_1.PayoutEligibilityProcessor,
            weekly_payout_processor_1.WeeklyPayoutProcessor,
            jobs_scheduler_1.JobsScheduler,
        ],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map