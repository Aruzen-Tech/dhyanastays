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
var DlqService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DlqService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../prisma/prisma.service");
const jobs_constants_1 = require("../../jobs/jobs.constants");
let DlqService = DlqService_1 = class DlqService extends bullmq_1.WorkerHost {
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.logger = new common_1.Logger(DlqService_1.name);
    }
    async process(job) {
        this.logger.error(`Dead-letter job received: ${job.name} from queue ${job.data?.sourceQueue ?? 'unknown'}`, { jobId: job.id, data: job.data });
        await this.prisma.adminNotification.create({
            data: {
                type: 'JOB_FAILED',
                title: `Job permanently failed: ${job.data?.sourceQueue ?? 'unknown'}/${job.name}`,
                message: `Job ${job.id} exhausted all retries. Error: ${job.data?.failedReason ?? 'Unknown error'}`,
                metadata: {
                    jobId: job.id,
                    jobName: job.name,
                    sourceQueue: job.data?.sourceQueue,
                    failedReason: job.data?.failedReason,
                    attemptsMade: job.data?.attemptsMade,
                },
            },
        });
    }
    onFailed(job, error) {
        this.logger.error(`DLQ processing itself failed for job ${job.id}: ${error.message}`);
    }
};
exports.DlqService = DlqService;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], DlqService.prototype, "onFailed", null);
exports.DlqService = DlqService = DlqService_1 = __decorate([
    (0, bullmq_1.Processor)(jobs_constants_1.QUEUE_DEAD_LETTER),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DlqService);
//# sourceMappingURL=dlq.service.js.map