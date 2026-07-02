"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = exports.QUEUE_AUTO_COMPLETE = exports.QUEUE_PAYMENT_RECON = exports.QUEUE_INVESTOR_DISTRIBUTION = exports.QUEUE_CONCIERGE_SLA = exports.QUEUE_SOS_BROADCAST = exports.QUEUE_NOTIFICATION_OUTBOX = exports.QUEUE_PAY_LATER_DUNNING = exports.QUEUE_WEEKLY_PAYOUT = exports.QUEUE_PAYOUT_ELIGIBILITY = exports.QUEUE_BALANCE_DUE = exports.QUEUE_HOLD_EXPIRY = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const hold_expiry_processor_1 = require("./hold-expiry.processor");
const balance_due_processor_1 = require("./balance-due.processor");
const payout_eligibility_processor_1 = require("./payout-eligibility.processor");
const weekly_payout_processor_1 = require("./weekly-payout.processor");
const pay_later_dunning_processor_1 = require("./pay-later-dunning.processor");
const notification_outbox_processor_1 = require("./notification-outbox.processor");
const sos_broadcast_processor_1 = require("./sos-broadcast.processor");
const concierge_sla_processor_1 = require("./concierge-sla.processor");
const investor_distribution_processor_1 = require("./investor-distribution.processor");
const payment_recon_processor_1 = require("./payment-recon.processor");
const auto_complete_processor_1 = require("./auto-complete.processor");
const jobs_scheduler_1 = require("./jobs.scheduler");
const hold_module_1 = require("../hold/hold.module");
const booking_module_1 = require("../booking/booking.module");
const payment_module_1 = require("../payment/payment.module");
const payout_module_1 = require("../payout/payout.module");
const pay_later_module_1 = require("../pay-later/pay-later.module");
const notification_module_1 = require("../notification/notification.module");
const sos_module_1 = require("../sos/sos.module");
const messaging_module_1 = require("../messaging/messaging.module");
const investor_module_1 = require("../investor/investor.module");
const jobs_constants_1 = require("./jobs.constants");
Object.defineProperty(exports, "QUEUE_HOLD_EXPIRY", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_HOLD_EXPIRY; } });
Object.defineProperty(exports, "QUEUE_BALANCE_DUE", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_BALANCE_DUE; } });
Object.defineProperty(exports, "QUEUE_PAYOUT_ELIGIBILITY", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY; } });
Object.defineProperty(exports, "QUEUE_WEEKLY_PAYOUT", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_WEEKLY_PAYOUT; } });
Object.defineProperty(exports, "QUEUE_PAY_LATER_DUNNING", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_PAY_LATER_DUNNING; } });
Object.defineProperty(exports, "QUEUE_NOTIFICATION_OUTBOX", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_NOTIFICATION_OUTBOX; } });
Object.defineProperty(exports, "QUEUE_SOS_BROADCAST", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_SOS_BROADCAST; } });
Object.defineProperty(exports, "QUEUE_CONCIERGE_SLA", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_CONCIERGE_SLA; } });
Object.defineProperty(exports, "QUEUE_INVESTOR_DISTRIBUTION", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_INVESTOR_DISTRIBUTION; } });
Object.defineProperty(exports, "QUEUE_PAYMENT_RECON", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_PAYMENT_RECON; } });
Object.defineProperty(exports, "QUEUE_AUTO_COMPLETE", { enumerable: true, get: function () { return jobs_constants_1.QUEUE_AUTO_COMPLETE; } });
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.registerQueue({ name: jobs_constants_1.QUEUE_HOLD_EXPIRY }, { name: jobs_constants_1.QUEUE_BALANCE_DUE }, { name: jobs_constants_1.QUEUE_PAYOUT_ELIGIBILITY }, { name: jobs_constants_1.QUEUE_WEEKLY_PAYOUT }, { name: jobs_constants_1.QUEUE_PAY_LATER_DUNNING }, { name: jobs_constants_1.QUEUE_NOTIFICATION_OUTBOX }, { name: jobs_constants_1.QUEUE_SOS_BROADCAST }, { name: jobs_constants_1.QUEUE_CONCIERGE_SLA }, { name: jobs_constants_1.QUEUE_INVESTOR_DISTRIBUTION }, { name: jobs_constants_1.QUEUE_PAYMENT_RECON }, { name: jobs_constants_1.QUEUE_AUTO_COMPLETE }),
            hold_module_1.HoldModule,
            booking_module_1.BookingModule,
            payment_module_1.PaymentModule,
            payout_module_1.PayoutModule,
            pay_later_module_1.PayLaterModule,
            notification_module_1.NotificationModule,
            sos_module_1.SosModule,
            messaging_module_1.MessagingModule,
            investor_module_1.InvestorModule,
        ],
        providers: [
            hold_expiry_processor_1.HoldExpiryProcessor,
            balance_due_processor_1.BalanceDueProcessor,
            payout_eligibility_processor_1.PayoutEligibilityProcessor,
            weekly_payout_processor_1.WeeklyPayoutProcessor,
            pay_later_dunning_processor_1.PayLaterDunningProcessor,
            notification_outbox_processor_1.NotificationOutboxProcessor,
            sos_broadcast_processor_1.SosBroadcastProcessor,
            concierge_sla_processor_1.ConciergeSlaProcessor,
            investor_distribution_processor_1.InvestorDistributionProcessor,
            payment_recon_processor_1.PaymentReconProcessor,
            auto_complete_processor_1.AutoCompleteProcessor,
            jobs_scheduler_1.JobsScheduler,
        ],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map