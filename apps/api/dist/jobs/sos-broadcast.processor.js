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
var SosBroadcastProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SosBroadcastProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const sos_broadcast_service_1 = require("../sos/sos-broadcast.service");
const jobs_constants_1 = require("./jobs.constants");
let SosBroadcastProcessor = SosBroadcastProcessor_1 = class SosBroadcastProcessor extends bullmq_1.WorkerHost {
    constructor(broadcast) {
        super();
        this.broadcast = broadcast;
        this.logger = new common_1.Logger(SosBroadcastProcessor_1.name);
    }
    async process(job) {
        const { incidentId } = job.data;
        await this.broadcast.broadcast(incidentId);
    }
};
exports.SosBroadcastProcessor = SosBroadcastProcessor;
exports.SosBroadcastProcessor = SosBroadcastProcessor = SosBroadcastProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_SOS_BROADCAST),
    __metadata("design:paramtypes", [sos_broadcast_service_1.SosBroadcastService])
], SosBroadcastProcessor);
//# sourceMappingURL=sos-broadcast.processor.js.map