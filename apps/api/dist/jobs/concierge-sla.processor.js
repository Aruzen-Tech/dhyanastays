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
var ConciergeSlaProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConciergeSlaProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const messaging_service_1 = require("../messaging/messaging.service");
const jobs_constants_1 = require("./jobs.constants");
let ConciergeSlaProcessor = ConciergeSlaProcessor_1 = class ConciergeSlaProcessor extends bullmq_1.WorkerHost {
    constructor(messaging) {
        super();
        this.messaging = messaging;
        this.logger = new common_1.Logger(ConciergeSlaProcessor_1.name);
    }
    async process(_job) {
        const breached = await this.messaging.sweepSlaBreaches();
        const closed = await this.messaging.closeStaleConciergeThreads();
        if (breached || closed) {
            this.logger.log(`Concierge SLA sweep: ${breached} breached, ${closed} closed`);
        }
        return { breached, closed };
    }
};
exports.ConciergeSlaProcessor = ConciergeSlaProcessor;
exports.ConciergeSlaProcessor = ConciergeSlaProcessor = ConciergeSlaProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_CONCIERGE_SLA),
    __metadata("design:paramtypes", [messaging_service_1.MessagingService])
], ConciergeSlaProcessor);
//# sourceMappingURL=concierge-sla.processor.js.map