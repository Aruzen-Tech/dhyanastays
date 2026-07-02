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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../prisma/prisma.service");
const EXPIRY_HOURS = 24;
let IdempotencyInterceptor = class IdempotencyInterceptor {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const idempotencyKey = req.headers['x-idempotency-key'];
        if (!idempotencyKey)
            return next.handle();
        const userId = req.user?.sub ?? 'anonymous';
        const requestPath = `${req.method} ${req.path}`;
        const requestHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(req.body ?? {}))
            .digest('hex');
        const existing = await this.prisma.idempotencyKey.findUnique({
            where: { key: idempotencyKey },
        });
        if (existing) {
            if (existing.status === 'PROCESSING') {
                throw new common_1.ConflictException('Request with this idempotency key is already being processed');
            }
            if (existing.requestHash !== requestHash) {
                throw new common_1.UnprocessableEntityException('Idempotency key already used with a different request body');
            }
            if (existing.httpStatus) {
                res.status(existing.httpStatus);
            }
            return (0, rxjs_1.of)(existing.responseBody);
        }
        await this.prisma.idempotencyKey.create({
            data: {
                key: idempotencyKey,
                userId,
                requestPath,
                requestHash,
                status: 'PROCESSING',
                expiresAt: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000),
            },
        });
        return next.handle().pipe((0, rxjs_1.tap)({
            next: async (responseBody) => {
                await this.prisma.idempotencyKey
                    .update({
                    where: { key: idempotencyKey },
                    data: {
                        status: 'COMPLETED',
                        httpStatus: res.statusCode,
                        responseBody: responseBody,
                    },
                })
                    .catch(() => { });
            },
            error: async () => {
                await this.prisma.idempotencyKey
                    .delete({ where: { key: idempotencyKey } })
                    .catch(() => { });
            },
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map