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
exports.LoginThrottleGuard = void 0;
const common_1 = require("@nestjs/common");
const login_rate_limiter_service_1 = require("../services/login-rate-limiter.service");
let LoginThrottleGuard = class LoginThrottleGuard {
    constructor(rateLimiter) {
        this.rateLimiter = rateLimiter;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const email = req.body?.email;
        if (typeof email !== 'string')
            return true;
        const result = await this.rateLimiter.check(email);
        if (result.blocked) {
            res.setHeader('Retry-After', String(result.retryAfter));
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: 'Too many login attempts. Please try again later.',
                retryAfter: result.retryAfter,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
};
exports.LoginThrottleGuard = LoginThrottleGuard;
exports.LoginThrottleGuard = LoginThrottleGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [login_rate_limiter_service_1.LoginRateLimiterService])
], LoginThrottleGuard);
//# sourceMappingURL=login-throttle.guard.js.map