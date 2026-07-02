"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
let RateLimitService = RateLimitService_1 = class RateLimitService {
    constructor() {
        this.logger = new common_1.Logger(RateLimitService_1.name);
        this.recentBlocked = [];
        this.ipCounts = new Map();
        this.totalBlocked = 0;
    }
    recordBlocked(ip, path) {
        this.totalBlocked++;
        this.ipCounts.set(ip, (this.ipCounts.get(ip) ?? 0) + 1);
        this.recentBlocked.unshift({ ip, path, blockedAt: new Date().toISOString() });
        if (this.recentBlocked.length > 100)
            this.recentBlocked.pop();
    }
    getStats() {
        const topBlockedIPs = [...this.ipCounts.entries()]
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        return {
            totalBlocked: this.totalBlocked,
            topBlockedIPs,
            recentBlocked: this.recentBlocked.slice(0, 50),
        };
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)()
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map