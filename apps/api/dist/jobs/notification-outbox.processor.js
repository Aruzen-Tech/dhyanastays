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
var NotificationOutboxProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationOutboxProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const outbox_service_1 = require("../notification/outbox.service");
const outbox_dispatcher_service_1 = require("../notification/outbox-dispatcher.service");
const jobs_constants_1 = require("./jobs.constants");
let NotificationOutboxProcessor = NotificationOutboxProcessor_1 = class NotificationOutboxProcessor extends bullmq_1.WorkerHost {
    constructor(outbox, dispatcher) {
        super();
        this.outbox = outbox;
        this.dispatcher = dispatcher;
        this.logger = new common_1.Logger(NotificationOutboxProcessor_1.name);
    }
    async process(_job) {
        const rows = await this.outbox.claimPending();
        if (rows.length === 0)
            return;
        this.logger.debug(`Dispatching ${rows.length} outbox rows`);
        for (const row of rows) {
            await this.dispatcher.dispatch(row);
        }
    }
};
exports.NotificationOutboxProcessor = NotificationOutboxProcessor;
exports.NotificationOutboxProcessor = NotificationOutboxProcessor = NotificationOutboxProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_NOTIFICATION_OUTBOX),
    __metadata("design:paramtypes", [outbox_service_1.OutboxService,
        outbox_dispatcher_service_1.OutboxDispatcher])
], NotificationOutboxProcessor);
//# sourceMappingURL=notification-outbox.processor.js.map