"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DlqModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const jobs_constants_1 = require("../../jobs/jobs.constants");
const dlq_service_1 = require("./dlq.service");
let DlqModule = class DlqModule {
};
exports.DlqModule = DlqModule;
exports.DlqModule = DlqModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: jobs_constants_1.QUEUE_DEAD_LETTER })],
        providers: [dlq_service_1.DlqService],
    })
], DlqModule);
//# sourceMappingURL=dlq.module.js.map