"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const sentry_1 = require("../observability/sentry");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const correlationId = request.headers['x-correlation-id'] ?? 'unknown';
        let status;
        let message;
        let errors = undefined;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else if (typeof body === 'object' && body !== null) {
                const obj = body;
                message = obj.message ?? exception.message;
                if (Array.isArray(obj.message)) {
                    message = 'Validation failed';
                    errors = obj.message;
                }
            }
            else {
                message = exception.message;
            }
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            this.logger.error(`Unhandled exception [${correlationId}]: ${exception instanceof Error ? exception.stack : String(exception)}`);
            (0, sentry_1.captureException)(exception, { correlationId, path: request.url });
        }
        response.status(status).json({
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            correlationId,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map