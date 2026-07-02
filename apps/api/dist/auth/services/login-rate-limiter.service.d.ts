import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class LoginRateLimiterService implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private redis;
    private static readonly WINDOW_SECONDS;
    private static readonly THRESHOLDS;
    constructor(config: ConfigService);
    onModuleDestroy(): Promise<void>;
    check(email: string): Promise<{
        blocked: boolean;
        retryAfter?: number;
    }>;
    resetOnSuccess(email: string): Promise<void>;
}
