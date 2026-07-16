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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var LoginRateLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginRateLimiterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let LoginRateLimiterService = LoginRateLimiterService_1 = class LoginRateLimiterService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LoginRateLimiterService_1.name);
        this.redis = null;
        const host = this.config.get('REDIS_HOST', 'localhost');
        const port = this.config.get('REDIS_PORT', 6379);
        try {
            this.redis = new ioredis_1.default({
                host,
                port,
                maxRetriesPerRequest: 0,
                retryStrategy: () => null,
                lazyConnect: true,
                enableOfflineQueue: false,
                connectTimeout: 2000,
            });
            this.redis.on('error', () => { });
            void this.redis.connect().catch(() => {
                this.logger.warn('Redis not reachable - login rate limiting disabled');
                this.redis = null;
            });
        }
        catch {
            this.logger.warn('Could not create Redis client - login rate limiting disabled');
        }
    }
    async onModuleDestroy() {
        await this.redis?.quit().catch(() => { });
    }
    async check(email) {
        if (!this.redis)
            return { blocked: false };
        try {
            const key = `login_rl:${email.toLowerCase()}`;
            const count = await this.redis.incr(key);
            if (count === 1) {
                await this.redis.expire(key, LoginRateLimiterService_1.WINDOW_SECONDS);
            }
            for (const threshold of LoginRateLimiterService_1.THRESHOLDS) {
                if (count >= threshold.attempts) {
                    return { blocked: true, retryAfter: threshold.retryAfter };
                }
            }
            return { blocked: false };
        }
        catch {
            return { blocked: false };
        }
    }
    async resetOnSuccess(email) {
        if (!this.redis)
            return;
        try {
            await this.redis.del(`login_rl:${email.toLowerCase()}`);
        }
        catch {
        }
    }
};
exports.LoginRateLimiterService = LoginRateLimiterService;
LoginRateLimiterService.WINDOW_SECONDS = 900;
LoginRateLimiterService.THRESHOLDS = [
    { attempts: 20, retryAfter: 1800 },
    { attempts: 10, retryAfter: 300 },
    { attempts: 5, retryAfter: 30 },
];
exports.LoginRateLimiterService = LoginRateLimiterService = LoginRateLimiterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoginRateLimiterService);
//# sourceMappingURL=login-rate-limiter.service.js.map