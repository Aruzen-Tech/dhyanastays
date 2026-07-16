import { CanActivate, ExecutionContext } from '@nestjs/common';
import { LoginRateLimiterService } from '../services/login-rate-limiter.service';
export declare class LoginThrottleGuard implements CanActivate {
    private readonly rateLimiter;
    constructor(rateLimiter: LoginRateLimiterService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
